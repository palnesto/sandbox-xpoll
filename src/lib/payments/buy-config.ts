export type BuyConfigPricingEntry = {
  enable: boolean;
  rateInMinor: number;
};

export type PaymentRailBuyConfig = {
  enable: boolean;
  pricing: Record<string, BuyConfigPricingEntry>;
};

export type SubscriptionCadenceConfig = {
  intervalUnit: "day" | "month";
  intervalCount: number;
} | null;

export type SubscriptionBuyConfig = {
  enable: boolean;
  cadence: SubscriptionCadenceConfig;
  fiat: PaymentRailBuyConfig;
  crypto: PaymentRailBuyConfig;
};

export type PurchasableBuyConfig = {
  enable: boolean;
  fiat: PaymentRailBuyConfig;
  crypto: PaymentRailBuyConfig;
  subscription: SubscriptionBuyConfig;
};

export type AssetBuyConfig = PurchasableBuyConfig & {
  minParentTokensPerOrder: number;
};

export const BUY_CONFIG_CRYPTO_TOKEN_KEYS = {
  USDC: "USDC",
} as const;

export const BUY_CONFIG_CRYPTO_DECIMALS = {
  USDC: 6,
} as const;

export type ResolvedPricingEntry = {
  key: string;
  entry: BuyConfigPricingEntry;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePricingEntry(value: unknown): BuyConfigPricingEntry | null {
  if (!isRecord(value)) return null;
  if (value.enable !== true && value.enable !== false) return null;
  if (!Number.isFinite(value.rateInMinor)) return null;

  return {
    enable: value.enable === true,
    rateInMinor: Number(value.rateInMinor),
  };
}

function normalizePricingMap(
  value: unknown,
): Record<string, BuyConfigPricingEntry> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [
        String(key).trim().toUpperCase(),
        normalizePricingEntry(entry),
      ] as const)
      .filter(([, entry]) => entry !== null),
  ) as Record<string, BuyConfigPricingEntry>;
}

function normalizeRailConfig(value: unknown): PaymentRailBuyConfig | null {
  if (!isRecord(value)) {
    return {
      enable: false,
      pricing: {},
    };
  }

  return {
    enable: value.enable === true,
    pricing: normalizePricingMap(value.pricing),
  };
}

export function normalizePurchasableBuyConfig(
  value: unknown,
): PurchasableBuyConfig | null {
  if (!isRecord(value)) return null;

  const fiat = normalizeRailConfig(value.fiat);
  const crypto = normalizeRailConfig(value.crypto);
  const subscriptionValue = isRecord(value.subscription) ? value.subscription : {};
  const subscriptionFiat = normalizeRailConfig(subscriptionValue.fiat);
  const subscriptionCrypto = normalizeRailConfig(subscriptionValue.crypto);

  // The UI reads a normalized object so pages do not each implement their own
  // nested enable + pricing guards.
  return {
    enable: value.enable === true,
    fiat,
    crypto,
    subscription: {
      enable: subscriptionValue.enable === true,
      cadence:
        isRecord(subscriptionValue.cadence) &&
        (subscriptionValue.cadence.intervalUnit === "day" ||
          subscriptionValue.cadence.intervalUnit === "month") &&
        Number.isInteger(subscriptionValue.cadence.intervalCount) &&
        Number(subscriptionValue.cadence.intervalCount) > 0
          ? {
              intervalUnit: subscriptionValue.cadence.intervalUnit,
              intervalCount: Number(subscriptionValue.cadence.intervalCount),
            }
          : null,
      fiat: subscriptionFiat,
      crypto: subscriptionCrypto,
    },
  };
}

export function normalizeAssetBuyConfig(value: unknown): AssetBuyConfig | null {
  const buyConfig = normalizePurchasableBuyConfig(value);
  if (!buyConfig) return null;
  if (!isRecord(value) || !Number.isInteger(value.minParentTokensPerOrder)) {
    return null;
  }

  return {
    ...buyConfig,
    minParentTokensPerOrder: Number(value.minParentTokensPerOrder),
  };
}

function getEnabledRailPrice(
  buyConfig: PurchasableBuyConfig,
  rail: PaymentRailBuyConfig | undefined,
  key: string,
): ResolvedPricingEntry | null {
  if (!buyConfig.enable || !rail?.enable) return null;

  const normalizedKey = String(key).trim().toUpperCase();
  const entry = rail.pricing[normalizedKey];
  if (!entry?.enable) return null;
  if (!Number.isFinite(entry.rateInMinor) || entry.rateInMinor <= 0) {
    return null;
  }

  return {
    key: normalizedKey,
    entry,
  };
}

export function getEnabledFiatPrice(
  value: unknown,
  currency: string,
): ResolvedPricingEntry | null {
  const buyConfig = normalizePurchasableBuyConfig(value);
  if (!buyConfig) return null;
  return getEnabledRailPrice(buyConfig, buyConfig.fiat, currency);
}

export function getEnabledCryptoPrice(
  value: unknown,
  tokenSymbol: string,
): ResolvedPricingEntry | null {
  const buyConfig = normalizePurchasableBuyConfig(value);
  if (!buyConfig) return null;
  return getEnabledRailPrice(buyConfig, buyConfig.crypto, tokenSymbol);
}

export function getEnabledSubscriptionCryptoPrice(
  value: unknown,
  tokenSymbol: string,
): ResolvedPricingEntry | null {
  const buyConfig = normalizePurchasableBuyConfig(value);
  if (!buyConfig || !buyConfig.enable || !buyConfig.subscription.enable) {
    return null;
  }
  return getEnabledRailPrice(
    {
      ...buyConfig,
      enable: true,
      crypto: buyConfig.subscription.crypto,
    },
    buyConfig.subscription.crypto,
    tokenSymbol,
  );
}

export function formatTokenAmountFromMinor(
  amountMinor: number,
  decimals: number,
): string {
  if (!Number.isFinite(amountMinor)) return "0";

  const divisor = 10 ** decimals;
  const amount = Number(amountMinor) / divisor;

  // Trailing zeros are trimmed so "1.000000" becomes "1", which reads better
  // in payment buttons and compact plan/subscription summaries.
  return amount
    .toFixed(decimals)
    .replace(/\.?0+$/, "");
}
