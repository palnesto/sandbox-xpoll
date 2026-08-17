import { assetSpecs, type AssetType } from "./asset";

/* ──────────────────────────────── Result helpers ─────────────────────────────── */

export type ErrCode =
  | "INVALID_DECIMAL"
  | "INVALID_INTEGER"
  | "INVALID_DECIMALS"
  | "UNSAFE_NUMBER"
  | "GENERIC";

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: string; code?: ErrCode };
export type Result<T> = Ok<T> | Err;

const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = (error: string, code: ErrCode = "GENERIC"): Err => ({
  ok: false,
  error,
  code,
});

/** Unwrap helpers */
export function unwrapOr<T>(r: Result<T>, fallback: T): T {
  return r.ok ? r.value : fallback;
}
export function unwrapString(r: Result<string>, fallback = "—"): string {
  return r.ok ? r.value : fallback;
}
export function unwrapNumber(r: Result<number>, fallback = Number.NaN): number {
  return r.ok ? r.value : fallback;
}
export function unwrapBigInt(r: Result<bigint>, fallback = BigInt(0)): bigint {
  return r.ok ? r.value : fallback;
}

/* ───────────────────────────── Types & options ───────────────────────────── */

export type RoundingMode = "round" | "floor" | "ceil" | "truncate";
export type OutputType = "string" | "number" | "bigint";

export type AmountOpts =
  | { assetId: AssetType; decimals?: never }
  | { assetId?: never; decimals: number };

export type ParentToBaseOpts = AmountOpts & {
  value: string | number | bigint;
  rounding?: RoundingMode;
  output?: OutputType;
  allowUnsafeNumber?: boolean;
};

export type BaseToParentOpts = AmountOpts & {
  value: string | number | bigint;
  output?: Extract<OutputType, "string" | "number">;
  fixed?: number;
  trim?: boolean;
  group?: boolean;
  allowUnsafeNumber?: boolean;
};

export type PartDigitsMode = "pad" | "trim";

/* ───────────────────────────────── helpers ───────────────────────────────── */

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TEN = BigInt(10);

const pow10Cache = new Map<number, bigint>();

function powBI(base: bigint, exp: number): bigint {
  if (exp <= 0) return BIGINT_ONE;
  let result = BIGINT_ONE;
  let b = base;
  let e = exp | 0;
  while (e > 0) {
    if (e & 1) result *= b;
    b *= b;
    e >>>= 1;
  }
  return result;
}

function pow10n(d: number): bigint {
  if (pow10Cache.has(d)) return pow10Cache.get(d)!;
  const v = powBI(BIGINT_TEN, d);
  pow10Cache.set(d, v);
  return v;
}

function isValidDecimals(d: number): boolean {
  return Number.isInteger(d) && d >= 0 && d <= 60;
}

function toDecimalString(val: string | number | bigint): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "bigint") return val.toString();
  const as = String(val);
  if (/e/i.test(as)) {
    return Number(val)
      .toPrecision(40)
      .replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
  }
  return as;
}

const decRe = /^[+-]?\d+(?:\.\d+)?$/;

/** Parent → Base */
function decimalToScaledIntR(
  decimalStrRaw: string,
  decimals: number,
  rounding: RoundingMode
): Result<bigint> {
  if (!isValidDecimals(decimals))
    return err("Invalid decimals", "INVALID_DECIMALS");

  const s0 = decimalStrRaw.replace(/_/g, "").trim();
  if (!decRe.test(s0)) return err("Invalid decimal string", "INVALID_DECIMAL");

  const neg = s0.startsWith("-");
  const s = neg ? s0.slice(1) : s0;
  const [intPartRaw, fracRaw = ""] = s.split(".");
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  const frac = fracRaw;
  const scale = pow10n(decimals);

  const baseFromParts = (i: string, f: string): bigint =>
    BigInt(i || "0") * scale + BigInt(f || "0");

  if (!frac.length)
    return ok(neg ? -baseFromParts(intPart, "0") : baseFromParts(intPart, "0"));

  if (frac.length === decimals)
    return ok(
      neg ? -baseFromParts(intPart, frac) : baseFromParts(intPart, frac)
    );

  if (frac.length < decimals) {
    const padded = frac.padEnd(decimals, "0");
    return ok(
      neg ? -baseFromParts(intPart, padded) : baseFromParts(intPart, padded)
    );
  }

  const keep = frac.slice(0, decimals);
  const rest = frac.slice(decimals);
  let add = BIGINT_ZERO;

  if (rounding === "round") add = rest[0] >= "5" ? BIGINT_ONE : BIGINT_ZERO;
  else if (rounding === "ceil")
    add = neg ? BIGINT_ZERO : /[1-9]/.test(rest) ? BIGINT_ONE : BIGINT_ZERO;
  else if (rounding === "floor")
    add = neg && /[1-9]/.test(rest) ? BIGINT_ONE : BIGINT_ZERO;

  let base = baseFromParts(intPart, keep);
  base += add;
  return ok(neg ? -base : base);
}

function toBigIntStrictR(v: string | number | bigint): Result<bigint> {
  if (typeof v === "bigint") return ok(v);
  if (typeof v === "number") {
    if (!Number.isInteger(v) || !Number.isSafeInteger(v)) {
      return err(
        "Unsafe number; use bigint or integer string",
        "UNSAFE_NUMBER"
      );
    }
    return ok(BigInt(v));
  }
  const s = v.trim();
  if (!/^[+-]?\d+$/.test(s))
    return err("Invalid integer string", "INVALID_INTEGER");
  return ok(BigInt(s));
}

function scaledIntToDecimalStringR(
  n: bigint,
  decimals: number
): Result<string> {
  if (!isValidDecimals(decimals))
    return err("Invalid decimals", "INVALID_DECIMALS");
  const neg = n < BIGINT_ZERO;
  const abs = neg ? -n : n;
  const scale = pow10n(decimals);
  const q = abs / scale;
  let r = (abs % scale).toString();
  if (decimals === 0) return ok((neg ? "-" : "") + q.toString());
  if (r.length < decimals) r = "0".repeat(decimals - r.length) + r;
  const s = `${q}.${r}`;
  return ok(neg ? `-${s}` : s);
}

function toSafeNumberR(s: string, allowUnsafe: boolean): Result<number> {
  const clean = s.replace("-", "").replace(".", "");
  if (!allowUnsafe && clean.length > 15) {
    return err("Unsafe to represent as JS number", "UNSAFE_NUMBER");
  }
  return ok(Number(s));
}

function groupInteger(i: string): string {
  return i.replace(
    /^(-?)(\d+)/,
    (_, sign: string, digits: string) =>
      sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
}

/* ─────────────────────────────── public API ─────────────────────────────── */

export function toBase<O extends OutputType = "bigint">(
  opts: ParentToBaseOpts & { output?: O }
): Result<O extends "bigint" ? bigint : O extends "string" ? string : number> {
  const decimals =
    "assetId" in opts ? assetSpecs[opts.assetId]?.decimal : opts.decimals;
  if (!isValidDecimals(decimals))
    return err("Invalid decimals", "INVALID_DECIMALS") as any;

  const decimalStr = toDecimalString(opts.value);
  const biR = decimalToScaledIntR(
    decimalStr,
    decimals,
    opts.rounding ?? "round"
  );
  if (!biR.ok) return biR as any;

  if ((opts.output ?? "bigint") === "bigint") return ok(biR.value) as any;
  if (opts.output === "string") return ok(biR.value.toString()) as any;

  const nR = toSafeNumberR(biR.value.toString(), !!opts.allowUnsafeNumber);
  return nR.ok ? (ok(nR.value) as any) : (nR as any);
}

export function toParent<O extends Exclude<OutputType, "bigint"> = "string">(
  opts: BaseToParentOpts & { output?: O }
): Result<O extends "string" ? string : number> {
  const decimals =
    "assetId" in opts ? assetSpecs[opts.assetId]?.decimal : opts.decimals;
  if (!isValidDecimals(decimals))
    return err("Invalid decimals", "INVALID_DECIMALS") as any;

  const biR = toBigIntStrictR(opts.value);
  if (!biR.ok) return biR as any;

  const sR = scaledIntToDecimalStringR(biR.value, decimals);
  if (!sR.ok) return sR as any;

  let s = sR.value;
  if (decimals > 0) {
    const [i, f = ""] = s.split(".");
    if (opts.fixed != null) {
      const fixed = Math.max(0, Math.min(decimals, opts.fixed));
      s = fixed > 0 ? `${i}.${f.padEnd(decimals, "0").slice(0, fixed)}` : i;
    } else if (opts.trim ?? true) {
      const fTrim = f.replace(/0+$/, "");
      s = fTrim.length ? `${i}.${fTrim}` : i;
    }
  }
  if (opts.group) {
    const [i, f] = s.split(".");
    s = f ? `${groupInteger(i)}.${f}` : groupInteger(i);
  }
  if ((opts.output ?? "string") === "string") return ok(s) as any;
  const nR = toSafeNumberR(s, !!opts.allowUnsafeNumber);
  return nR.ok ? (ok(nR.value) as any) : (nR as any);
}

export function formatParent(
  value: string | number | bigint,
  opts: AmountOpts & {
    minFraction?: number;
    maxFraction?: number;
    group?: boolean;
  } = { decimals: 0 }
): Result<string> {
  const decimals =
    "assetId" in opts ? assetSpecs[opts.assetId]?.decimal : opts.decimals;
  if (!isValidDecimals(decimals))
    return err("Invalid decimals", "INVALID_DECIMALS");
  const minF = Math.max(0, Math.min(decimals, opts.minFraction ?? 0));
  const maxF = Math.max(minF, Math.min(decimals, opts.maxFraction ?? decimals));
  const sR = toParent({ value, decimals, output: "string", trim: false });
  if (!sR.ok) return sR;
  const [i, f = ""] = sR.value.split(".");
  const fTrim = f.slice(0, maxF).replace(/0+$/, "");
  const fFinal = fTrim.padEnd(minF, "0");
  let out = fFinal ? `${i}.${fFinal}` : i;
  if (opts.group) out = groupInteger(out);
  return ok(out);
}

/* ─────────────────────────────── Facade API (amount) ─────────────────────────────── */

export type ToBaseOp<O extends OutputType = "bigint"> = ParentToBaseOpts & {
  op: "toBase";
  output?: O;
};
export type ToParentOp<O extends Exclude<OutputType, "bigint"> = "string"> =
  BaseToParentOpts & { op: "toParent"; output?: O };
export type FormatOp = AmountOpts & {
  op: "format";
  value: string | number | bigint;
  minFraction?: number;
  maxFraction?: number;
  group?: boolean;
};

export type AmountOp = ToBaseOp<any> | ToParentOp<any> | FormatOp;

export function amount<O extends OutputType = "bigint">(
  opts: ToBaseOp<O>
): Result<O extends "bigint" ? bigint : O extends "string" ? string : number>;
export function amount<O extends Exclude<OutputType, "bigint"> = "string">(
  opts: ToParentOp<O>
): Result<O extends "string" ? string : number>;
export function amount(opts: FormatOp): Result<string>;
export function amount(opts: AmountOp): any {
  switch (opts.op) {
    case "toBase":
      return toBase(opts as any);
    case "toParent":
      return toParent(opts as any);
    case "format":
      return formatParent(opts.value, opts as any);
    default:
      return err("Unsupported op", "GENERIC");
  }
}
