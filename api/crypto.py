"""
JWT helpers for authentication.
Token generation, verification, and Flask middleware.
"""

import os
import jwt
import datetime
from functools import wraps
from flask import request, jsonify, g
from dotenv import load_dotenv

# Load .env from project root (one level up from api/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, '.env'))

JWT_SECRET = os.getenv('JWT_SECRET')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DAYS = 7

if not JWT_SECRET:
    raise ValueError(
        "JWT_SECRET not found. Generate one with:\n"
        "  python -c \"import secrets; print(secrets.token_hex(32))\""
    )


def generate_token(user_id, email):
    """Generate a JWT token for a user."""
    payload = {
        'sub': str(user_id),
        'email': email,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token):
    """Verify and decode a JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_from_header():
    """Extract token from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def login_required(f):
    """Decorator: requires valid JWT in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = token_from_header()
        if not token:
            return jsonify({'error': 'Token requerido'}), 401

        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token inválido o expirado'}), 401

        g.user_id = payload['sub']
        g.user_email = payload['email']
        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Decorator: loads user if token present, but doesn't require it."""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.user_id = None
        g.user_email = None
        token = token_from_header()
        if token:
            payload = verify_token(token)
            if payload:
                g.user_id = payload['sub']
                g.user_email = payload['email']
        return f(*args, **kwargs)
    return decorated
