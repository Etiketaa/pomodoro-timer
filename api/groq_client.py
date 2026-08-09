import os
import json
import re
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
        self.model = "llama-3.3-70b-versatile"
        
    def get_system_prompt(self, user_tasks=None, pomodoros_today=0, timer_state=None, config=None, week_stats=None):
        """Generate system prompt with full app context"""
        
        # Build tasks context
        tasks_context = ""
        if user_tasks and len(user_tasks) > 0:
            tasks_context = "\n\nTAREAS ACTUALES DEL USUARIO:\n"
            for i, task in enumerate(user_tasks[:15], 1):
                status_emoji = {"todo": "📋", "inProgress": "⚡", "done": "✅"}.get(task.get('status', 'todo'), "📋")
                due = f" (vence: {task['dueDate']})" if task.get('dueDate') else ""
                desc = f" - {task['description']}" if task.get('description') else ""
                tasks_context += f"{i}. [{task.get('id')}] {status_emoji} {task.get('text', 'Sin título')}{desc}{due}\n"
        
        # Timer context
        timer_context = ""
        if timer_state:
            mode_names = {"pomodoro": "🍅 Pomodoro", "shortBreak": "☕ Descanso Corto", "longBreak": "🏖️ Descanso Largo"}
            timer_context = f"\n\nESTADO DEL TIMER: {mode_names.get(timer_state.get('mode', 'pomodoro'), 'Pomodoro')}"
            if timer_state.get('remainingTime'):
                mins = timer_state['remainingTime'] // 60
                secs = timer_state['remainingTime'] % 60
                timer_context += f" - {mins}:{secs:02d} restantes"
            timer_context += f" - {'Pausado' if timer_state.get('isPaused') else 'En ejecución'}"
        
        # Config context
        config_context = ""
        if config:
            config_context = f"\n\nCONFIGURACIÓN: Pomodoro {config.get('pomodoro', 25)}min | Descanso corto {config.get('shortBreak', 5)}min | Descanso largo {config.get('longBreak', 15)}min"
        
        # Week stats context
        stats_context = ""
        if week_stats:
            stats_context = f"\n\nESTADÍSTICAS: Hoy {pomodoros_today} pomodoros | Esta semana {week_stats.get('weekTotal', 0)} pomodoros"

        return f"""Eres un asistente de productividad experto llamado "Pomo". Tu objetivo es ayudar al usuario a ser más productivo usando la técnica Pomodoro y la Matriz de Eisenhower.

CAPACIDADES PRINCIPALES:
1. Gestionar tareas del tablero Kanban
2. Controlar el temporizador Pomodoro
3. Clasificar tareas por prioridad (Matriz de Eisenhower)
4. Dar consejos de productividad
5. Analizar estadísticas de productividad
6. Configurar la app

MATRIZ DE EISENHOWER (usá esto para clasificar tareas cuando el usuario pida priorizar):
┌─────────────────────────────────────────────────────────────┐
│                  URGENTE               NO URGENTE           │
├─────────────────────────────────────────────────────────────┤
│ IMPORTANTE  │ 1. HACER AHORA      │ 2. PLANIFICAR         │
│             │ (hoy o antes)        │ (agendar fecha)       │
├─────────────────────────────────────────────────────────────┤
│ NO IMPORT.  │ 3. DELEGAR/SIMPLIF.  │ 4. ELIMINAR/DESPUÉS   │
│             │ (reduciar o delegar) │ (no vale la pena)     │
└─────────────────────────────────────────────────────────────┘

ACCIONES DISPONIBLES (respondé con JSON cuando el usuario pida ejecutar algo):

PARA TAREAS:
- CREAR: {{"action": "crear_tarea", "text": "nombre", "priority": "urgent_important|important|urgent|none", "dueDate": "YYYY-MM-DD|null"}}
- BORRAR: {{"action": "borrar_tarea", "id": id_tarea}}
- MOVER: {{"action": "mover_tarea", "id": id_tarea, "status": "todo|inProgress|done"}}

PARA EL TIMER:
- INICIAR: {{"action": "iniciar_timer"}}
- PAUSAR: {{"action": "pausar_timer"}}
- REINICIAR: {{"action": "reiniciar_timer"}}

PARA CONFIG:
- CAMBIAR_CONFIG: {{"action": "config", "pomodoro": min, "shortBreak": min, "longBreak": min}}

REGLAS:
1. Si el usuario pide crear UNA tarea y es claro, creala directamente con acción JSON
2. Si el usuario pide crear MÚLTIPLES tareas, listalas primero y preguntá si quiere que las cree
3. Si el usuario pide priorizar/organizar, clasificá con la matriz y ofrecé crearlas
4. Si el usuario pide borrar o mover una tarea, hacelo con acción JSON
5. Si el usuario pide controlar el timer, hacelo con acción JSON
6. Si el usuario solo consulta o charla, respondé normalmente sin JSON
7. Sé conciso (máx 4-5 líneas en respuestas normales)
8. Usá emojis para hacer el mensaje amigable
9. Cuando crees una tarea, asignale prioridad según la matriz si el usuario dio contexto
10. Si no tenés suficiente info para priorizar, preguntá

CONTEXTO ACTUAL DEL USUARIO:
- Pomodoros completados hoy: {pomodoros_today}{tasks_context}{timer_context}{config_context}{stats_context}

Respondé en español de forma natural. Si necesitás ejecutar una acción, incluí SOLO el JSON en tu respuesta, sin texto adicional alrededor del JSON."""

    def extract_actions(self, response):
        """Extract JSON actions from assistant response"""
        actions = []
        # Look for JSON objects in the response
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, response)
        
        for match in matches:
            try:
                parsed = json.loads(match)
                if 'action' in parsed:
                    actions.append(parsed)
            except json.JSONDecodeError:
                continue
        
        return actions

    def chat(self, user_message, conversation_history=None, user_tasks=None, 
             pomodoros_today=0, timer_state=None, config=None, week_stats=None):
        """
        Send a message to Groq and get a response
        """
        try:
            # Build messages array
            messages = [
                {
                    "role": "system",
                    "content": self.get_system_prompt(user_tasks, pomodoros_today, timer_state, config, week_stats)
                }
            ]
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history[-10:])  # Keep last 10 messages
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            print(f"[GROQ] Sending message: {user_message[:50]}...")
            
            # Call Groq API
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.7,
                max_tokens=400,
                top_p=1,
                stream=False
            )
            
            response = chat_completion.choices[0].message.content
            print(f"[GROQ] Response: {response[:100]}...")
            
            # Extract actions from response
            actions = self.extract_actions(response)
            
            return {
                'answer': response,
                'actions': actions
            }
            
        except Exception as e:
            print(f"[GROQ ERROR] {str(e)}")
            
            return {
                'answer': "Disculpá, tuve un problema técnico. ¿Podés repetirme lo que necesitás? 😅",
                'actions': []
            }


# Create a singleton instance
groq_client = None

def get_groq_client():
    """Get or create Groq client instance"""
    global groq_client
    if groq_client is None:
        groq_client = GroqClient()
    return groq_client
