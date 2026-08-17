// rewards.ts (BigInt, lossless)

/** ========= Types ========= */
export type RewardType = "min" | "max";

export interface CurveConfig {
  totalLevels: number; // 1..N (small/medium)
  rewardType: RewardType; // "min" anchors L1; "max" anchors LN
  perUserReward: bigint; // BigInt, base units (no decimals)
  baseScore?: bigint; // BigInt (default 100n)
  exponent?: number; // small integer (default 3)
}

/** ========= Core Score Curve (BigInt) ========= */
const DEFAULT_BASE_SCORE = 100n;
const DEFAULT_EXPONENT = 3;

/** powi: integer power for BigInt base and number exponent */
function powi(base: bigint, exp: number): bigint {
  if (exp <= 0) return 1n;
  let result = 1n;
  let b = base;
  let e = BigInt(exp);
  while (e > 0n) {
    if ((e & 1n) === 1n) result *= b;
    b *= b;
    e >>= 1n;
  }
  return result;
}

/** Level -> score (BigInt): baseScore * level^exponent */
export function scoreForLevelFn(
  level: number,
  baseScore: bigint,
  exponent: number
): bigint {
  if (level < 1) return baseScore;
  return baseScore * powi(BigInt(level), exponent);
}

/** Score -> level (approx inverse, returns number)
 * NOTE: uses Number for inverse root; keep for compatibility/debug only.
 * For very large scores this may clamp—don’t use it in core payout paths.
 */
export function levelForScoreFn(
  score: bigint,
  baseScore: bigint,
  exponent: number
): number {
  if (score <= baseScore) return 1;
  const ratio = Number(score) / Number(baseScore);
  if (!isFinite(ratio) || ratio <= 1) return 1;
  return Math.floor(Math.pow(ratio, 1 / exponent));
}

/** Using defaults */
export function scoreForLevel(level: number): bigint {
  return scoreForLevelFn(level, DEFAULT_BASE_SCORE, DEFAULT_EXPONENT);
}
export function levelForScore(score: bigint): number {
  return levelForScoreFn(score, DEFAULT_BASE_SCORE, DEFAULT_EXPONENT);
}

/** ========= Memoized Reward Tables (BigInt) ========= */

type RewardTable = {
  rewards: bigint[]; // rewards[0] = level 1, length = totalLevels
  minReward: bigint; // rewards[0]
  maxReward: bigint; // rewards[totalLevels - 1]
  totalLevels: number;
  baseScore: bigint;
  exponent: number;
};

// tiny in-memory cache
const TABLE_CACHE = new Map<string, RewardTable>();

function cfgKey(cfg: CurveConfig): string {
  const b = cfg.baseScore ?? DEFAULT_BASE_SCORE;
  const e = cfg.exponent ?? DEFAULT_EXPONENT;
  const N = Math.max(1, Math.floor(cfg.totalLevels));
  // BigInts stringify safely
  return `${N}|${
    cfg.rewardType
  }|${cfg.perUserReward.toString()}|${b.toString()}|${e}`;
}

/**
 * Build (or fetch memoized) reward table using exact integer math:
 *   reward(level) = floor( perUserReward * score(level) / score(anchor) )
 * Anchor is L=1 for "min" and L=N for "max".
 * If perUserReward > 0n, enforce minimum reward of 1n.
 */
function getRewardTable(config: CurveConfig): RewardTable {
  const key = cfgKey(config);
  const cached = TABLE_CACHE.get(key);
  if (cached) return cached;

  const totalLevels = Math.max(1, Math.floor(config.totalLevels));
  const baseScore = config.baseScore ?? DEFAULT_BASE_SCORE;
  const exponent = config.exponent ?? DEFAULT_EXPONENT;
  const perUserReward = config.perUserReward < 0n ? 0n : config.perUserReward;

  const anchorLevel = config.rewardType === "max" ? totalLevels : 1;
  const denom = (() => {
    const sA = scoreForLevelFn(anchorLevel, baseScore, exponent);
    return sA === 0n ? 1n : sA;
  })();

  const rewards = new Array<bigint>(totalLevels);
  for (let i = 1; i <= totalLevels; i++) {
    const s = scoreForLevelFn(i, baseScore, exponent);
    let r = perUserReward === 0n ? 0n : (perUserReward * s) / denom; // floor
    if (perUserReward > 0n && r < 1n) r = 1n; // minimum 1
    rewards[i - 1] = r;
  }

  const table: RewardTable = {
    rewards,
    minReward: rewards[0],
    maxReward: rewards[totalLevels - 1],
    totalLevels,
    baseScore,
    exponent,
  };

  TABLE_CACHE.set(key, table);
  return table;
}

/** ========= Anchored Helpers (BigInt) ========= */

export function rewardForLevelAnchoredAtTop(
  level: number,
  totalLevels: number,
  topReward: bigint,
  baseScore: bigint = DEFAULT_BASE_SCORE,
  exponent: number = DEFAULT_EXPONENT
): bigint {
  const { rewards } = getRewardTable({
    totalLevels,
    rewardType: "max",
    perUserReward: topReward,
    baseScore,
    exponent,
  });
  const L = Math.min(Math.max(1, Math.floor(level)), totalLevels);
  return rewards[L - 1];
}

export function rewardForLevelAnchoredAtBase(
  level: number,
  totalLevels: number,
  baseReward: bigint,
  baseScore: bigint = DEFAULT_BASE_SCORE,
  exponent: number = DEFAULT_EXPONENT
): bigint {
  const { rewards } = getRewardTable({
    totalLevels,
    rewardType: "min",
    perUserReward: baseReward,
    baseScore,
    exponent,
  });
  const L = Math.min(Math.max(1, Math.floor(level)), totalLevels);
  return rewards[L - 1];
}

/** Build full reward table (levels 1..N) with BigInt rewards */
export function buildRewardTable(
  config: Pick<CurveConfig, "perUserReward" | "totalLevels" | "rewardType"> &
    Partial<Pick<CurveConfig, "baseScore" | "exponent">>
): { level: number; reward: bigint }[] {
  const table = getRewardTable({
    totalLevels: config.totalLevels,
    rewardType: config.rewardType,
    perUserReward: config.perUserReward,
    baseScore: config.baseScore ?? DEFAULT_BASE_SCORE,
    exponent: config.exponent ?? DEFAULT_EXPONENT,
  });
  return table.rewards.map((reward, idx) => ({ level: idx + 1, reward }));
}

/** ========= Cap Logic (BigInt) ========= */

/** Binary search largest reward <= remaining within [1..L] (BigInt) */
function findFloorRewardAtOrBelowLevel(
  rewards: bigint[],
  remaining: bigint,
  L: number
): bigint | null {
  let lo = 0;
  let hi = L - 1;
  let ans: bigint | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = rewards[mid];
    if (r <= remaining) {
      ans = r;
      lo = mid + 1; // try higher (closer to remaining)
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * computeUserReward (BigInt):
 * - Exact BigInt math
 * - Uses memoized table
 * - If remaining < reward(level), binary-search downwards (1..level)
 * - If even level 1 exceeds remaining, returns remaining
 */
export function computeUserReward(params: {
  maxCap: bigint;
  currentDistribution: bigint;
  level: number;
  config: CurveConfig;
}): bigint {
  const { maxCap, currentDistribution, level, config } = params;

  const remaining =
    maxCap > currentDistribution ? maxCap - currentDistribution : 0n;
  if (remaining <= 0n) return 0n;

  const table = getRewardTable(config);
  const N = table.totalLevels;
  const L = Math.min(Math.max(1, Math.floor(level)), N);

  const rewardAtL = table.rewards[L - 1];
  if (remaining >= rewardAtL) return rewardAtL;

  const fallback = findFloorRewardAtOrBelowLevel(table.rewards, remaining, L);
  if (fallback !== null) return fallback;

  // even level 1 > remaining → give the remaining
  return remaining;
}

/** Batch compute (BigInt); reuses memoized table implicitly via computeUserReward */
export function computeRewardsForUsers(
  users: number[],
  maxCap: bigint,
  currentDistribution: bigint,
  config: CurveConfig
): bigint[] {
  let distributed = currentDistribution < 0n ? 0n : currentDistribution;
  const out = new Array<bigint>(users.length);
  for (let i = 0; i < users.length; i++) {
    const lvl = users[i];
    const payout = computeUserReward({
      maxCap,
      currentDistribution: distributed,
      level: lvl,
      config,
    });
    out[i] = payout;
    distributed += payout;
  }
  return out;
}

/** Debug helper: (level,score) rows as BigInt */
export function levelTable(
  totalLevels: number,
  baseScore: bigint = DEFAULT_BASE_SCORE,
  exponent: number = DEFAULT_EXPONENT
): { level: number; score: bigint }[] {
  const out = new Array<{ level: number; score: bigint }>(totalLevels);
  for (let i = 1; i <= totalLevels; i++) {
    out[i - 1] = { level: i, score: scoreForLevelFn(i, baseScore, exponent) };
  }
  return out;
}
