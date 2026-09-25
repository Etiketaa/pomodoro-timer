"""Rate limiting para los endpoints que gastan plata de LLM.

Por qué existe: `/api/agent/*` y `/api/chatbot` llamaban a NVIDIA/Groq sin
ningún control de acceso. Como la app es local-first y NO manda token de
sesión (ver frontend/src/lib/api.ts), no se puede usar `@login_required` sin
romper el producto. Un atacante (o un curl) podía quemar la API key a costo
nuestro con un simple loop.

Qué hace: sliding window en memoria, por IP. Los requests con sesión válida
tienen un límite más alto, porque son alguien identificado.

LIMITACIÓN HONESTA: en Vercel (serverless) este estado vive por instancia y
se pierde en cada cold start, así que la protección real la da la Vercel
Firewall / WAF en el edge, no este módulo. Acá sirve para el dev local y como
segunda línea. Si el costo de LLM importa, poner `AGENT_API_KEY` en el
entorno: eso sí es una barrera real.
"""

import os
import time
from collections import defaultdict, deque
from functools import wraps

from flask import g, jsonify, request

# Ventana y límites. El anónimo es ~6x más chico que el autenticado.
WINDOW_SECONDS = 60
ANON_LIMIT = int(os.getenv('AGENT_RATE_ANON', '10'))
AUTHED_LIMIT = int(os.getenv('AGENT_RATE_AUTHED', '60'))

_hits = defaultdict(deque)

# API key opcional. Si está seteada, el cliente tiene que mandarla.
AGENT_API_KEY = os.getenv('AGENT_API_KEY', '')


def _client_key():
    """Identidad para el rate limit: IP del cliente.

    Detrás de Vercel/NGINX, X-Forwarded-For trae la IP real (la primera de
    la cadena). Si no viene, se usa remote_addr.
    """
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _user_from_token():
    """Devuelve el user_id si viene un JWT válido, o None.

    Import perezoso de crypto.py a propósito: ese módulo tira ValueError en
    import si JWT_SECRET no está seteado, y el rate limit no debe depender de
    eso para proteger un endpoint. Si no hay secret, somos anónimos y listo.
    """
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None
    try:
        from crypto import verify_token
        payload = verify_token(header[7:])
        return payload.get('sub') if payload else None
    except Exception:
        return None


def _check(key, limit):
    """Sliding window. Devuelve (allowed, remaining, retry_after)."""
    now = time.time()
    window = _hits[key]
    while window and now - window[0] > WINDOW_SECONDS:
        window.popleft()

    if len(window) >= limit:
        retry_after = int(WINDOW_SECONDS - (now - window[0])) + 1
        return False, 0, retry_after

    window.append(now)
    return True, limit - len(window), 0


def agent_rate_limited(f):
    """Decorador para endpoints de LLM.

    Acepta requests anónimos (la app no manda sesión) pero los limita.
    Si hay token de sesión válido, el límite es más alto.
    Si AGENT_API_KEY está seteada, la key es obligatoria.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Barrera fuerte: si configuraron key, sin key no se llama al LLM.
        if AGENT_API_KEY and request.headers.get('X-Agent-Key') != AGENT_API_KEY:
            return jsonify({'ok': False, 'error': 'Falta la API key del agente.'}), 401

        # Resolvemos la identidad nosotros: en /api/agent/* no corre ningún
        # @login_required, así que g.user_id nunca se setea. Si vino un JWT
        # válido lo leemos para dar el límite más alto; si no, anónimo.
        user_id = getattr(g, 'user_id', None) or _user_from_token()
        authenticated = bool(user_id)
        limit = AUTHED_LIMIT if authenticated else ANON_LIMIT
        key = f'user:{user_id}' if authenticated else f'ip:{_client_key()}'

        allowed, _remaining, retry_after = _check(key, limit)
        if not allowed:
            return (
                jsonify({
                    'ok': False,
                    'error': 'Demasiadas consultas al asistente. Probá en un minuto.',
                    'retry_after': retry_after,
                }),
                429,
            )

        return f(*args, **kwargs)

    return decorated
