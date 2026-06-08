const TOKEN_KEY = 'strength-calories-session-v1';
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(email, password) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password },
  });
}

export async function login(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getMe(token) {
  return apiRequest('/api/auth/me', { token });
}

export async function getTrackerState(token) {
  return apiRequest('/api/tracker-state', { token });
}

export async function saveTrackerState(state, token) {
  return apiRequest('/api/tracker-state', {
    method: 'PUT',
    token,
    body: { state },
  });
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Could not reach the API. Make sure the backend is running.'), { status: 0 });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || (response.status === 401 ? 'Your session has expired. Please log in again.' : 'Sync failed. Please try again.');
    throw Object.assign(new Error(message), { status: response.status });
  }
  return payload;
}
