/**
 * Auth token helpers for JWT-based authentication
 */

const TOKEN_KEY = 'bloom_diary_token';
const SESSION_KEY = 'bloom_diary_session';

export interface Session {
  role: 'admin' | 'viewer' | null;
  username: string | null;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    console.error('Failed to save token');
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    console.error('Failed to clear token');
  }
}

export function getSession(): Session {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return { role: null, username: null };
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    console.error('Failed to save session');
  }
}

export function clearSession(): void {
  clearToken();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
