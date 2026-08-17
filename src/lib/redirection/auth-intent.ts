import { canonicalizeFullPath } from "./on-reach";

const INTENT_KEY = "__auth_intent_v1__";
const ONBOARDING_INTENT_KEY = "__onboarding_intent_v1__";

type IntentPayload = {
  canonicalPath: string;
  expiresAt: number;
};
/**
 * Sets (overwrites) the intended private destination.
 * This overwrite behavior is REQUIRED to abort prior intents like:
 * unauth /c -> redirect -> later unauth /b -> overwrite intent to /b
 */
export function setAuthIntent(
  pathname: string,
  search: string,
  ttlMs = 20 * 60 * 1000, // 20 mins to remember when unauthenticated
) {
  const { canonicalPath } = canonicalizeFullPath(pathname, search);
  const payload: IntentPayload = {
    canonicalPath,
    expiresAt: Date.now() + ttlMs,
  };
  sessionStorage.setItem(INTENT_KEY, JSON.stringify(payload));
}

/** Optional helper if you ever want to clear intent explicitly. */
export function clearAuthIntent() {
  sessionStorage.removeItem(INTENT_KEY);
}

/**
 * Pops and returns canonicalPath if valid; else null.
 * One-time use.
 */
export function popAuthIntentIfValid(): string | null {
  const raw = sessionStorage.getItem(INTENT_KEY);
  sessionStorage.removeItem(INTENT_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as IntentPayload;
    if (!payload?.canonicalPath || !payload?.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;
    return payload.canonicalPath;
  } catch {
    return null;
  }
}

export function setOnboardingIntent(
  pathname: string,
  search: string,
  ttlMs = 60 * 60 * 1000,
) {
  // TTL can be longer than auth intent; onboarding may take time.
  const { canonicalPath } = canonicalizeFullPath(pathname, search);
  sessionStorage.setItem(
    ONBOARDING_INTENT_KEY,
    JSON.stringify({ canonicalPath, expiresAt: Date.now() + ttlMs }),
  );
}
export function popOnboardingIntentIfValid(): string | null {
  const raw = sessionStorage.getItem(ONBOARDING_INTENT_KEY);
  sessionStorage.removeItem(ONBOARDING_INTENT_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as {
      canonicalPath: string;
      expiresAt: number;
    };
    if (!payload?.canonicalPath || !payload?.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;
    return payload.canonicalPath;
  } catch {
    return null;
  }
}
export function clearOnboardingIntent() {
  sessionStorage.removeItem(ONBOARDING_INTENT_KEY);
}
