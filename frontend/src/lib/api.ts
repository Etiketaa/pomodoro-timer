/**
 * Cliente HTTP mínimo contra el backend Flask (api/).
 *
 * En dev, Vite hace proxy de /api al backend local (vite.config.ts).
 * En prod (Vercel), /api/* rutea a api/index.py vía vercel.json.
 */
const BASE = import.meta.env.VITE_API_BASE ?? '';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* respuesta no-JSON */
  }

  if (!res.ok) {
    const msg = (body as { error?: string })?.error ?? `Error ${res.status}`;
    throw new ApiError(msg, res.status);
  }

  return body as T;
}

export async function post<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}