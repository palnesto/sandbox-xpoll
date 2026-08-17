import {
  getEnabledCryptoPrice,
  getEnabledFiatPrice,
  type AssetBuyConfig,
} from "@/lib/payments/buy-config";

export type CoinAsset = {
  _id?: string;
  assetType?: string;
  assetId?: string;
  name: string;
  symbol: string;
  decimal: number;
  parent?: string;
  parentSymbol?: string;
  buyConfig?: AssetBuyConfig | null;
};

export type AssetMarketCard = {
  id: string;
  buyConfig: AssetBuyConfig | null;
  decimal: number;
  displayName: string;
  displaySymbol: string;
  iconUrl: string | null;
  isBuyable: boolean;
  minTokens: number;
  name: string;
  ownedAmount: string;
  parentLabel: string;
  symbol: string;
  usdPricing: ReturnType<typeof getEnabledFiatPrice>;
  usdcPricing: ReturnType<typeof getEnabledCryptoPrice>;
};
