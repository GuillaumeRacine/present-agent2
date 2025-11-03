/**
 * Authentication utilities for persistent user identification
 * Uses JWT session tokens from backend for authentication
 */

// Storage keys
const SESSION_TOKEN_KEY = 'present_agent_session_token';
const USER_EMAIL_KEY = 'present_agent_user_email';
const SESSION_ID_KEY = 'present_agent_session_id';

// Generate a session ID for chat sessions
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Store session token after successful authentication
 */
export function storeSessionToken(token: string, email: string, userId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(USER_EMAIL_KEY, email);
  // Store userId separately for quick access
  localStorage.setItem('present_agent_user_id', userId);
}

/**
 * Get stored session token
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Get user email
 */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_EMAIL_KEY);
}

/**
 * Decode JWT token to extract userId
 * Note: This is just for extracting data, not for verification (server verifies)
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode base64 payload
    const payload = JSON.parse(atob(parts[1]));
    return payload.userId || null;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Get userId from stored token or return null if not authenticated
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;

  // Try to get from quick storage first
  const cachedUserId = localStorage.getItem('present_agent_user_id');
  if (cachedUserId) return cachedUserId;

  // Otherwise extract from token
  const token = getSessionToken();
  if (!token) return null;

  const userId = getUserIdFromToken(token);
  if (userId) {
    // Cache for quick access
    localStorage.setItem('present_agent_user_id', userId);
  }
  return userId;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = getSessionToken();
  return token !== null;
}

/**
 * Verify session with backend
 */
export async function verifySession(): Promise<{ valid: boolean; userId?: string; email?: string }> {
  try {
    const token = getSessionToken();
    if (!token) {
      return { valid: false };
    }

    const response = await fetch('/api/auth/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken: token }),
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return {
      valid: data.success,
      userId: data.userId,
      email: data.email,
    };
  } catch (error) {
    console.error('Session verification failed:', error);
    return { valid: false };
  }
}

/**
 * Get or create session ID for current chat session
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Reset session (start new conversation)
 */
export function resetSession(): string {
  if (typeof window === 'undefined') return 'server';

  const newSessionId = generateSessionId();
  sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
  return newSessionId;
}

/**
 * Clear all user data (logout)
 */
export function clearUserData(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem('present_agent_user_id');
  sessionStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Get user info
 */
export function getUserInfo() {
  return {
    userId: getUserId(),
    sessionId: getSessionId(),
    email: getUserEmail(),
    isAuthenticated: isAuthenticated(),
  };
}
