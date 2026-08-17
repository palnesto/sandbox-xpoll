import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

import {
  AssetMetric,
  CheckoutSection,
  FooterButton,
  NoticePanel,
  SummaryRows,
} from "@/components/payment/checkout-ui";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import { shortenWalletAddress } from "@/lib/payments/wallet";
import type { CheckoutRail } from "@/components/payment/checkout-core";
import type { AssetMarketCard } from "./types";
import { formatUsd } from "./utils";

type ReviewStepProps = {
  selectedRail: CheckoutRail;
  selectedAsset: AssetMarketCard | null;
  quantity: number | null;
  usdTotalMinor: number | null;
  usdcTotalMinor: number | null;
  address?: string;
  networkLabel: string;
  requestError: string | null;
  cryptoStatusText: string | null;
  cryptoError: string | null;
  isCryptoPending: boolean;
  hasCryptoIntent: boolean;
  isStripeStarting: boolean;
  onBackToWallet: () => void;
  onBackToConfigure: () => void;
  onPayWithCrypto: () => void;
  onStartStripeCheckout: () => void;
};

export function ReviewStep(props: ReviewStepProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
      <CheckoutSection
        title="Review your order"
        caption={
          props.selectedRail === "crypto"
            ? "Check the details before you approve and pay from your wallet."
            : "Check the details before you continue to card payment."
        }
      >
        <SummaryRows
          rows={[
            {
              label: "Data Asset",
              value: props.selectedAsset?.parentLabel ?? "--",
            },
            {
              label: "Quantity",
              value:
                props.quantity != null
                  ? `${props.quantity.toLocaleString()} tokens`
                  : "--",
            },
            {
              label: "Payment method",
              value:
                props.selectedRail === "crypto"
                  ? "USDC wallet"
                  : "Card / Stripe",
            },
            props.selectedRail === "crypto"
              ? {
                  label: "Wallet amount",
                  value:
                    props.usdcTotalMinor != null
                      ? `${formatTokenAmountFromMinor(
                          props.usdcTotalMinor,
                          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                        )} USDC`
                      : "Unavailable",
                }
              : {
                  label: "Card amount",
                  value: formatUsd(props.usdTotalMinor) ?? "Unavailable",
                },
          ]}
        />

        {props.selectedRail === "crypto" ? (
          <div className="mt-5 grid gap-3">
            <AssetMetric
              label="Wallet"
              value={shortenWalletAddress(props.address)}
            />
            <AssetMetric label="Network" value={props.networkLabel} />
            <AssetMetric
              label="Amount due"
              value={
                props.usdcTotalMinor != null
                  ? `${formatTokenAmountFromMinor(
                      props.usdcTotalMinor,
                      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                    )} USDC`
                  : "Unavailable"
              }
              caption="Paid from your wallet"
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <AssetMetric
              label="Rate"
              value={
                props.selectedAsset?.usdPricing
                  ? formatUsd(props.selectedAsset.usdPricing.entry.rateInMinor)
                  : "Unavailable"
              }
              caption="Per token"
            />
            <AssetMetric
              label="Min order"
              value={`${props.selectedAsset?.minTokens ?? "-"} tokens`}
            />
            <AssetMetric
              label="Checkout"
              value="Stripe"
              caption="Secure card form"
            />
          </div>
        )}
      </CheckoutSection>

      <CheckoutSection
        title={props.selectedRail === "crypto" ? "Payment" : "Card payment"}
        caption={
          props.selectedRail === "crypto"
            ? "Your wallet may ask you to confirm one or more actions to complete the purchase."
            : "The next step opens the secure card form in this same checkout."
        }
      >
        {props.requestError ? (
          <div className="mb-4">
            <NoticePanel
              tone="danger"
              title="We couldn't continue"
              description={props.requestError}
            />
          </div>
        ) : null}

        {props.selectedRail === "crypto" ? (
          <>
            {props.cryptoStatusText ? (
              <NoticePanel
                tone="neutral"
                title="Payment in progress"
                description={props.cryptoStatusText}
              />
            ) : null}

            {props.cryptoError ? (
              <div className="mt-4">
                <NoticePanel
                  tone="danger"
                  title="Payment failed"
                  description={props.cryptoError}
                />
              </div>
            ) : null}

            <div className="mt-5 rounded-[24px] border border-black/10 bg-[#f9faf8] p-4">
              <div className="flex items-center gap-3 text-[#132238]">
                <ShieldCheck className="h-5 w-5 text-[#0f766e]" />
                <span className="font-semibold">
                  Your wallet may ask for approval
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-black/55">
                In some cases, you may need to approve USDC before the payment
                can be completed.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <FooterButton
                type="button"
                variant="outline"
                onClick={props.onBackToWallet}
                disabled={props.isCryptoPending}
              >
                Back to wallet step
              </FooterButton>
              <FooterButton
                type="button"
                className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                disabled={props.isCryptoPending || !props.hasCryptoIntent}
                onClick={props.onPayWithCrypto}
              >
                {props.isCryptoPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing wallet payment
                  </>
                ) : (
                  <>
                    Pay{" "}
                    {props.usdcTotalMinor != null
                      ? `${formatTokenAmountFromMinor(
                          props.usdcTotalMinor,
                          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                        )} USDC`
                      : "with USDC"}
                  </>
                )}
              </FooterButton>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <NoticePanel
              tone="neutral"
              title="Secure card form is next"
              description="If you want to change the quantity or payment method, go back before continuing."
            />

            <div className="flex flex-col gap-3">
              <FooterButton
                type="button"
                variant="outline"
                onClick={props.onBackToConfigure}
              >
                Back to checkout
              </FooterButton>
              <FooterButton
                type="button"
                className="bg-[#132238] text-white hover:bg-[#0f172a]"
                disabled={props.isStripeStarting}
                onClick={props.onStartStripeCheckout}
              >
                {props.isStripeStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating secure payment
                  </>
                ) : (
                  <>
                    Continue to secure payment
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </FooterButton>
            </div>
          </div>
        )}
      </CheckoutSection>
    </div>
  );
}
