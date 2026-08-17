import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";

type ConvertOptions = {
  baseUnit: AssetType;
  value: number | string | bigint;
  type?: "string" | "number";
  truncateFraction?: number;
};

/**
 * Convert base unit (integer) to main unit (decimal string/number).
 * Example: 100000000 with 8 decimals -> "1"
 */
export const convertFromBaseUnit = ({
  baseUnit,
  value,
  type = "string",
  truncateFraction,
}: ConvertOptions): string | number => {
  const decimal = assetSpecs[baseUnit].decimal;
  const raw = BigInt(value);

  const divisor = BigInt(10) ** BigInt(decimal);
  const intPart = raw / divisor;
  const fracPart = raw % divisor;

  if (fracPart === BigInt(0)) {
    return type === "number" ? Number(intPart) : intPart.toString();
  }

  let fracStr = fracPart.toString().padStart(decimal, "0");

  // Apply truncateFraction if provided
  if (truncateFraction !== undefined) {
    fracStr = fracStr.slice(0, truncateFraction);
  }

  // Trim trailing zeros
  const trimmedFrac = fracStr.replace(/0+$/, "");

  const result = trimmedFrac.length
    ? `${intPart.toString()}.${trimmedFrac}`
    : intPart.toString();

  return type === "number" ? Number(result) : result;
};

/**
 * Convert main unit (decimal string/number) to base unit (integer string/number).
 * Example: "1.23" with 2 decimals -> "123"
 */
export const convertToBaseUnit = ({
  baseUnit,
  value,
  type = "string",
}: Omit<ConvertOptions, "truncateFraction">): string | number => {
  const decimal = assetSpecs[baseUnit].decimal;
  const str = typeof value === "number" ? value.toString() : value;

  if (!str.includes(".")) {
    const result = BigInt(str) * BigInt(10) ** BigInt(decimal);
    return type === "number" ? Number(result) : result.toString();
  }

  const [intPart, fracPart = ""] = str.split(".");
  const fracPadded = (fracPart + "0".repeat(decimal)).slice(0, decimal);

  const combined = BigInt(intPart + fracPadded);
  return type === "number" ? Number(combined) : combined.toString();
};
