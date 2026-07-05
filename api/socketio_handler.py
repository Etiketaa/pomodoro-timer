"""
Socket.IO event handlers for real-time features.
Chat messaging, typing indicators, and online presence.
"""

import os
from datetime import datetime
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from crypto import verify_token
from db import query_one, execute
from chat import encrypt_message, decrypt_message, _get_chat_id
from dotenv import load_dotenv

# Load .env from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, '.env'))

# Will be initialized in index.py
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='threading',
    logger=False,
    engineio_logger=False
)

# Track online users: { user_id: set of sid }
online_users = {}


def init_socketio(app):
    """Initialize Socket.IO with the Flask app."""
    socketio.init_app(app)


def _get_user_from_auth():
    """Extract and verify user from Socket.IO auth token."""
    token = request.args.get('token') or (
        request.auth if hasattr(request, 'auth') else None
    )
    if not token:
        # Try from handshake auth
        auth = getattr(request, 'auth', None) or {}
        token = auth.get('token') if isinstance(auth, dict) else None

    if not token:
        return None

    payload = verify_token(token)
    if not payload:
        return None

    user = query_one(
        'SELECT id, display_name, friend_code FROM users WHERE id = %s',
        (payload['sub'],)
    )
    return user


# ============================================
# CONNECTION
# ============================================
@socketio.on('connect')
def handle_connect():
    user = _get_user_from_auth()
    if not user:
        return False  # Reject connection

    user_id = str(user['id'])

    # Track online status
    if user_id not in online_users:
        online_users[user_id] = set()
    online_users[user_id].add(request.sid)

    # Join user's personal room
    join_room(f'user_{user_id}')

    # Broadcast online status to all connected users
    emit('user_online', {
        'userId': user_id,
        'displayName': user['display_name'],
    }, broadcast=True)

    print(f'[Socket.IO] User connected: {user["display_name"]} ({user_id})')


# ============================================
# DISCONNECTION
# ============================================
@socketio.on('disconnect')
def handle_disconnect():
    user = _get_user_from_auth()
    if user:
        user_id = str(user['id'])
        if user_id in online_users:
            online_users[user_id].discard(request.sid)
            if not online_users[user_id]:
                del online_users[user_id]
                # Broadcast offline status
                emit('user_offline', {'userId': user_id}, broadcast=True)
                print(f'[Socket.IO] User disconnected: {user["display_name"]} ({user_id})')


# ============================================
# JOIN CHAT ROOM
# ============================================
@socketio.on('join_chat')
def handle_join_chat(data):
    user = _get_user_from_auth()
    if not user:
        return

    chat_id = data.get('chatId')
    if not chat_id:
        return

    # Verify user is participant
    chat = query_one(
        'SELECT id FROM chats WHERE id = %s AND (participant1 = %s OR participant2 = %s)',
        (chat_id, user['id'], user['id'])
    )
    if not chat:
        return

    join_room(f'chat_{chat_id}')
    print(f'[Socket.IO] {user["display_name"]} joined chat {chat_id}')


# ============================================
# LEAVE CHAT ROOM
# ============================================
@socketio.on('leave_chat')
def handle_leave_chat(data):
    chat_id = data.get('chatId')
    if chat_id:
        leave_room(f'chat_{chat_id}')


# ============================================
# SEND MESSAGE
# ============================================
@socketio.on('send_message')
def handle_send_message(data):
    user = _get_user_from_auth()
    if not user:
        return

    chat_id = data.get('chatId')
    text = data.get('text', '').strip()

    if not chat_id or not text:
        return

    # Verify user is participant
    chat = query_one(
        'SELECT id, participant1, participant2 FROM chats WHERE id = %s AND (participant1 = %s OR participant2 = %s)',
        (chat_id, user['id'], user['id'])
    )
    if not chat:
        return

    # Encrypt message server-side
    ciphertext_hex, iv_hex = encrypt_message(text)

    # Insert message
    msg = execute(
        """INSERT INTO messages (chat_id, sender_id, encrypted_text, iv)
           VALUES (%s, %s, %s, %s)
           RETURNING id, created_at""",
        (chat_id, user['id'], ciphertext_hex, iv_hex),
        returning=True
    )

    # Update chat last message
    preview = text[:50] if len(text) > 50 else text
    execute(
        'UPDATE chats SET last_message = %s, last_message_time = NOW() WHERE id = %s',
        (preview, chat_id)
    )

    # Broadcast message to chat room
    emit('new_message', {
        'id': msg['id'],
        'chatId': chat_id,
        'senderId': str(user['id']),
        'senderName': user['display_name'],
        'text': text,
        'encrypted': True,
        'timestamp': msg['created_at'].isoformat() if msg['created_at'] else None,
    }, room=f'chat_{chat_id}')


# ============================================
# TYPING INDICATOR
# ============================================
@socketio.on('typing')
def handle_typing(data):
    user = _get_user_from_auth()
    if not user:
        return

    chat_id = data.get('chatId')
    if not chat_id:
        return

    emit('user_typing', {
        'userId': str(user['id']),
        'displayName': user['display_name'],
        'chatId': chat_id,
    }, room=f'chat_{chat_id}', include_self=False)


@socketio.on('stop_typing')
def handle_stop_typing(data):
    user = _get_user_from_auth()
    if not user:
        return

    chat_id = data.get('chatId')
    if not chat_id:
        return

    emit('user_stop_typing', {
        'userId': str(user['id']),
        'chatId': chat_id,
    }, room=f'chat_{chat_id}', include_self=False)


# ============================================
# GET ONLINE USERS
# ============================================
@socketio.on('get_online_users')
def handle_get_online_users():
    user = _get_user_from_auth()
    if not user:
        return

    online = list(online_users.keys())
    emit('online_users', {'userIds': online})


# ============================================
# POMODORO SYNC (shared timer)
# ============================================
@socketio.on('join_pomodoro')
def handle_join_pomodoro(data):
    user = _get_user_from_auth()
    if not user:
        return

    room = data.get('roomId')
    if not room:
        return

    join_room(f'pomodoro_{room}')
    emit('pomodoro_user_joined', {
        'userId': str(user['id']),
        'displayName': user['display_name'],
    }, room=f'pomodoro_{room}', include_self=False)


@socketio.on('pomodoro_sync')
def handle_pomodoro_sync(data):
    user = _get_user_from_auth()
    if not user:
        return

    room = data.get('roomId')
    if not room:
        return

    emit('pomodoro_update', {
        'userId': str(user['id']),
        'timeLeft': data.get('timeLeft'),
        'mode': data.get('mode'),
        'isRunning': data.get('isRunning'),
    }, room=f'pomodoro_{room}', include_self=False)
