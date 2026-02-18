import os
import sys
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

# Add the api directory to sys.path so groq_client can be imported in Vercel
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

# Get the absolute path of the project root, which is one level up from the api directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    static_folder=os.path.join(project_root, 'static'),
    template_folder=os.path.join(project_root, 'templates')
)

# Enable CORS for API routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Import Groq client
try:
    from groq_client import get_groq_client
    groq_available = True
except ImportError:
    groq_available = False
    print("Warning: Groq client not available. Install with: pip install groq python-dotenv")

@app.route('/')
def index():
    """Main page route"""
    return render_template('index.html')

@app.route('/gallery')
def gallery():
    """Gallery page route"""
    return render_template('gallery.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chatbot API endpoint"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])
        user_tasks = data.get('tasks', [])
        pomodoros_today = data.get('pomodoros_today', 0)
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        if not groq_available:
            return jsonify({
                'answer': 'Lo siento, el servicio de IA no está disponible en este momento. Por favor, instala las dependencias necesarias: pip install groq python-dotenv'
            }), 503
        
        # Get Groq client and generate response
        client = get_groq_client()
        response = client.chat(
            user_message=user_message,
            conversation_history=conversation_history,
            user_tasks=user_tasks,
            pomodoros_today=pomodoros_today
        )
        
        return jsonify({'answer': response})
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'answer': '¡Hola! Soy tu asistente de productividad. Puedo ayudarte a organizar tareas, priorizarlas y darte consejos para concentrarte. ¿En qué te ayudo? 😊'
        }), 200

@app.route('/<path:path>')
def catch_all(path):
    """
    This single route catches all requests and serves the index.html.
    This is necessary for a Single Page Application (SPA) where routing is handled by the frontend.
    """
    return render_template('index.html')

# This block is not used by Vercel, but it's good for local development
if __name__ == '__main__':
    app.run(debug=True)

