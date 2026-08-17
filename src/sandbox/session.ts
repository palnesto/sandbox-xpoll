/**
 * Fake auth session for the sandbox prototype.
 *
 * Held in sessionStorage so a page refresh keeps you logged in, but closing the
 * tab resets the demo to a clean state. Nothing else in the app is persisted.
 */

import { canonicalUsername, isValidSandboxLogin } from "./config";

const SESSION_KEY = "xpoll-sandbox-session";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeToSession(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSessionUsername(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function isSignedIn() {
  return getSessionUsername() !== null;
}

/** Returns true when the credentials match the fixed sandbox login. */
export function signIn(username: string, password: string): boolean {
  if (!isValidSandboxLogin(username, password)) return false;
  try {
    window.sessionStorage.setItem(SESSION_KEY, canonicalUsername(username));
  } catch {
    /* private browsing — session simply won't survive a refresh */
  }
  emit();
  return true;
}

export function signOut() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  emit();
}
