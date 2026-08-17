import {
  ArrowRight,
  Coins,
  CreditCard,
  Wallet,
  Info,
  Plus,
  Minus,
} from "lucide-react";

import {
  CheckoutSection,
  FooterButton,
  NoticePanel,
  RailOptionCard,
  ResultActions,
} from "@/components/payment/checkout-ui";
import { CryptoPoweredByStrip } from "@/components/payment/crypto-powered-by-strip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import type { CheckoutRail } from "@/components/payment/checkout-core";
import type { AssetMarketCard } from "./types";
import { MAX_TOKENS_PER_ORDER, formatUsd, getDefaultRail } from "./utils";

type ConfigureStepProps = {
  selectedAsset: AssetMarketCard | null;
  quantityInput: string;
  quantity: number | null;
  quantityError: string | null;
  formError: string | null;
  usdTotalMinor: number | null;
  usdcTotalMinor: number | null;
  selectedRail: CheckoutRail | null;
  onQuantityChange: (value: string) => void;
  onRailChange: (rail: CheckoutRail) => void;
  onClose: () => void;
  onContinue: () => void;
};

export function ConfigureStep(props: ConfigureStepProps) {
  const asset = props.selectedAsset;

  return (
    <div className="grid gap-6 lg:grid-cols-[400px,1fr] xl:grid-cols-[440px,1fr]">
      {/* LEFT COLUMN: Asset Identity & Market Rates */}
      <div className="space-y-6">
        <div className="sticky top-6 space-y-6">
          <CheckoutSection
            title="Selected Data Asset"
            caption="Review data asset details and current market rates."
          >
            {asset ? (
              <div className="rounded-[32px] border border-slate-100 bg-[#f8fbfa]/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                    {asset.iconUrl ? (
                      <img
                        src={asset.iconUrl}
                        alt=""
                        className="h-11 w-11 object-contain"
                      />
                    ) : (
                      <Coins className="h-7 w-7 text-[#0f766e]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-xl font-bold text-[#132238]">
                      {asset.parentLabel}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      {asset.displaySymbol} • {asset.displayName}
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Your Balance
                    </span>
                    <span className="text-sm font-bold text-[#132238]">
                      {asset.ownedAmount}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <CreditCard className="h-3 w-3" /> Card Rate
                      </p>
                      <p className="text-sm font-bold text-[#132238]">
                        {asset.usdPricing
                          ? formatUsd(asset.usdPricing.entry.rateInMinor)
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0f766e]">
                        <Wallet className="h-3 w-3" /> Wallet Rate
                      </p>
                      <p className="text-sm font-bold text-[#0f766e]">
                        {asset.usdcPricing
                          ? `${formatTokenAmountFromMinor(asset.usdcPricing.entry.rateInMinor, BUY_CONFIG_CRYPTO_DECIMALS.USDC)} USDC`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {!asset.isBuyable && (
                  <div className="mt-6">
                    <NoticePanel
                      tone="danger"
                      title="Purchasing Disabled"
                      description="This asset is currently not available for new orders."
                    />
                  </div>
                )}
              </div>
            ) : (
              <Skeleton className="h-[300px] w-full rounded-[32px]" />
            )}
          </CheckoutSection>

          <div className="rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100 mx-0.5">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-xs leading-relaxed text-blue-700">
                Minimum order is{" "}
                <strong>
                  {asset?.minTokens.toLocaleString() ?? "—"} tokens
                </strong>
                . Orders are processed immediately upon payment confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Configuration & Payment */}
      <div className="space-y-8 pt-6">
        {/* Quantity Section */}
        <CheckoutSection
          title="Set Quantity"
          caption="How many tokens would you like to purchase?"
        >
          <div className="space-y-6">
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() =>
                  props.onQuantityChange(
                    String(Math.max((props.quantity ?? 1) - 1, 1)),
                  )
                }
                className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:text-[#0f766e] active:scale-95 disabled:opacity-30"
                disabled={
                  !asset || (props.quantity ?? 0) <= (asset?.minTokens ?? 1)
                }
              >
                <Minus className="h-5 w-5" />
              </button>

              <input
                type="number"
                value={props.quantityInput}
                onChange={(e) => props.onQuantityChange(e.target.value)}
                className="h-16 w-full rounded-2xl border-none bg-slate-50 px-16 text-center text-2xl font-bold text-[#132238] ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-[#0f766e]/20"
                placeholder="0"
              />

              <button
                type="button"
                onClick={() =>
                  props.onQuantityChange(String((props.quantity ?? 0) + 1))
                }
                className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:text-[#0f766e] active:scale-95 disabled:opacity-30"
                disabled={
                  !asset || (props.quantity ?? 0) >= MAX_TOKENS_PER_ORDER
                }
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Select Chips */}
            <div className="flex flex-wrap gap-2">
              {asset ? (
                [asset.minTokens, 100, 500, 1000, MAX_TOKENS_PER_ORDER]
                  .filter(
                    (v) => v >= asset.minTokens && v <= MAX_TOKENS_PER_ORDER,
                  )
                  .map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => props.onQuantityChange(String(value))}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                        props.quantity === value
                          ? "border-[#0f766e] bg-[#0f766e] text-white"
                          : "border-slate-200 bg-white text-slate-500 hover:border-[#0f766e]/40 hover:text-[#0f766e]"
                      }`}
                    >
                      {value === asset.minTokens
                        ? "Min Amount"
                        : value === MAX_TOKENS_PER_ORDER
                          ? "Max Limit"
                          : value.toLocaleString()}
                    </button>
                  ))
              ) : (
                <Skeleton className="h-10 w-full rounded-xl" />
              )}
            </div>

            {(props.formError || props.quantityError) && (
              <NoticePanel
                tone="danger"
                title="Check Quantity"
                description={
                  props.formError ?? props.quantityError ?? "Invalid amount."
                }
              />
            )}
          </div>
        </CheckoutSection>

        {/* Payment Method Section */}
        <CheckoutSection
          title="Payment Method"
          caption="Select your preferred currency and checkout rail."
        >
          <div className="grid gap-4">
            <RailOptionCard
              title="Pay with Card"
              subtitle="Visa, Mastercard, or AMEX"
              value={formatUsd(props.usdTotalMinor) ?? "—"}
              icon={<CreditCard className="h-5 w-5" />}
              active={props.selectedRail === "fiat"}
              disabled={!asset?.usdPricing}
              onClick={() => props.onRailChange("fiat")}
            />
            <RailOptionCard
              title="Pay with Crypto"
              subtitle="USDC via connected wallet"
              value={
                props.usdcTotalMinor != null
                  ? `${formatTokenAmountFromMinor(props.usdcTotalMinor, BUY_CONFIG_CRYPTO_DECIMALS.USDC)} USDC`
                  : "—"
              }
              icon={<Wallet className="h-5 w-5" />}
              active={props.selectedRail === "crypto"}
              disabled={!asset?.usdcPricing}
              footer={
                <CryptoPoweredByStrip
                  active={props.selectedRail === "crypto"}
                />
              }
              onClick={() => props.onRailChange("crypto")}
            />
          </div>
        </CheckoutSection>

        {/* Action Footer */}
        <div className="rounded-[32px] bg-[#132238] p-6 text-white shadow-xl shadow-slate-200">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Total Due
              </p>
              <p className="text-2xl font-bold">
                {props.selectedRail === "crypto"
                  ? props.usdcTotalMinor
                    ? `${formatTokenAmountFromMinor(props.usdcTotalMinor, BUY_CONFIG_CRYPTO_DECIMALS.USDC)} USDC`
                    : "—"
                  : (formatUsd(props.usdTotalMinor) ?? "—")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Asset
              </p>
              <p className="text-sm font-semibold">
                {props.quantity?.toLocaleString() ?? 0} {asset?.displaySymbol}
              </p>
            </div>
          </div>

          <ResultActions>
            <button
              type="button"
              onClick={props.onClose}
              className="text-sm font-bold text-slate-400 transition-colors hover:text-white"
            >
              Cancel Order
            </button>
            <FooterButton
              type="button"
              className="h-14 bg-[#0f766e] px-10 text-base font-bold text-white transition-all hover:bg-[#115e59] active:scale-95 disabled:opacity-50"
              disabled={
                !asset?.isBuyable ||
                Boolean(props.quantityError) ||
                !(props.selectedRail ?? getDefaultRail(asset))
              }
              onClick={props.onContinue}
            >
              Continue to Payment
              <ArrowRight className="ml-2 h-5 w-5" />
            </FooterButton>
          </ResultActions>
        </div>
      </div>
    </div>
  );
}
