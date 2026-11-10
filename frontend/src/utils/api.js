export const AUTH_USER_KEY = 'corpoelec_auth_user_v1';
export const AUTH_TOKEN_KEY = 'corpoelec_auth_token_v1';

const RENDER_BACKEND_API = 'https://catalogo-electrico-backend.onrender.com/api';
const LOCAL_BACKEND_API = 'http://localhost:3000/api';

function getDefaultApiBase() {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return RENDER_BACKEND_API;
  }
  return LOCAL_BACKEND_API;
}

function normalizeApiBase(rawUrl) {
  const fallback = getDefaultApiBase();
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const cleaned = rawUrl.trim().replace(/\/+$/, '');
  if (!cleaned) return fallback;

  // Si en Render quedó guardada la URL antigua de Railway inactiva, redirigir automáticamente al backend activo en Render
  if (cleaned.includes('catalogo-electrico-app-production.up.railway.app')) {
    return RENDER_BACKEND_API;
  }

  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);
export const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(urlOrPath, options = {}) {
  const fullUrl = urlOrPath.startsWith('http')
    ? urlOrPath
    : `${API_BASE}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;

  const isFormData = options.body instanceof FormData;
  const baseHeaders = isFormData
    ? {}
    : options.body
    ? { 'Content-Type': 'application/json' }
    : {};

  const headers = getAuthHeaders({
    ...baseHeaders,
    ...(options.headers || {}),
  });

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/')) {
    return `${BACKEND_ORIGIN}${trimmed}`;
  }
  if (trimmed.includes('/uploads/') && trimmed.startsWith('http://localhost:3000')) {
    const rel = trimmed.slice('http://localhost:3000'.length);
    return `${BACKEND_ORIGIN}${rel}`;
  }
  return trimmed;
}
