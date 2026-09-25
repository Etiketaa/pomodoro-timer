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

# Initialize authlib for Google OAuth
from auth import oauth
oauth.init_app(app)

# Register auth blueprint
from auth import auth_bp
app.register_blueprint(auth_bp)

# Register sync blueprint
from sync import sync_bp
app.register_blueprint(sync_bp)

# Register chat blueprint
from chat import chat_bp
app.register_blueprint(chat_bp)

# Register feedback blueprint
from feedback import feedback_bp
app.register_blueprint(feedback_bp)

# Register agent blueprint (features agénticas: split/plan/ritual/insights)
from agent import agent_bp
app.register_blueprint(agent_bp, url_prefix='/api/agent')

# Rate limiting para lo que gasta plata (endpoints de LLM)
from ratelimit import agent_rate_limited

# Initialize Socket.IO
from socketio_handler import init_socketio
init_socketio(app)

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

    OJO: este es el chat del asistente, distinto de /api/chat/* que es
    chat entre usuarios. Si se decide sacar la caja de chat, se borra este
    endpoint junto con AgentChat.svelte — no antes.
    """
    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        if not groq_available:
            return jsonify({
                'answer': 'El servicio de IA no está disponible. Configurá NVIDIA_API_KEY en .env',
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
    from socketio_handler import socketio
    # socketio.run ya usa threaded=True internamente; el timeout corto del
    # cliente OpenAI evita que una llamada lenta a NVIDIA congele el server.
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
