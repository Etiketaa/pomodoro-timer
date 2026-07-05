"""
Cloud Sync endpoints.
Sync app data (settings, tasks, stats, etc.) between localStorage and PostgreSQL.
"""

from flask import Blueprint, request, jsonify, g
from db import query_one, execute
from crypto import login_required

sync_bp = Blueprint('sync', __name__, url_prefix='/api/sync')

# Map: API key → database column
KEY_MAP = {
    'settings': 'settings',
    'tasks': 'tasks',
    'stats': 'stats',
    'musicPrefs': 'music_prefs',
    'musicVolume': 'music_volume',
    'theme': 'theme',
    'dailyGoal': 'daily_goal',
    'favoriteStations': 'favorite_stations',
    'userProfile': 'user_profile',
}

ALL_DB_KEYS = list(KEY_MAP.values())


def _ensure_app_data(user_id):
    """Create app_data row if it doesn't exist."""
    existing = query_one('SELECT user_id FROM app_data WHERE user_id = %s', (user_id,))
    if not existing:
        execute('INSERT INTO app_data (user_id) VALUES (%s)', (user_id,))


# ============================================
# GET /api/sync/data — Pull all data from cloud
# ============================================
@sync_bp.route('/data', methods=['GET'])
@login_required
def get_data():
    _ensure_app_data(g.user_id)
    row = query_one(
        f"SELECT {', '.join(ALL_DB_KEYS)} FROM app_data WHERE user_id = %s",
        (g.user_id,)
    )

    if not row:
        return jsonify({})

    # Convert DB columns back to API keys
    result = {}
    for api_key, db_key in KEY_MAP.items():
        if row.get(db_key) is not None:
            result[api_key] = row[db_key]

    return jsonify(result)


# ============================================
# PUT /api/sync/data — Push all data to cloud
# ============================================
@sync_bp.route('/data', methods=['PUT'])
@login_required
def put_data():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    _ensure_app_data(g.user_id)

    # Build SET clause dynamically
    set_parts = ['last_sync = NOW()']
    params = []
    for api_key, db_key in KEY_MAP.items():
        if api_key in data:
            set_parts.append(f'{db_key} = %s')
            params.append(data[api_key])

    if len(set_parts) == 1:
        return jsonify({'ok': True, 'message': 'No data to update'})

    params.append(g.user_id)
    execute(
        f"UPDATE app_data SET {', '.join(set_parts)} WHERE user_id = %s",
        params
    )

    return jsonify({'ok': True})


# ============================================
# PATCH /api/sync/data/:key — Save one key
# ============================================
@sync_bp.route('/data/<key>', methods=['PATCH'])
@login_required
def patch_key(key):
    db_key = KEY_MAP.get(key)
    if not db_key:
        return jsonify({'error': f'Unknown key: {key}'}), 400

    data = request.get_json()
    if 'value' not in data:
        return jsonify({'error': 'Missing value'}), 400

    _ensure_app_data(g.user_id)
    execute(
        f'UPDATE app_data SET {db_key} = %s, last_sync = NOW() WHERE user_id = %s',
        (data['value'], g.user_id)
    )

    return jsonify({'ok': True})


# ============================================
# GET /api/sync/data/:key — Get one key
# ============================================
@sync_bp.route('/data/<key>', methods=['GET'])
@login_required
def get_key(key):
    db_key = KEY_MAP.get(key)
    if not db_key:
        return jsonify({'error': f'Unknown key: {key}'}), 400

    _ensure_app_data(g.user_id)
    row = query_one(
        f'SELECT {db_key} FROM app_data WHERE user_id = %s',
        (g.user_id,)
    )

    value = row.get(db_key) if row else None
    return jsonify({key: value})
