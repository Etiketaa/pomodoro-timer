"""Blueprints de features agénticas para Lofi Pomodoro.

Endpoints (todos POST /api/agent/...):
  - /split     -> descompone una tarea en micro-pasos ~10 min
  - /plan      -> top 3 de foco para el día
  - /ritual    -> coach del shutdown ritual
  - /insights  -> patrones semanales + tareas atascadas
  - /health    -> disponibilidad del agente (sin llamar al LLM)
"""

import traceback

from flask import Blueprint, jsonify, request

agent_bp = Blueprint('agent', __name__)


def _agent_or_error():
    """Devuelve (client, error_response|None)."""
    try:
        from agent_client import get_agent_client
        return get_agent_client(), None
    except Exception as e:
        print(f"[agent] unavailable: {e}")
        return None, (jsonify({
            'error': 'El asistente IA no está disponible. Configurá NVIDIA_API_KEY en .env',
        }), 503)


def _ok(payload):
    return jsonify({'ok': True, **payload}), 200


def _fail(msg, code=200):
    return jsonify({'ok': False, 'error': msg}), code


# --------------------------------------------------------------------- #
#  Split de tareas
# --------------------------------------------------------------------- #
@agent_bp.route('/split', methods=['POST'])
def split():
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    if not title:
        return _fail('Falta el título de la tarea', 400)

    client, err = _agent_or_error()
    if err:
        return err
    try:
        result = client.split_task(
            title=title,
            energy=data.get('energy', 'medium'),
            context=(data.get('context') or '').strip(),
            profile=data.get('profile'),
        )
        return _ok({'parts': result['parts']})
    except Exception as e:
        traceback.print_exc()
        return _fail(f'No pude dividir la tarea: {e}')


# --------------------------------------------------------------------- #
#  Plan del día
# --------------------------------------------------------------------- #
@agent_bp.route('/plan', methods=['POST'])
def plan():
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get('tasks'), list):
        return _fail('Falta la lista de tareas', 400)

    client, err = _agent_or_error()
    if err:
        return err
    try:
        result = client.daily_plan(
            pending=data.get('tasks') or [],
            energy_today=data.get('energyToday') or 'medium',
            streak=int(data.get('streak') or 0),
            note=data.get('note') or '',
            yesterday_focus=data.get('yesterdayFocus') or '',
            profile=data.get('profile'),
        )
        return _ok(result)
    except Exception as e:
        traceback.print_exc()
        return _fail(f'No pude armar el plan: {e}')


# --------------------------------------------------------------------- #
#  Coach del ritual de cierre
# --------------------------------------------------------------------- #
@agent_bp.route('/ritual', methods=['POST'])
def ritual():
    data = request.get_json(silent=True) or {}

    client, err = _agent_or_error()
    if err:
        return err
    try:
        result = client.ritual_reflection(
            went_well=data.get('wentWell') or '',
            was_hard=data.get('wasHard') or '',
            tomorrow_focus=data.get('tomorrowFocus') or '',
            mood=data.get('mood') or 'medium',
            completed_count=int(data.get('completedCount') or 0),
            streak=int(data.get('streak') or 0),
            profile=data.get('profile'),
        )
        return _ok(result)
    except Exception as e:
        traceback.print_exc()
        return _fail(f'No pude generar la reflexión: {e}')


# --------------------------------------------------------------------- #
#  Insights semanales + tareas atascadas
# --------------------------------------------------------------------- #
@agent_bp.route('/insights', methods=['POST'])
def insights():
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get('tasks'), list):
        return _fail('Falta la lista de tareas', 400)

    client, err = _agent_or_error()
    if err:
        return err
    try:
        result = client.weekly_insights(
            tasks=data.get('tasks') or [],
            shutdown_entries=data.get('shutdownEntries') or [],
            completed_counts=data.get('completedCounts') or [],
            streak=int(data.get('streak') or 0),
            profile=data.get('profile'),
        )
        return _ok(result)
    except Exception as e:
        traceback.print_exc()
        return _fail(f'No pude generar los insights: {e}')


# --------------------------------------------------------------------- #
#  Health (sin llamar al LLM)
# --------------------------------------------------------------------- #
@agent_bp.route('/health', methods=['GET'])
def health():
    try:
        from agent_client import get_agent_client
        get_agent_client()
        return _ok({'available': True})
    except Exception:
        return _ok({'available': False})