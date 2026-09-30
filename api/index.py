import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Add the api directory to sys.path so modules can be imported in Vercel
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

# Get the absolute path of the project root, which is one level up from the api directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Se sirve el build de la SPA (public/), no templates/ + static/ del frontend
# Flask legacy — ese se eliminó. static_folder va en None a propósito: la
# ruta estática de Flask compite con el catch-all de la SPA y, cuando el
# archivo no existe, devuelve 404 en vez de caer al index.html. Por eso los
# assets los resuelve `spa()` más abajo, que sí tiene fallback.
public_dir = os.path.join(project_root, 'public')

app = Flask(__name__, static_folder=None)

app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret')

# Enable CORS for API routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ------------------------------------------------------------------
# Blueprints que ya NO se registran
#
# La app es local-first: todo vive en localStorage y el servidor solo
# corre los asistentes. Estos blueprints quedaron con cero llamadas desde
# el frontend —verificado con grep sobre frontend/src— y se dejaron de
# montar para que no exista la superficie HTTP, no solo para que no se use.
#
#   auth.py      7 rutas: register, login, google, google/callback, me,
#                       public-key, search
#   sync.py      2 rutas: /data, /data/<key>  (respaldo en la nube)
#   chat.py      5 rutas: /chats, /chats/<id>/messages, /contacts
#                       (chat entre usuarios, distinto de /api/chatbot)
#   feedback.py  registro de feedback
#   socketio_handler.py  montado, y el frontend no importa socket.io ni
#                       lo tiene como dependencia: no hay cliente.
#
# Los archivos siguen en disco. Borrarlos es otra decisión, y no es
# inocua: ratelimit.py importa crypto.verify_token (perezoso, dentro de
# un try/except) para el rate limit por usuario, así que sacar crypto.py
# degradaría ese límite a por-IP sin avisar.
#
# Por qué importa aunque no se usen: auth.py enumeraba cuentas. /register
# respondía "Este email ya está registrado" sin pedir autenticación, y
# /login distinguía "no existe una cuenta con este email" de "contraseña
# incorrecta", sin rate limit, mientras que los endpoints de IA sí lo
# tienen. Con un despliegue público eso es un oráculo de adivinar
# contraseñas. Mientras la app no tenga login no había forma de llegar,
# pero la base de datos (Neon) está viva con al menos una cuenta real.
# ------------------------------------------------------------------

# Register agent blueprint (features agénticas: split/plan/ritual/insights)
from agent import agent_bp
app.register_blueprint(agent_bp, url_prefix='/api/agent')

# Rate limiting para lo que gasta plata (endpoints de LLM)
from ratelimit import agent_rate_limited

# Import Groq client
try:
    from groq_client import get_groq_client
    groq_available = True
except ImportError:
    groq_available = False
    print("Warning: Groq client not available. Install with: pip install groq python-dotenv")


@app.route('/healthz')
def healthz():
    """Liveness check para Vercel / deploys."""
    return jsonify({'ok': True, 'service': 'pomodoro-api'})


@app.route('/api/chatbot', methods=['POST'])
@agent_rate_limited
def chat():
    """Chat del asistente (Groq). Lo consume frontend/src/components/AgentChat.svelte.

    OJO: este es el chat del asistente, distinto de las rutas de chat_bp
    (/chats, /contacts), que son chat entre usuarios y no tienen nada que ver
    con esta. Si se decide sacar la caja de chat, se borra este endpoint junto
    con AgentChat.svelte — no antes.
    """
    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        if not groq_available:
            # Antes este mensaje pedía revisar NVIDIA_API_KEY, que es la
            # variable de otro proveedor y ya está seteada: mandaba a
            # configurar algo que no era la causa y dejaba al usuario frente
            # a un error sin salida. Falta el paquete, no la clave.
            return jsonify({
                'answer': (
                    'El chat no está disponible ahora: falta instalar el cliente '
                    'de Groq (pip install groq). Los otros asistentes funcionan '
                    'normalmente.'
                ),
                'actions': []
            }), 503

        client = get_groq_client()
        result = client.chat(
            user_message=user_message,
            conversation_history=data.get('history', []),
            user_tasks=data.get('tasks', []),
            pomodoros_today=data.get('pomodoros_today', 0),
            timer_state=data.get('timer_state'),
            config=data.get('config'),
            week_stats=data.get('week_stats'),
            user_profile=data.get('profile'),
        )
        return jsonify(result)

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'answer': 'No pude responder ahora. Probá de nuevo en un momento.',
            'actions': []
        }), 200


# El frontend Flask (landing/app/gallery) se eliminó junto con templates/.
# Ahora TODAS las rutas no-API devuelven el build de la SPA, que es lo mismo
# que hace vercel.json en produccion — local y prod quedan alineados.
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def spa(path):
    """Asset si existe en public/, si no el index.html de la SPA.

    send_from_directory usa safe_join internamente, así que `path` con `..`
    no escapa de public/.
    """
    if path:
        candidate = os.path.join(public_dir, path)
        if os.path.isfile(candidate):
            return send_from_directory(public_dir, path)

    index = os.path.join(public_dir, 'index.html')
    if not os.path.isfile(index):
        return (
            jsonify({
                'error': 'Build de la SPA ausente.',
                'hint': 'Correr `npm run build` en frontend/ y copiar dist/ a public/.',
            }),
            503,
        )
    return send_from_directory(public_dir, 'index.html')


# El service worker se sirve desde public/sw.js por la ruta de arriba (y en
# prod via la ruta /sw.js de vercel.json). El sw.js viejo en la raíz, que
# precacheaba /static/*, se eliminó.


# This block is not used by Vercel, but it's good for local development
if __name__ == '__main__':
    # Antes era socketio.run(), porque el handler de Socket.IO estaba
    # montado. Ya no: el frontend no tiene cliente de socket.io, así que
    # app.run() alcanza y no arrastra el servidor de websockets.
    # threaded=True para que una llamada lenta a NVIDIA no congele todo.
    app.run(host='127.0.0.1', port=5055, debug=True, threaded=True)
