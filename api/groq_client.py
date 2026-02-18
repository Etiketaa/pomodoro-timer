import os
from groq import Groq
from dotenv import load_dotenv

# Get the project root directory (one level up from api/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')

# Load environment variables from the correct path
load_dotenv(dotenv_path=env_path)


class GroqClient:
    def __init__(self):
        self.api_key = os.getenv('GROQ_API_KEY')
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile"  # Updated model
        
    def get_productivity_prompt(self, user_tasks=None, pomodoros_today=0):
        """Generate system prompt for productivity assistant"""
        tasks_context = ""
        if user_tasks and len(user_tasks) > 0:
            tasks_context = f"\n\nTareas actuales del usuario:\n"
            for i, task in enumerate(user_tasks[:10], 1):  # Limit to 10 tasks
                status_emoji = {"todo": "📋", "inProgress": "⚡", "done": "✅"}.get(task.get('status', 'todo'), "📋")
                tasks_context += f"{i}. {status_emoji} {task.get('text', 'Sin título')}\n"
        
        return f"""Eres un asistente de productividad experto en la técnica Pomodoro y gestión de tareas.

Tu objetivo es ayudar al usuario a:
1. Organizar y priorizar tareas usando métodos como Eisenhower Matrix (urgente/importante)
2. Dividir tareas grandes en subtareas manejables de 25 minutos (1 Pomodoro)
3. Estimar tiempo realista usando bloques Pomodoro
4. Dar consejos prácticos para concentración y evitar distracciones
5. Motivar y mantener el enfoque

Contexto del usuario:
- Pomodoros completados hoy: {pomodoros_today}{tasks_context}

Reglas importantes:
- Responde de forma CONCISA (máximo 3-4 líneas)
- Sé PRÁCTICO y ACCIONABLE
- Usa emojis ocasionalmente para hacer el mensaje más amigable
- Si el usuario pregunta sobre sus tareas, usa la información del contexto
- Si sugiere crear una tarea, responde con formato: "CREAR_TAREA: [nombre de la tarea]"
- Sé motivador pero realista

Responde en español de forma natural y conversacional."""

    def chat(self, user_message, conversation_history=None, user_tasks=None, pomodoros_today=0):
        """
        Send a message to Groq and get a response
        
        Args:
            user_message: The user's message
            conversation_history: List of previous messages (optional)
            user_tasks: List of user's current tasks (optional)
            pomodoros_today: Number of pomodoros completed today
            
        Returns:
            str: The assistant's response
        """
        try:
            # Build messages array
            messages = [
                {
                    "role": "system",
                    "content": self.get_productivity_prompt(user_tasks, pomodoros_today)
                }
            ]
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history[-6:])  # Keep last 6 messages for context
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            print(f"[GROQ] Sending message to Groq API: {user_message}")
            
            # Call Groq API
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.7,
                max_tokens=300,  # Keep responses concise
                top_p=1,
                stream=False
            )
            
            response = chat_completion.choices[0].message.content
            print(f"[GROQ] Received response: {response[:100]}...")
            return response
            
        except Exception as e:
            print(f"[GROQ ERROR] Error calling Groq API: {str(e)}")
            print(f"[GROQ ERROR] Error type: {type(e).__name__}")

            # Fallback responses
            fallback_responses = {
                "priorizar": "Para priorizar tareas, usa la matriz de Eisenhower: 1) Urgente e importante (hacer ya), 2) Importante pero no urgente (planificar), 3) Urgente pero no importante (delegar), 4) Ni urgente ni importante (eliminar). ¿Qué tareas tienes?",
                "dividir": "Para dividir una tarea grande: 1) Define el resultado final, 2) Lista los pasos necesarios, 3) Estima 25 min (1 Pomodoro) por paso, 4) Agrupa pasos similares. ¿Qué tarea quieres dividir?",
                "concentrar": "Tips para concentrarte: 1) Elimina distracciones (silencia notificaciones), 2) Usa la técnica Pomodoro (25 min trabajo + 5 min descanso), 3) Ten todo listo antes de empezar, 4) Una tarea a la vez. ¿En qué vas a trabajar?",
                "default": "¡Hola! Soy tu asistente de productividad. Puedo ayudarte a organizar tareas, priorizarlas, dividirlas en pasos manejables y darte consejos para concentrarte. ¿En qué te ayudo? 😊"
            }
            
            # Try to match user message with fallback
            user_lower = user_message.lower()
            for key, response in fallback_responses.items():
                if key in user_lower:
                    return response
            
            return fallback_responses["default"]

# Create a singleton instance
groq_client = None

def get_groq_client():
    """Get or create Groq client instance"""
    global groq_client
    if groq_client is None:
        groq_client = GroqClient()
    return groq_client
