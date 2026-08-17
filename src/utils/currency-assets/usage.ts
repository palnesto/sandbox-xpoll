import {
  amount,
  unwrapOr,
  unwrapString,
  unwrapNumber,
  unwrapBigInt,
} from "./base";
import { ASSETS } from "./asset";

function demo() {
  const baseR = amount({
    op: "toBase",
    assetId: ASSETS.X_MYST,
    value: "1.23456789",
    output: "bigint",
  });
  console.log("toBase bigint:", unwrapBigInt(baseR));

  const baseStrR = amount({
    op: "toBase",
    assetId: ASSETS.X_MYST,
    value: "42.01",
    output: "string",
  });
  console.log("toBase string:", unwrapString(baseStrR));

  const parentR = amount({
    op: "toParent",
    assetId: ASSETS.X_MYST,
    value: "123456789",
    output: "string",
    trim: true,
    group: true,
  });
  console.log("toParent string:", unwrapString(parentR));

  const parentNumR = amount({
    op: "toParent",
    assetId: ASSETS.X_MYST,
    value: BigInt("1234567890000000"),
    output: "number",
    allowUnsafeNumber: true,
  });
  console.log("toParent number:", unwrapNumber(parentNumR));

  const fmtR = amount({
    op: "format",
    assetId: ASSETS.X_MYST,
    value: "1234.56789",
    minFraction: 2,
    maxFraction: 4,
    group: true,
  });
  console.log("format:", unwrapString(fmtR));

  const badR = amount({
    op: "toBase",
    assetId: ASSETS.X_MYST,
    value: "not-a-number",
    output: "bigint",
  });
  if (!badR.ok) {
    console.warn("Error converting:", badR.error, badR.code);
  }

  const fallback = unwrapOr(badR, BigInt(999));
  console.log("with fallback:", fallback);
}

console.log(
  "xpoll test",
  amount({
    op: "toBase",
    assetId: ASSETS.X_POLL,
    value: "9,900",
    output: "string",
  }),
  "0",
);
demo();
