import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import {
  getCheckoutErrorMessage,
  getDefaultCheckoutRail,
  type CheckoutRail,
} from "@/components/payment/checkout-core";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import type { AssetType } from "@/utils/currency-assets/asset";
import type { AssetMarketCard, CoinAsset } from "./types";

export const MAX_TOKENS_PER_ORDER = 5000;

export function normalizeAssetId(asset: CoinAsset) {
  return asset.assetType || asset.assetId || asset._id || "";
}

export function getErrorMessage(error: unknown, fallback: string) {
  return getCheckoutErrorMessage(error, fallback);
}

export function getApiData<T>(value: unknown): T | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as { data?: { data?: T } | T };
  return (record.data as { data?: T } | undefined)?.data ?? (record.data as T) ?? null;
}

function isRouteQuery(key: unknown): key is string {
  return typeof key === "string";
}

export function getDefaultRail(asset: AssetMarketCard | null): CheckoutRail | null {
  if (!asset) return null;
  return getDefaultCheckoutRail({
    hasFiat: Boolean(asset.usdPricing),
    hasCrypto: Boolean(asset.usdcPricing),
  });
}

export function validateQuantity(
  asset: AssetMarketCard | null,
  quantityInput: string,
): string | null {
  if (!asset) return "Select an asset to continue.";

  const quantity = Number(quantityInput);
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
    return "Enter a whole number of tokens.";
  }
  if (quantity < asset.minTokens) {
    return `Minimum order is ${asset.minTokens} tokens.`;
  }
  if (quantity > MAX_TOKENS_PER_ORDER) {
    return `Maximum order is ${MAX_TOKENS_PER_ORDER} tokens.`;
  }

  return null;
}

export function formatUsd(minor: number | null) {
  if (!minor || !Number.isFinite(minor)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(minor / 100);
}

export function formatOwnedAmount(assetId: AssetType, value: string | number | bigint) {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value,
      output: "string",
      trim: true,
      group: true,
    }),
    "0",
  );
}

export async function invalidateAssetPurchaseQueries(paymentId?: string | null) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [endpoints.profile.me] }),
    queryClient.invalidateQueries({ queryKey: [endpoints.assets.getAssetsInfo] }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        isRouteQuery(queryKey[0]) &&
        queryKey[0].startsWith(endpoints.assets.getLedgers),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        isRouteQuery(queryKey[0]) &&
        queryKey[0].startsWith(endpoints.campaigns.allPayments),
    }),
    paymentId
      ? queryClient.invalidateQueries({
          queryKey: [endpoints.payment.getPaymentById(paymentId)],
        })
      : Promise.resolve(),
  ]);
}

export function getAssetRailSummary(asset: AssetMarketCard) {
  const rails = [
    asset.usdPricing ? "Card" : null,
    asset.usdcPricing ? "USDC" : null,
  ].filter(Boolean) as string[];
  return rails.join(" • ") || "Unavailable";
}
