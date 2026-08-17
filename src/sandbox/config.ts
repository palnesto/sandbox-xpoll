/**
 * Sandbox prototype configuration.
 *
 * This build is a UI/UX showcase. There is no backend, no database, no
 * blockchain and no AI. Every network call is answered from static fixtures
 * (see ./mock-api.ts) and every write is a no-op that resolves successfully.
 */

/** The one and only login that unlocks the prototype. Not a list of options. */
export const SANDBOX_USERNAME = "Avestix/Frontier";
export const SANDBOX_PASSWORD = "Susan";

/** Where we land after a successful login. */
export const HOME_ROUTE = "/home";

/** Artificial latency so loading states are visible in the demo. */
export const FAKE_LATENCY_MS = 220;

/** Longer pause used by fake checkout / swap flows. */
export const FAKE_SETTLE_MS = 1800;

export function isValidSandboxLogin(username: string, password: string) {
  return username.trim() === SANDBOX_USERNAME && password === SANDBOX_PASSWORD;
}

export function canonicalUsername(username: string) {
  return SANDBOX_USERNAME;
}
