"""
Authentication endpoints.
Register, login, Google OAuth, and user info.
"""

import os
import secrets
from flask import Blueprint, request, jsonify, redirect, url_for
from passlib.hash import bcrypt
from authlib.integrations.flask_client import OAuth
from db import query_one, query_all, execute
from crypto import generate_token, login_required
from dotenv import load_dotenv

# Load .env from project root (one level up from api/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, '.env'))

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Google OAuth setup
oauth = OAuth()
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)


def _generate_friend_code():
    """Generate a unique POMO-XXXX friend code."""
    for _ in range(20):
        code = f'POMO-{secrets.randbelow(9000) + 1000}'
        existing = query_one('SELECT code FROM friend_codes WHERE code = %s', (code,))
        if not existing:
            return code
    # Fallback: 5-digit code
    return f'POMO-{secrets.randbelow(90000) + 10000}'


def _create_user(email, password_hash=None, display_name=None, photo_url=None, google_id=None):
    """Create a new user and return (user_dict, token) or (None, error_msg)."""
    existing = query_one('SELECT id FROM users WHERE email = %s', (email,))
    if existing:
        return None, 'Este email ya está registrado.'

    friend_code = _generate_friend_code()
    name = display_name or email.split('@')[0]
    name_lower = name.lower()

    user = execute(
        """INSERT INTO users (email, password_hash, display_name, display_name_lower, photo_url, friend_code, google_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s)
           RETURNING id, email, display_name, friend_code, created_at""",
        (email, password_hash, name, name_lower, photo_url, friend_code, google_id),
        returning=True
    )

    # Create friend code index
    execute('INSERT INTO friend_codes (code, user_id) VALUES (%s, %s)', (friend_code, user['id']))

    # Create empty app_data
    execute('INSERT INTO app_data (user_id) VALUES (%s)', (user['id'],))

    token = generate_token(user['id'], email)
    return {**user, 'id': str(user['id'])}, token


# ============================================
# REGISTER
# ============================================
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    display_name = data.get('displayName', '').strip()

    if not email or not password:
        return jsonify({'error': 'Email y contraseña son requeridos.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres.'}), 400
    if not display_name:
        display_name = email.split('@')[0]

    password_hash = bcrypt.hash(password)
    user, token = _create_user(email, password_hash, display_name)

    if user is None:
        return jsonify({'error': token}), 409

    return jsonify({'user': user, 'token': token}), 201


# ============================================
# LOGIN
# ============================================
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email y contraseña son requeridos.'}), 400

    user = query_one(
        'SELECT id, email, password_hash, display_name, photo_url, friend_code FROM users WHERE email = %s',
        (email,)
    )

    if not user:
        return jsonify({'error': 'No existe una cuenta con este email.'}), 401

    if not user['password_hash'] or not bcrypt.verify(password, user['password_hash']):
        return jsonify({'error': 'Contraseña incorrecta.'}), 401

    # Update last_login
    execute('UPDATE users SET last_login = NOW() WHERE id = %s', (user['id'],))

    token = generate_token(user['id'], user['email'])
    user_data = {k: v for k, v in user.items() if k != 'password_hash'}
    user_data['id'] = str(user_data['id'])

    return jsonify({'user': user_data, 'token': token})


# ============================================
# GOOGLE OAUTH - Redirect
# ============================================
@auth_bp.route('/google')
def google_login():
    redirect_uri = url_for('auth.google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)


# ============================================
# GOOGLE OAUTH - Callback
# ============================================
@auth_bp.route('/google/callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
        if not user_info:
            return redirect('/app?error=google_failed')

        google_id = user_info['sub']
        email = user_info['email']
        display_name = user_info.get('name', email.split('@')[0])
        photo_url = user_info.get('picture')

        # Check if user exists by google_id or email
        existing = query_one(
            'SELECT id, email, display_name, photo_url, friend_code FROM users WHERE google_id = %s OR email = %s',
            (google_id, email)
        )

        if existing:
            # Update last_login and photo if needed
            execute(
                'UPDATE users SET last_login = NOW(), photo_url = COALESCE(%s, photo_url) WHERE id = %s',
                (photo_url, existing['id'])
            )
            jwt_token = generate_token(existing['id'], existing['email'])
            user_data = {k: v for k, v in existing.items()}
            user_data['id'] = str(user_data['id'])
        else:
            # Create new user
            friend_code = _generate_friend_code()
            name_lower = display_name.lower()
            user = execute(
                """INSERT INTO users (email, display_name, display_name_lower, photo_url, friend_code, google_id)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   RETURNING id, email, display_name, photo_url, friend_code, created_at""",
                (email, display_name, name_lower, photo_url, friend_code, google_id),
                returning=True
            )
            execute('INSERT INTO friend_codes (code, user_id) VALUES (%s, %s)', (friend_code, user['id']))
            execute('INSERT INTO app_data (user_id) VALUES (%s)', (user['id'],))
            jwt_token = generate_token(user['id'], email)
            user_data = {k: v for k, v in user.items()}
            user_data['id'] = str(user_data['id'])

        # Redirect to app with token in URL fragment (JS will read it)
        return redirect(f'/app#token={jwt_token}')

    except Exception as e:
        print(f'Google OAuth error: {e}')
        return redirect('/app?error=google_failed')


# ============================================
# GET CURRENT USER
# ============================================
@auth_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    user = query_one(
        'SELECT id, email, display_name, photo_url, friend_code, public_key, created_at FROM users WHERE id = %s',
        (g.user_id,)
    )
    if not user:
        return jsonify({'error': 'Usuario no encontrado.'}), 404

    user_data = {k: v for k, v in user.items()}
    user_data['id'] = str(user_data['id'])
    return jsonify({'user': user_data})


# ============================================
# UPDATE PUBLIC KEY (for E2E encryption)
# ============================================
@auth_bp.route('/public-key', methods=['PUT'])
@login_required
def update_public_key():
    data = request.get_json()
    public_key = data.get('publicKey')

    if not public_key:
        return jsonify({'error': 'publicKey es requerido.'}), 400

    execute(
        'UPDATE users SET public_key = %s WHERE id = %s',
        (public_key, g.user_id)
    )
    return jsonify({'ok': True})


# ============================================
# SEARCH USERS (for adding contacts)
# ============================================
@auth_bp.route('/search', methods=['GET'])
@login_required
def search_users():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'users': []})

    q_lower = q.lower()

    # Try friend code first
    if q.upper().startswith('POMO-'):
        user = query_one(
            'SELECT id, display_name, friend_code FROM users WHERE friend_code = %s AND id != %s',
            (q.upper(), g.user_id)
        )
        if user:
            return jsonify({'users': [{**user, 'id': str(user['id'])}]})
        return jsonify({'users': []})

    # Search by display name or email
    users = query_all(
        """SELECT id, display_name, friend_code
           FROM users
           WHERE (display_name_lower LIKE %s OR email LIKE %s)
           AND id != %s
           LIMIT 10""",
        (f'{q_lower}%', f'{q_lower}%', g.user_id)
    )

    return jsonify({'users': [{**u, 'id': str(u['id'])} for u in users]})
