"""
Feedback / Reviews endpoints.
Submit and list user feedback.
"""

from flask import Blueprint, request, jsonify, g
from db import query_all, execute
from crypto import optional_auth

feedback_bp = Blueprint('feedback', __name__, url_prefix='/api/feedback')


# ============================================
# POST /api/feedback — Submit feedback
# ============================================
@feedback_bp.route('', methods=['POST'])
@optional_auth
def submit_feedback():
    data = request.get_json()
    name = (data.get('name') or 'Anonimo').strip()[:100]
    rating = data.get('rating')
    message = (data.get('message') or '').strip()

    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating debe ser entre 1 y 5'}), 400
    if not message:
        return jsonify({'error': 'Mensaje requerido'}), 400

    user_id = getattr(g, 'user_id', None)

    execute(
        'INSERT INTO feedback (user_id, name, rating, message) VALUES (%s, %s, %s, %s)',
        (user_id, name, rating, message)
    )

    return jsonify({'ok': True}), 201


# ============================================
# GET /api/feedback — List recent feedback
# ============================================
@feedback_bp.route('', methods=['GET'])
def get_feedback():
    limit = min(int(request.args.get('limit', 20)), 50)
    reviews = query_all(
        'SELECT name, rating, message, created_at FROM feedback ORDER BY created_at DESC LIMIT %s',
        (limit,)
    )

    result = []
    for r in reviews:
        result.append({
            'name': r['name'],
            'rating': r['rating'],
            'message': r['message'],
            'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
        })

    return jsonify({'reviews': result})
