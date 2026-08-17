import type { AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";

export function baseToParentGrouped(
  assetId: AssetType,
  baseVal: string | number,
  fixed = 3,
) {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: false,
      fixed,
    }),
    "0",
  );
}

export function isDataUrl(s: unknown): s is string {
  return typeof s === "string" && s.startsWith("data:");
}

export async function dataUrlToFile(
  dataUrl: string,
  filename = "upload.png",
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function previewUrl(v: string | File | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  return URL.createObjectURL(v);
}
