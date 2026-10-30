export const AUTH_USER_KEY = 'corpoelec_auth_user_v1';
export const AUTH_TOKEN_KEY = 'corpoelec_auth_token_v1';
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
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
