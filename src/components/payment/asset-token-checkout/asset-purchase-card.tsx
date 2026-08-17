import { Coins, Wallet, CreditCard } from "lucide-react";
import { FooterButton } from "@/components/payment/checkout-ui";
import { Badge } from "@/components/ui/badge";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import type { AssetMarketCard } from "./types";
import { formatUsd, getAssetRailSummary } from "./utils";

type AssetPurchaseCardProps = {
  asset: AssetMarketCard;
  onBuy: (assetId: string) => void;
};

export function AssetPurchaseCard({ asset, onBuy }: AssetPurchaseCardProps) {
  const fiatRate = asset.usdPricing
    ? formatUsd(asset.usdPricing.entry.rateInMinor)
    : null;

  const usdcRate = asset.usdcPricing
    ? `${formatTokenAmountFromMinor(
        asset.usdcPricing.entry.rateInMinor,
        BUY_CONFIG_CRYPTO_DECIMALS.USDC,
      )} USDC`
    : null;

  return (
    <article className="group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm transition-all hover:border-[#0f766e]/30 hover:shadow-md">
      {/* Subtle hover accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f1f7f5]/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex flex-col p-5 lg:flex-row lg:items-center lg:gap-8 lg:p-6">
        {/* 1. Identity: Prevents truncation, expands vertically if needed */}
        <div className="flex shrink-0 items-center gap-4 lg:w-[280px]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f4f8f6] shadow-sm ring-1 ring-black/5">
            {asset.iconUrl ? (
              <img
                src={asset.iconUrl}
                alt=""
                className="h-10 w-10 object-contain"
              />
            ) : (
              <Coins className="h-6 w-6 text-[#0f766e]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-serif text-lg font-bold leading-tight text-[#132238]">
                {asset.parentLabel}
              </h3>
              <Badge className="h-5 shrink-0 border-[#0f766e]/20 bg-[#eef8f5] px-1.5 text-[9px] font-bold text-[#0f766e]">
                LIVE
              </Badge>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {asset.displayName} • {asset.displaySymbol}
            </p>
          </div>
        </div>

        {/* 2. Stats Section: Balanced horizontal layout */}
        <div className="mt-6 flex flex-1 flex-wrap items-center gap-x-10 gap-y-4 border-t border-slate-100 pt-6 lg:mt-0 lg:border-none lg:pt-0">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Balance
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {asset.ownedAmount.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Min Order
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {asset.minTokens.toLocaleString()}{" "}
              <span className="text-[9px] text-slate-400">TOKENS</span>
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <CreditCard className="h-3 w-3" /> Card Rate
            </div>
            <p className="whitespace-nowrap text-base font-bold text-[#132238]">
              {fiatRate || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0f766e]">
              <Wallet className="h-3 w-3" /> Wallet Rate
            </div>
            <p className="whitespace-nowrap text-base font-bold text-[#0f766e]">
              {usdcRate || "—"}
            </p>
          </div>
        </div>

        {/* 3. Action Section: Anchored to the right */}
        <div className="mt-6 flex items-center justify-between gap-6 border-t border-slate-100 pt-6 lg:mt-0 lg:w-[260px] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Accepting
            </span>
            <p className="truncate text-xs font-bold text-slate-600">
              {getAssetRailSummary(asset)}
            </p>
          </div>
          <FooterButton
            type="button"
            className="h-12 shrink-0 rounded-2xl bg-[#0f766e] px-8 font-bold text-white shadow-lg shadow-[#0f766e]/20 transition-all hover:bg-[#115e59] active:scale-95"
            onClick={() => onBuy(asset.id)}
          >
            Buy
          </FooterButton>
        </div>
      </div>
    </article>
  );
}
