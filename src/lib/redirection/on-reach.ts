// src/lib/redirection/on-reach.ts
import type { Location } from "react-router-dom";
import { create } from "zustand";

/** =========================
 * Query param spec (optional per route)
 * ========================= */
export type QuerySpec = {
  /** If set: only these keys may appear (no extras). */
  allowOnly?: string[];

  /** Keys that must be present at least once. */
  require?: string[];

  /** Occurrence constraints for keys. */
  count?: Record<string, { min?: number; max?: number; exact?: number }>;

  /** Custom validators per key (runs for each value). Return false to block. */
  validate?: Record<string, (value: string) => boolean>;
};

function passesQuerySpec(query: ParsedQuery, spec?: QuerySpec): boolean {
  if (!spec) return true;

  const keys = Object.keys(query);

  // allowOnly: reject any key not listed
  if (spec.allowOnly) {
    const allowed = new Set(spec.allowOnly);
    for (const k of keys) if (!allowed.has(k)) return false;
  }

  // require: must exist at least once
  if (spec.require) {
    for (const k of spec.require) {
      const vals = query[k] ?? [];
      if (vals.length === 0) return false;
    }
  }

  // count constraints
  if (spec.count) {
    for (const [k, rule] of Object.entries(spec.count)) {
      const n = (query[k] ?? []).length;
      if (rule.exact != null && n !== rule.exact) return false;
      if (rule.min != null && n < rule.min) return false;
      if (rule.max != null && n > rule.max) return false;
    }
  }

  // validate per key (per value)
  if (spec.validate) {
    for (const [k, fn] of Object.entries(spec.validate)) {
      const vals = query[k] ?? [];
      for (const v of vals) if (!fn(v)) return false;
    }
  }

  return true;
}

/** =========================
 * Generic retry tick (Zustand)
 * Any subsystem can bump this to re-evaluate held onReach.
 * ========================= */
type OnReachTickState = {
  tick: number;
  bump: () => void;
  reset: () => void;
};

export const useOnReachTick = create<OnReachTickState>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  reset: () => set({ tick: 0 }),
}));

/** =========================
 * Types
 * ========================= */
export type ParsedQuery = Record<string, string[]>;

export type OnReachCtx<Extras = unknown> = {
  canonicalPath: string;
  pathname: string;
  rawSearch: string;
  query: ParsedQuery;
  extras: Extras;
};

export type RouteMatcher =
  | { type: "exact"; path: string }
  | { type: "regex"; re: RegExp };

export type RouteOnReachConfig<Extras = unknown> = {
  id: string;
  match: RouteMatcher;

  /** Optional query param constraints */
  querySpec?: QuerySpec;

  /** If present and false => hold (do not run yet). */
  when?: (ctx: OnReachCtx<Extras>) => boolean;

  /** If omitted => noop */
  onReach?: (ctx: OnReachCtx<Extras>) => void | Promise<void>;

  /** If omitted => no rate limit */
  rateLimitMs?: number;
};

/** =========================
 * Canonicalization
 * ========================= */
function decodePlus(s: string) {
  return s.replace(/\+/g, " ");
}

export function parseQuery(rawSearch: string): ParsedQuery {
  const search = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
  const out: ParsedQuery = {};
  if (!search) return out;

  for (const part of search.split("&")) {
    if (!part) continue;

    // split ONLY on the first '=' to preserve values containing '=' (e.g., JWT/base64)
    const eqIdx = part.indexOf("=");
    const kRaw = eqIdx === -1 ? part : part.slice(0, eqIdx);
    const vRaw = eqIdx === -1 ? "" : part.slice(eqIdx + 1);

    const key = decodeURIComponent(decodePlus(kRaw));
    const val = decodeURIComponent(decodePlus(vRaw));
    (out[key] ??= []).push(val);
  }
  return out;
}

export function canonicalizeQuery(query: ParsedQuery): string {
  const keys = Object.keys(query).sort((a, b) => a.localeCompare(b));
  const pairs: string[] = [];

  for (const key of keys) {
    const values = [...(query[key] ?? [])].sort((a, b) => a.localeCompare(b));
    for (const v of values) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
}

export function canonicalizeFullPath(pathname: string, rawSearch: string) {
  const query = parseQuery(rawSearch);
  const canonicalSearch = canonicalizeQuery(query);
  const canonicalPath = `${pathname}${canonicalSearch}`;
  return { canonicalPath, query, canonicalSearch };
}

/** =========================
 * Config matching (FIRST MATCH WINS)
 * ========================= */
function matchesConfig<Extras>(
  cfg: RouteOnReachConfig<Extras>,
  pathname: string,
) {
  if (cfg.match.type === "exact") return cfg.match.path === pathname;
  return cfg.match.re.test(pathname);
}

function findMatchingConfig<Extras>(
  configs: RouteOnReachConfig<Extras>[],
  pathname: string,
) {
  for (const cfg of configs) {
    if (matchesConfig(cfg, pathname)) return cfg;
  }
  return null;
}

/** =========================
 * Rate Limit Store
 * ========================= */
const RL_STORAGE_KEY = "__onreach_rl_v1__";
type RateLimitMap = Record<string, number>;

function rlRead(): RateLimitMap {
  try {
    const raw = localStorage.getItem(RL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RateLimitMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function rlWrite(map: RateLimitMap) {
  try {
    localStorage.setItem(RL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function clearOnReachRateLimitCache(): void {
  try {
    localStorage.removeItem(RL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function allowAndBumpRateLimit(key: string, rateLimitMs?: number): boolean {
  if (!rateLimitMs || rateLimitMs <= 0) return true;

  const now = Date.now();
  const map = rlRead();
  const nextAllowedAt = map[key] ?? 0;

  if (now < nextAllowedAt) return false;

  map[key] = now + rateLimitMs;
  rlWrite(map);
  return true;
}

/** =========================
 * Engine runner
 * ========================= */
export async function runOnReachForLocation<Extras>(opts: {
  location: Pick<Location, "pathname" | "search">;
  configs: RouteOnReachConfig<Extras>[];
  extras: Extras;
}) {
  const { pathname, search } = opts.location;

  const { canonicalPath, query } = canonicalizeFullPath(pathname, search);

  const ctxBase: Omit<OnReachCtx<Extras>, "extras"> = {
    canonicalPath,
    pathname,
    rawSearch: search,
    query,
  };

  const cfg =
    opts.configs.find((c) => {
      if (!matchesConfig(c, pathname)) return false;
      if (!c.onReach) return false;
      if (c.querySpec && !passesQuerySpec(query, c.querySpec)) return false;
      return true;
    }) ?? null;

  if (!cfg) return;

  const ctx: OnReachCtx<Extras> = {
    ...ctxBase,
    extras: opts.extras,
  };

  if (cfg.when && !cfg.when(ctx)) return;

  // Apply rate limit only right before execution
  const rateKey = `${cfg.id}|${canonicalPath}`;
  const allowed = allowAndBumpRateLimit(rateKey, cfg.rateLimitMs);

  console.log("[DBG][onReachRunner]", {
    cfgId: cfg.id,
    pathname,
    canonicalPath,
    rateKey,
    rateLimitMs: cfg.rateLimitMs,
    allowed,
    hasOnReach: !!cfg.onReach,
    hasWhen: !!cfg.when,
    hasQuerySpec: !!cfg.querySpec,
    queryKeys: Object.keys(query),
  });

  if (!allowed) return;

  await cfg.onReach(ctx);
}
