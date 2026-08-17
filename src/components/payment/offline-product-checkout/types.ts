import type { PurchasableBuyConfig } from "@/lib/payments/buy-config";

export type OfflineProductPurpose =
  | "soul-bound-subscription"
  | "ad-experience-subscription"
  | "web3-launch-campaign";

export type OfflineProduct = {
  _id: OfflineProductPurpose;
  name: string;
  description: string;
  features: string[];
  ctaText: string;
  buyConfig: PurchasableBuyConfig | null;
  isActive?: boolean;
};
