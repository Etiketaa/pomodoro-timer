"""
Chat endpoints.
Server-side encrypted messaging between users.
"""

import os
import secrets
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from db import query_one, query_all, execute
from crypto import login_required
from dotenv import load_dotenv

# Load .env from project root (one level up from api/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, '.env'))

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

# AES-256-GCM key for server-side encryption
_aes_hex = os.getenv('AES_SECRET_KEY', '')
AES_KEY = bytes.fromhex(_aes_hex) if _aes_hex and len(_aes_hex) == 64 else None


def _get_aes_key():
    if not AES_KEY or len(AES_KEY) != 32:
        raise ValueError('AES_SECRET_KEY must be 32 bytes (64 hex chars)')
    return AES_KEY


def encrypt_message(plaintext):
    """Encrypt a message with AES-256-GCM. Returns (ciphertext_hex, iv_hex)."""
    aesgcm = AESGCM(_get_aes_key())
    iv = secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode('utf-8'), None)
    return ciphertext.hex(), iv.hex()


def decrypt_message(ciphertext_hex, iv_hex):
    """Decrypt a message with AES-256-GCM."""
    aesgcm = AESGCM(_get_aes_key())
    ciphertext = bytes.fromhex(ciphertext_hex)
    iv = bytes.fromhex(iv_hex)
    plaintext = aesgcm.decrypt(iv, ciphertext, None)
    return plaintext.decode('utf-8')


def _get_chat_id(uid1, uid2):
    """Generate a deterministic chat ID from two user IDs."""
    return '_'.join(sorted([str(uid1), str(uid2)]))


def _ensure_chat(chat_id, user1_id, user2_id):
    """Create a chat if it doesn't exist."""
    existing = query_one('SELECT id FROM chats WHERE id = %s', (chat_id,))
    if not existing:
        execute(
            'INSERT INTO chats (id, participant1, participant2) VALUES (%s, %s, %s)',
            (chat_id, user1_id, user2_id)
        )


# ============================================
# GET /api/chat/chats — List user's chats
# ============================================
@chat_bp.route('/chats', methods=['GET'])
@login_required
def get_chats():
    chats = query_all(
        """SELECT c.id, c.last_message, c.last_message_time,
                  CASE WHEN c.participant1 = %s THEN c.participant2 ELSE c.participant1 END AS other_user_id
           FROM chats c
           WHERE c.participant1 = %s OR c.participant2 = %s
           ORDER BY c.last_message_time DESC""",
        (g.user_id, g.user_id, g.user_id)
    )

    result = []
    for chat in chats:
        other_id = chat['other_user_id']
        other_user = query_one(
            'SELECT id, display_name, friend_code FROM users WHERE id = %s',
            (other_id,)
        )
        result.append({
            'id': chat['id'],
            'lastMessage': chat['last_message'] or '',
            'lastMessageTime': chat['last_message_time'].isoformat() if chat['last_message_time'] else None,
            'otherUser': {
                'id': str(other_user['id']),
                'displayName': other_user['display_name'],
                'friendCode': other_user['friend_code'],
            } if other_user else None,
        })

    return jsonify({'chats': result})


# ============================================
# POST /api/chat/chats — Create/get chat with a user
# ============================================
@chat_bp.route('/chats', methods=['POST'])
@login_required
def create_chat():
    data = request.get_json()
    other_user_id = data.get('userId')

    if not other_user_id:
        return jsonify({'error': 'userId es requerido'}), 400

    if other_user_id == g.user_id:
        return jsonify({'error': 'No podés chatear con vos mismo'}), 400

    # Check other user exists
    other = query_one('SELECT id, display_name, friend_code FROM users WHERE id = %s', (other_user_id,))
    if not other:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    chat_id = _get_chat_id(g.user_id, other_user_id)
    _ensure_chat(chat_id, g.user_id, other_user_id)

    return jsonify({
        'chat': {
            'id': chat_id,
            'otherUser': {
                'id': str(other['id']),
                'displayName': other['display_name'],
                'friendCode': other['friend_code'],
            }
        }
    })


# ============================================
# GET /api/chat/chats/:id/messages — Get messages
# ============================================
@chat_bp.route('/chats/<chat_id>/messages', methods=['GET'])
@login_required
def get_messages(chat_id):
    # Verify user is participant
    chat = query_one(
        'SELECT id FROM chats WHERE id = %s AND (participant1 = %s OR participant2 = %s)',
        (chat_id, g.user_id, g.user_id)
    )
    if not chat:
        return jsonify({'error': 'Chat no encontrado'}), 404

    # Get optional pagination
    before = request.args.get('before')  # message ID for pagination
    limit = min(int(request.args.get('limit', 100)), 200)

    if before:
        messages = query_all(
            """SELECT id, sender_id, encrypted_text, iv, created_at
               FROM messages
               WHERE chat_id = %s AND id < %s
               ORDER BY created_at DESC
               LIMIT %s""",
            (chat_id, before, limit)
        )
    else:
        messages = query_all(
            """SELECT id, sender_id, encrypted_text, iv, created_at
               FROM messages
               WHERE chat_id = %s
               ORDER BY created_at DESC
               LIMIT %s""",
            (chat_id, limit)
        )

    # Decrypt messages
    result = []
    for msg in reversed(messages):  # Return in chronological order
        try:
            text = decrypt_message(msg['encrypted_text'], msg['iv'])
        except Exception:
            text = '[No se pudo desencriptar]'

        result.append({
            'id': msg['id'],
            'senderId': str(msg['sender_id']),
            'text': text,
            'encrypted': True,
            'timestamp': msg['created_at'].isoformat() if msg['created_at'] else None,
        })

    return jsonify({'messages': result})


# ============================================
# POST /api/chat/chats/:id/messages — Send message
# ============================================
@chat_bp.route('/chats/<chat_id>/messages', methods=['POST'])
@login_required
def send_message(chat_id):
    data = request.get_json()
    text = data.get('text', '').strip()

    if not text:
        return jsonify({'error': 'Mensaje vacío'}), 400

    # Verify user is participant
    chat = query_one(
        'SELECT id, participant1, participant2 FROM chats WHERE id = %s AND (participant1 = %s OR participant2 = %s)',
        (chat_id, g.user_id, g.user_id)
    )
    if not chat:
        return jsonify({'error': 'Chat no encontrado'}), 404

    # Encrypt message server-side
    ciphertext_hex, iv_hex = encrypt_message(text)

    # Insert message
    msg = execute(
        """INSERT INTO messages (chat_id, sender_id, encrypted_text, iv)
           VALUES (%s, %s, %s, %s)
           RETURNING id, created_at""",
        (chat_id, g.user_id, ciphertext_hex, iv_hex),
        returning=True
    )

    # Update chat last message
    preview = text[:50] if len(text) > 50 else text
    execute(
        """UPDATE chats SET last_message = %s, last_message_time = NOW() WHERE id = %s""",
        (preview, chat_id)
    )

    return jsonify({
        'message': {
            'id': msg['id'],
            'senderId': str(g.user_id),
            'text': text,
            'encrypted': True,
            'timestamp': msg['created_at'].isoformat() if msg['created_at'] else None,
        }
    }), 201


# ============================================
# POST /api/chat/contacts — Add contact by friend code or user ID
# ============================================
@chat_bp.route('/contacts', methods=['POST'])
@login_required
def add_contact():
    data = request.get_json()
    code_or_id = data.get('code', '').strip()

    if not code_or_id:
        return jsonify({'error': 'Código requerido'}), 400

    # Try friend code first
    if code_or_id.upper().startswith('POMO-'):
        fc = query_one(
            'SELECT user_id FROM friend_codes WHERE code = %s',
            (code_or_id.upper(),)
        )
        if not fc:
            return jsonify({'error': 'Código no encontrado'}), 404
        other_user_id = fc['user_id']
    else:
        # Try direct user ID
        other_user_id = code_or_id

    if str(other_user_id) == str(g.user_id):
        return jsonify({'error': 'No podés agregarte a vos mismo'}), 400

    # Check user exists
    other = query_one(
        'SELECT id, display_name, friend_code FROM users WHERE id = %s',
        (other_user_id,)
    )
    if not other:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    # Create chat
    chat_id = _get_chat_id(g.user_id, other_user_id)
    _ensure_chat(chat_id, g.user_id, other_user_id)

    return jsonify({
        'contact': {
            'id': str(other['id']),
            'displayName': other['display_name'],
            'friendCode': other['friend_code'],
            'chatId': chat_id,
        }
    }), 201
