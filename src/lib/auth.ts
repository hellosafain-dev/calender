/**
 * Auth token helpers for JWT-based authentication
 * Features persistent login in localStorage with a rolling 2-day inactivity timeout.
 */

const TOKEN_KEY = 'bloom_diary_token';
const SESSION_KEY = 'bloom_diary_session';
const LAST_ACCESSED_KEY = 'bloom_diary_last_accessed';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 172,800,000 milliseconds

export interface Session {
  role: 'admin' | 'viewer' | null;
  username: string | null;
}

/**
 * Checks if the session has expired due to 2 days of inactivity.
 * If expired, clears storage. Otherwise, resets the inactivity timer to now.
 */
function checkAndRefreshSession(): void {
  try {
    const lastAccessed = localStorage.getItem(LAST_ACCESSED_KEY);
    if (lastAccessed) {
      const elapsed = Date.now() - parseInt(lastAccessed, 10);
      if (elapsed > TWO_DAYS_MS) {
        // More than 2 days since last opening the application -> clear session
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LAST_ACCESSED_KEY);
        return;
      }
    }
    // Only refresh timer if a valid token is stored
    if (localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(LAST_ACCESSED_KEY, Date.now().toString());
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export function getToken(): string | null {
  try {
    checkAndRefreshSession();
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LAST_ACCESSED_KEY, Date.now().toString());
  } catch {
    console.error('Failed to save token');
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACCESSED_KEY);
    // Clean up any remaining legacy sessionStorage items as well
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    console.error('Failed to clear token');
  }
}

export function getSession(): Session {
  try {
    checkAndRefreshSession();
    const saved = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      // Migrate from sessionStorage if needed
      if (!localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(SESSION_KEY, saved);
      }
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return { role: null, username: null };
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LAST_ACCESSED_KEY, Date.now().toString());
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
