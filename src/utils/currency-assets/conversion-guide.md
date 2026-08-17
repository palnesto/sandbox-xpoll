---

# 🧭 When to use which function

## 1) “User typed an amount; I need to store/send it”

- **Use**: `toBase` (or `amount({ op: "toBase", ... })`)
- **Why**: Converts _parent/human_ input like `"1.23"` into _base/least units_ as a `bigint` (lossless).
- **Tip**: Pass `assetId` (preferred) or explicit `decimals`. Choose `rounding: "round"` (default) or `"truncate"` if you must cut extra digits.

```ts
const base = unwrapBigInt(
  toBase({ assetId: ASSETS.X_MYST, value: "1.23456789", rounding: "round" }),
  0n
);
// -> 1234567890n
```

---

## 2) “I have a base amount; I want to show it to the user”

- **Use**: `toParent` (or `amount({ op: "toParent", ... })`)
- **Why**: Converts _base/least units_ to a clean _parent/human_ string, like `"1.23456789"`.
- **Tip**: Add `group: true` for commas; use `fixed: N` to _force_ exactly N decimals; or leave default to trim trailing zeros.

```ts
const s = unwrapString(
  toParent({ assetId: ASSETS.X_MYST, value: 1234567890n, group: true }),
  "—"
);
// -> "1.23456789"
```

---

## 3) “I want a nice compact display (min/max decimals)”

- **Use**: `formatParent` (or `amount({ op: "format", ... })`)
- **Why**: Clamps the visible decimals: pad up to `minFraction`, trim down to `maxFraction` (good for tables/cards).

```ts
const pretty = unwrapString(
  formatParent(1234567890n, {
    assetId: ASSETS.X_MYST,
    minFraction: 2,
    maxFraction: 6,
    group: true,
  }),
  "—"
);
// -> "1.234568"
```

---

## 4) “I need the **integer** and **decimal** parts separately for typography”

- **Use**: `getBaseParts` / `getParentParts`

  - If you start from **base/least units** → `getBaseParts`
  - If you start from **human/parent** string/number → `getParentParts`

- **Why**: Splits into `{ sign, integer, decimal }`. Control decimals with `digits` and `digitsMode: "pad" | "trim"`.

```ts
// From base: pad fraction to 4 digits
const parts = unwrapOr(
  getBaseParts(1234567890n, {
    assetId: ASSETS.X_MYST,
    digits: 4,
    digitsMode: "pad",
  }),
  { sign: "", integer: "—", decimal: "" }
);
// -> { sign: "", integer: "1", decimal: "2346" }
```

---

## 5) “I only need the integer OR the decimal substring”

- **Use**:

  - Integer only: `getBaseIntegerPart` / `getParentIntegerPart`
  - Decimal only: `getBaseDecimalPart` / `getParentDecimalPart`

- **Why**: Cleaner templates; fewer conditionals.

```ts
unwrapString(getParentIntegerPart("-1000.4", { group: true }), "—"); // "-1,000"
unwrapString(
  getBaseDecimalPart(1234567890n, {
    assetId: ASSETS.X_MYST,
    digits: 2,
    digitsMode: "trim",
  }),
  "00"
); // "23"
```

---

## 6) “I want **one** API for everything”

- **Use**: `amount({ op: ... })` facade
- **Why**: One entry point; you pick the operation.

```ts
unwrapBigInt(
  amount({ op: "toBase", assetId: ASSETS.X_MYST, value: "1.23" }),
  0n
);
unwrapString(
  amount({
    op: "toParent",
    assetId: ASSETS.X_MYST,
    value: 1230000000n,
    group: true,
  }),
  "—"
);
unwrapString(
  amount({
    op: "format",
    assetId: ASSETS.X_MYST,
    value: 1234567890n,
    minFraction: 2,
    maxFraction: 6,
  }),
  "—"
);
unwrapOr(
  amount({
    op: "parts",
    mode: "base",
    assetId: ASSETS.X_MYST,
    value: 1234567890n,
    digits: 4,
  }),
  { sign: "", integer: "—", decimal: "" }
);
unwrapString(
  amount({ op: "integerPart", mode: "parent", value: "-999.5", group: true }),
  "—"
);
unwrapString(
  amount({
    op: "decimalPart",
    mode: "parent",
    value: "12.3",
    digits: 2,
    digitsMode: "pad",
  }),
  "00"
);
```

---

## 7) “I need a **number** (charting, quick math)”

- **Use**: `toParent({ output: "number", allowUnsafeNumber: true })` (or `amount` facade)
- **Why**: Numbers beyond \~15 digits can lose precision; only do this when _approximate_ is OK. For exact math, always use **base BigInt**.

```ts
const n = unwrapNumber(
  toParent({
    assetId: ASSETS.X_MYST,
    value: 1234567890n,
    output: "number",
    allowUnsafeNumber: true,
  }),
  NaN
);
// -> 1.23456789  (approx OK)
```

---

## 8) “What should I pass: `assetId` or `decimals`?”

- **Use**: `assetId` whenever possible → decimals come from your `assetSpecs` (single source of truth).
- **Use**: `decimals` only for ad-hoc conversions that aren’t tied to a known asset.

---

## 9) “How do I handle bad input without breaking UI?”

- **Use**: the `unwrap*` helpers with sensible fallbacks (`"—"`, `0n`, `NaN`).
- **Why**: Every function returns a `Result<T>` (no throws). Your UI stays stable.

```ts
const s = unwrapString(
  toParent({ assetId: ASSETS.X_MYST, value: "not-a-number" }),
  "—"
); // "—"
```

---

## 10) Quick rules of thumb

- **Store & compute** in **base BigInt** (`toBase` → `bigint`).
- **Display** with **`toParent`** (exact string) or **`formatParent`** (nice string).
- **Style digits** with **`get*Parts`** helpers.
- **One-stop**: use **`amount({ op: ... })`**.
- **Rounding**: default `"round"`. Use `"truncate"` if you must cut extra digits.
- **Numbers**: only when you accept precision trade-offs; otherwise prefer `string`/`bigint`.

Great question 👌 Let me break it down simply.

---

## What "unwrap" means

All your conversion functions return a `Result<T>` type:

```ts
type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string; code?: ErrCode };
type Result<T> = Ok<T> | Err;
```

That means:

- ✅ On success, you get `{ ok: true, value: ... }`.
- ❌ On failure, you get `{ ok: false, error: "...", code: "..." }`.

If you use the raw result, you always need to check:

```ts
const r = toBase({ ... });
if (r.ok) {
  console.log(r.value);
} else {
  console.error(r.error);
}
```

That’s safe, but **too verbose** for UI code.
So we added `unwrap...()` helpers to make this **shorter**.

---

## The four helpers

### 1. `unwrapOr`

- Generic: works with any type.
- Lets you give a **fallback value** if conversion fails.

```ts
const r = amount({ op: "toBase", ... });
const base = unwrapOr(r, BigInt(0));
// → if r.ok → base is r.value
// → if r.error → base is 0n
```

### 2. `unwrapString`

- Specialised for `Result<string>`.
- Default fallback is `"—"` (a dash).

```ts
const r = amount({ op: "toParent", output: "string", ... });
const display = unwrapString(r); // "123.45" or "—"
```

Perfect for showing values in UI labels.

---

### 3. `unwrapNumber`

- Specialised for `Result<number>`.
- Default fallback is `NaN`.

```ts
const r = amount({ op: "toParent", output: "number", ... });
const num = unwrapNumber(r); // usable in charts
```

---

### 4. `unwrapBigInt`

- Specialised for `Result<bigint>`.
- Default fallback is `0n`.

```ts
const r = amount({ op: "toBase", output: "bigint", ... });
const bi = unwrapBigInt(r); // bigint for DB writes
```

---

## When to use which

- **In business logic (backend/frontend data layer):**
  Use `unwrapBigInt` when writing to DB or ledger.
  Use `unwrapNumber` if you need a JS number for math/graphs.
  Use `unwrapString` if you need a formatted string for API/UI.

- **In UI components (labels, inputs):**
  Use `unwrapString` almost always (users see `—` instead of errors).

- **In generic helper functions:**
  Use `unwrapOr` if you want to control your own fallback explicitly.

---

⚡TL;DR:

- `unwrapOr`: fallback you choose.
- `unwrapString`: string with `"—"` default.
- `unwrapNumber`: number with `NaN` default.
- `unwrapBigInt`: bigint with `0n` default.

---

Do you want me to also add **example snippets into your `usage.ts`** showing _each unwrap helper_ side by side (so devs see the differences right away)?
