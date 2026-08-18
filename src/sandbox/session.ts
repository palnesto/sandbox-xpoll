/**
 * Local auth session.
 *
 * Held in sessionStorage so a page refresh keeps you signed in, but closing the
 * tab resets to a clean state. Nothing else in the app is persisted.
 */

import { isValidSandboxLogin, SANDBOX_USERNAME } from "./config";

const SESSION_KEY = "xpoll-sandbox-session";

export function getSessionUsername(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Returns true when the credentials match the configured login. */
export function signIn(username: string, password: string): boolean {
  if (!isValidSandboxLogin(username, password)) return false;
  try {
    window.sessionStorage.setItem(SESSION_KEY, SANDBOX_USERNAME);
  } catch {
    /* private browsing — the session simply won't survive a refresh */
  }
  return true;
}

export function signOut() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
