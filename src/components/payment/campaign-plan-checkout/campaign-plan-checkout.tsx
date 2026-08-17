import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAppKit } from "@reown/appkit/react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  RadioTower,
  ShieldCheck,
  Unplug,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import {
  buildCheckoutResult,
  buildCheckoutSteps,
  mapCryptoCheckoutFlowError,
  type CheckoutRail,
  type CheckoutResult,
  type CheckoutStage,
  type WalletAction,
  type WalletStepNotice,
} from "@/components/payment/checkout-core";
import {
  AnimatedDotsText,
  AssetMetric,
  CheckoutModal,
  CheckoutSection,
  FooterButton,
  NoticePanel,
  RailOptionCard,
  SummaryRows,
} from "@/components/payment/checkout-ui";
import { CryptoPoweredByStrip } from "@/components/payment/crypto-powered-by-strip";
import { PAYMENT_INTENT_PURPOSE } from "@/components/payment/payment-configs";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
  getEnabledCryptoPrice,
  getEnabledFiatPrice,
  getEnabledSubscriptionCryptoPrice,
} from "@/lib/payments/buy-config";
import {
  BILLING_MODE,
  fetchPaymentIntentById,
  type BillingMode,
  getPaymentProviderCode,
  isEvmPaymentIntentResponse,
  isPaymentFlowHandledError,
  PAYMENT_PROVIDER_CODE,
  requestPaymentIntent,
  type EvmPaymentIntentResponse,
  type PaymentFlowError,
  type PaymentIntentRecord,
} from "@/lib/payments/core";
import {
  buildCampaignPlanCheckoutSummary,
  buildCampaignPlanPaymentContext,
  CAMPAIGN_PLAN_CHECKOUT_MODE,
  type CampaignPlanCheckoutMode,
  type CampaignPlanCheckoutSummary,
} from "@/lib/payments/campaign-plan";
import {
  getDefaultEvmPaymentChain,
  getRecurringEvmPaymentChain,
} from "@/lib/payments/evm-network";
import { useEvmUsdcPayment } from "@/lib/payments/useEvmUsdcPayment";
import {
  stripeCardOnlyPaymentElementOptions,
  stripePromise,
  useStripePayment,
} from "@/lib/payments/useStripePayment";
import { shortenWalletAddress, waitForWalletAddress } from "@/lib/payments/wallet";
import { cn } from "@/lib/utils";
import type { CampaignPlan, FormValues } from "@/types/campaigns";
import { isBasicCampaign } from "@/lib/campaign";
import { formatMoneyFromMinor } from "@/utils/currency-plans";
import { getTxExplorerUrl } from "@/utils/txExplorer";
import { clearAddInfoDraftForCampaign } from "@/stores/create-campaign.store";

type CampaignPlanCheckoutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: CampaignPlan | null;
} & (
  | {
      mode?: "create";
      snapshot: FormValues | null;
    }
  | {
      mode: "upgrade";
      campaignId: string;
      campaignName?: string | null;
      campaignGoal?: string | null;
      campaignIsPolitical?: boolean | null;
    }
);

type CryptoBillingMode = BillingMode;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isRouteQuery(key: unknown): key is string {
  return typeof key === "string";
}

function formatUsdMinor(value: number | null) {
  if (value == null) return "—";
  return formatMoneyFromMinor(value, "USD");
}

function getDefaultCampaignRail(input: {
  hasFiat: boolean;
  hasCrypto: boolean;
}): CheckoutRail | null {
  if (input.hasFiat && !input.hasCrypto) return "fiat";
  if (!input.hasFiat && input.hasCrypto) return "crypto";
  return null;
}

function formatCryptoMinor(
  amountMinor: number | null,
  tokenSymbol = BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
) {
  if (amountMinor == null) return "—";
  return `${formatTokenAmountFromMinor(
    amountMinor,
    BUY_CONFIG_CRYPTO_DECIMALS[tokenSymbol as keyof typeof BUY_CONFIG_CRYPTO_DECIMALS],
  )} ${tokenSymbol}`;
}

function getPurchasedCampaignId(payment: PaymentIntentRecord | null) {
  const fulfillmentCampaignId = String(
    (payment as any)?.context?.fulfillment?.campaignId ?? "",
  ).trim();
  if (fulfillmentCampaignId) return fulfillmentCampaignId;

  const directCampaignId = String(
    (payment as any)?.context?.campaignId ?? "",
  ).trim();
  if (directCampaignId) return directCampaignId;

  const subscriptionTargetCampaignId = String(
    payment?.subscription?.target?.entityId ?? "",
  ).trim();
  if (subscriptionTargetCampaignId) return subscriptionTargetCampaignId;

  return null;
}

async function invalidateCampaignPurchaseQueries(
  paymentId?: string | null,
  campaignId?: string | null,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        isRouteQuery(queryKey[0]) &&
        queryKey[0].startsWith(endpoints.campaigns.myCampaigns),
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
    campaignId
      ? queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.getCampaignByIdOwner(campaignId)],
        })
      : Promise.resolve(),
    campaignId
      ? queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.getCampaignByIdUser(campaignId)],
        })
      : Promise.resolve(),
    campaignId
      ? queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.public.getCampaignById(campaignId)],
        })
      : Promise.resolve(),
  ]);

  if (campaignId) {
    await queryClient.refetchQueries({
      queryKey: [endpoints.campaigns.getCampaignByIdOwner(campaignId)],
    });
  }
}

function getStatusPresentation(kind: CheckoutResult["kind"]) {
  if (kind === "success") {
    return {
      title: "Payment Successful",
      badge: "Success",
      cardClassName:
        "border-emerald-300 bg-emerald-200/70 bg-gradient-to-b from-emerald-200 via-emerald-100 to-emerald-200",
      iconWrapClassName:
        "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
      glowClassName: "bg-emerald-400/25",
      icon: CheckCircle2,
      badgeClassName: "bg-emerald-200 text-emerald-900",
    };
  }

  if (kind === "pending") {
    return {
      title: "Payment Pending",
      badge: "Pending",
      cardClassName:
        "border-amber-300 bg-amber-200/70 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200",
      iconWrapClassName:
        "bg-amber-500 text-white shadow-lg shadow-amber-500/25",
      glowClassName: "bg-amber-400/25",
      icon: Clock3,
      badgeClassName: "bg-amber-200 text-amber-900",
    };
  }

  return {
    title: kind === "canceled" ? "Payment Canceled" : "Payment Failed",
    badge: kind === "canceled" ? "Canceled" : "Failed",
    cardClassName:
      kind === "canceled"
        ? "border-slate-300 bg-slate-200/70 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200"
        : "border-rose-300 bg-rose-200/70 bg-gradient-to-b from-rose-200 via-rose-100 to-rose-200",
    iconWrapClassName:
      kind === "canceled"
        ? "bg-slate-600 text-white shadow-lg shadow-slate-600/25"
        : "bg-rose-600 text-white shadow-lg shadow-rose-600/25",
    glowClassName: kind === "canceled" ? "bg-slate-400/25" : "bg-rose-400/25",
    icon: CircleAlert,
    badgeClassName:
      kind === "canceled" ? "bg-slate-200 text-slate-900" : "bg-rose-200 text-rose-900",
  };
}

async function waitForStripeCheckoutResolution(input: {
  paymentId: string;
  attempts?: number;
  intervalMs?: number;
}) {
  const attempts = input.attempts ?? 30;
  const intervalMs = input.intervalMs ?? 2000;
  let lastFetchError: unknown = null;
  let lastObservedPayment: PaymentIntentRecord | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const payment = await fetchPaymentIntentById(input.paymentId);
      lastFetchError = null;
      lastObservedPayment = payment;

      if (payment.status === "succeeded") {
        return payment;
      }
    } catch (error) {
      lastFetchError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (lastFetchError instanceof Error) {
    throw lastFetchError;
  }

  throw new Error(
    lastObservedPayment?.status === "failed" ||
      lastObservedPayment?.status === "canceled"
      ? "Payment confirmation is still catching up."
      : "Payment confirmation timed out on the server.",
  );
}

function CampaignConfigureStep(props: {
  summary: CampaignPlanCheckoutSummary | null;
  checkoutMode: CampaignPlanCheckoutMode;
  selectedPlan: CampaignPlan | null;
  selectedRail: CheckoutRail | null;
  selectedPriceMinor: number | null;
  selectedCryptoPriceMinor: number | null;
  selectedRecurringCryptoPriceMinor: number | null;
  selectedCryptoBillingMode: CryptoBillingMode;
  formError: string | null;
  onRailChange: (rail: CheckoutRail) => void;
  onCryptoBillingModeChange: (mode: CryptoBillingMode) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const recurringAvailable = props.selectedRecurringCryptoPriceMinor != null;
  const isUpgradeMode =
    props.checkoutMode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE;
  return (
    <div className="grid gap-6 lg:grid-cols-[400px,1fr] xl:grid-cols-[440px,1fr]">
      <div className="space-y-6">
        <div className="sticky top-6 space-y-6">
          <CheckoutSection
            title="Campaign summary"
            caption={
              isUpgradeMode
                ? "Review the new plan and this campaign's details before choosing how you want to upgrade."
                : "Review the plan and the campaign details before choosing a payment method."
            }
          >
            <div className="rounded-[32px] border border-slate-100 bg-[#f8fbfa]/50 p-6">
              <h3 className="font-serif text-xl font-bold text-[#132238]">
                {props.summary?.campaignName || "Campaign"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {props.summary?.goal || "No campaign goal provided."}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Plan name
                  </p>
                  <p className="mt-2 text-base font-bold text-[#132238]">
                    {props.selectedPlan?.name ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Campaign type
                  </p>
                  <p className="mt-2 text-base font-bold text-[#132238]">
                    {props.summary?.isPolitical
                      ? "Political"
                      : "Non-political"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {isUpgradeMode ? "Flow" : "Data access"}
                  </p>
                  <p className="mt-2 text-base font-bold text-[#132238]">
                    {isUpgradeMode
                      ? "Upgrade existing campaign"
                      : props.summary?.getDataAccess
                        ? "Yes"
                        : "No"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Duration
                  </p>
                  <p className="mt-2 text-base font-bold text-[#132238]">
                    {props.selectedPlan?.durationDays
                      ? `${props.selectedPlan.durationDays} days`
                      : "Unavailable"}
                  </p>
                </div>
              </div>
            </div>
          </CheckoutSection>
        </div>
      </div>

      <div className="space-y-8 pt-6">
        <CheckoutSection
          title="Payment method"
          caption={
            isUpgradeMode
              ? "Choose the rail you want to use to upgrade this campaign plan."
              : "Choose the rail you want to use to purchase this campaign plan."
          }
        >
          <div className="grid gap-4">
            <RailOptionCard
              title="Pay with Card"
              subtitle="Visa, Mastercard, or AMEX"
              value={formatUsdMinor(props.selectedPriceMinor)}
              icon={<CreditCard className="h-5 w-5" />}
              active={props.selectedRail === "fiat"}
              disabled={props.selectedPriceMinor == null}
              onClick={() => props.onRailChange("fiat")}
            />
            <RailOptionCard
              title="Pay with Crypto"
              subtitle="USDC via connected wallet"
              value={formatCryptoMinor(
                props.selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
                  ? props.selectedRecurringCryptoPriceMinor
                  : props.selectedCryptoPriceMinor,
              )}
              icon={<Wallet className="h-5 w-5" />}
              active={props.selectedRail === "crypto"}
              disabled={
                props.selectedCryptoPriceMinor == null &&
                props.selectedRecurringCryptoPriceMinor == null
              }
              footer={
                <CryptoPoweredByStrip
                  active={props.selectedRail === "crypto"}
                />
              }
              onClick={() => props.onRailChange("crypto")}
            />
          </div>

          {props.selectedRail === "crypto" && recurringAvailable ? (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#132238]">
                    Crypto billing mode
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Recurring uses the campaign plan cycle and can be paused later
                    from the campaign overview.
                  </p>
                </div>
                <span className="rounded-full bg-[#e6fffb] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0f766e]">
                  Crypto only
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => props.onCryptoBillingModeChange(BILLING_MODE.ONE_TIME)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition-all",
                    props.selectedCryptoBillingMode === BILLING_MODE.ONE_TIME
                      ? "border-[#132238] bg-[#132238] text-white"
                      : "border-slate-200 bg-slate-50 text-[#132238] hover:border-slate-300",
                  )}
                >
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    One-time
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {formatCryptoMinor(props.selectedCryptoPriceMinor)}
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">
                    {isUpgradeMode
                      ? "Single crypto payment that upgrades this campaign into a paid one-time plan."
                      : "Single crypto payment. Future extensions stay on the current one-time system."}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    props.onCryptoBillingModeChange(BILLING_MODE.SUBSCRIPTION)
                  }
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition-all",
                    props.selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-slate-200 bg-slate-50 text-[#132238] hover:border-slate-300",
                  )}
                >
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Recurring
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {formatCryptoMinor(props.selectedRecurringCryptoPriceMinor)}
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">
                    {isUpgradeMode
                      ? "Starts a recurring crypto subscription for this campaign immediately."
                      : "Starts a recurring crypto subscription for this campaign plan."}
                  </p>
                </button>
              </div>
            </div>
          ) : null}

          {props.formError ? (
            <div className="mt-5">
              <NoticePanel
                tone="danger"
                title="We couldn't continue"
                description={props.formError}
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <FooterButton type="button" variant="outline" onClick={props.onClose}>
              Close
            </FooterButton>
            <FooterButton
              type="button"
              className="bg-[#132238] text-white hover:bg-[#0f172a]"
              disabled={props.selectedRail === null}
              onClick={props.onContinue}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </FooterButton>
          </div>
        </CheckoutSection>
      </div>
    </div>
  );
}

function CampaignWalletStep(props: {
  summary: CampaignPlanCheckoutSummary | null;
  checkoutMode: CampaignPlanCheckoutMode;
  selectedPlan: CampaignPlan | null;
  selectedCryptoBillingMode: CryptoBillingMode;
  walletReady: boolean;
  chainMatches: boolean;
  paymentChainName: string;
  address?: string;
  selectedCryptoPriceMinor: number | null;
  walletAction: WalletAction;
  walletNotice?: WalletStepNotice | null;
  onBack: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onSwitchNetwork: () => void;
  onContinue: () => void;
}) {
  const walletStatusTitle = !props.walletReady
    ? "Connect a wallet"
    : !props.chainMatches
      ? "Switch network"
      : "Wallet ready";
  const walletStatusDescription = !props.walletReady
    ? "Connect your wallet to continue with crypto payment."
    : !props.chainMatches
      ? `Switch to ${props.paymentChainName} to continue.`
      : "Your wallet is connected and ready. Continue to review your payment.";
  const isRecurring = props.selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION;
  const isUpgradeMode =
    props.checkoutMode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
      <CheckoutSection
        title="Wallet readiness"
        caption="Make sure your wallet is connected before you continue."
      >
        <NoticePanel
          tone={!props.walletReady || !props.chainMatches ? "warning" : "success"}
          title={walletStatusTitle}
          description={walletStatusDescription}
        />

        <div className="mt-5 grid gap-3">
          <AssetMetric
            label="Wallet"
            value={
              props.walletReady
                ? props.address
                  ? shortenWalletAddress(props.address)
                  : "Connected"
                : "Not connected"
            }
            caption={props.walletReady ? "Connected" : "Not connected"}
          />
          <AssetMetric
            label="Network"
            value={props.chainMatches ? props.paymentChainName : "Needs switch"}
            caption="Required for this payment"
          />
          <AssetMetric
            label="Amount due"
            value={formatCryptoMinor(props.selectedCryptoPriceMinor)}
            caption={isRecurring ? "Starts recurring billing" : "Paid from your wallet"}
          />
        </div>

        {props.walletNotice ? (
          <div className="mt-5">
            <NoticePanel
              tone={props.walletNotice.tone}
              title={props.walletNotice.title}
              description={props.walletNotice.description}
            />
          </div>
        ) : null}
      </CheckoutSection>

      <CheckoutSection
        title="Before you continue"
        caption={
          isUpgradeMode
            ? "Review the campaign upgrade details before moving to payment."
            : "Review the basic campaign details before moving to payment."
        }
      >
        <SummaryRows
          rows={[
            { label: "Campaign", value: props.summary?.campaignName ?? "--" },
            { label: "Plan", value: props.selectedPlan?.name ?? "--" },
            {
              label: "Amount due",
              value: formatCryptoMinor(props.selectedCryptoPriceMinor),
            },
            {
              label: "Billing",
              value: isRecurring ? "Recurring crypto" : "One-time crypto",
            },
          ]}
        />

        <div className="mt-6 flex flex-col gap-3">
          <FooterButton type="button" variant="outline" onClick={props.onBack}>
            Back to checkout
          </FooterButton>

          {props.walletReady ? (
            <FooterButton
              type="button"
              className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
              disabled={props.walletAction !== null}
              onClick={props.onDisconnectWallet}
            >
              {props.walletAction === "disconnect" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Disconnecting wallet
                </>
              ) : (
                <>
                  <Unplug className="h-4 w-4" />
                  Disconnect wallet
                </>
              )}
            </FooterButton>
          ) : null}

          {!props.walletReady ? (
            <FooterButton
              type="button"
              className="bg-[#0f766e] text-white hover:bg-[#115e59]"
              disabled={props.walletAction !== null}
              onClick={props.onConnectWallet}
            >
              {props.walletAction === "connect" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting wallet
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Connect wallet
                </>
              )}
            </FooterButton>
          ) : !props.chainMatches ? (
            <FooterButton
              type="button"
              className="bg-[#132238] text-white hover:bg-[#0f172a]"
              disabled={props.walletAction !== null}
              onClick={props.onSwitchNetwork}
            >
              {props.walletAction === "switch" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Switching network
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Switch to {props.paymentChainName}
                </>
              )}
            </FooterButton>
          ) : (
            <FooterButton
              type="button"
              className="bg-[#132238] text-white hover:bg-[#0f172a]"
              disabled={props.walletAction !== null}
              onClick={props.onContinue}
            >
              {props.walletAction === "quote" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing payment
                </>
              ) : props.walletAction === "connect" ? (
                <AnimatedDotsText text="Connecting wallet" />
              ) : (
                <>
                  Continue to review
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </FooterButton>
          )}
        </div>
      </CheckoutSection>
    </div>
  );
}

function CampaignReviewStep(props: {
  summary: CampaignPlanCheckoutSummary | null;
  checkoutMode: CampaignPlanCheckoutMode;
  selectedPlan: CampaignPlan | null;
  selectedRail: CheckoutRail;
  selectedCryptoBillingMode: CryptoBillingMode;
  selectedPriceMinor: number | null;
  selectedCryptoPriceMinor: number | null;
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
}) {
  const isRecurringCrypto =
    props.selectedRail === "crypto" &&
    props.selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION;
  const isUpgradeMode =
    props.checkoutMode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
      <CheckoutSection
        title="Review your order"
        caption={
          props.selectedRail === "crypto"
            ? isRecurringCrypto
              ? isUpgradeMode
                ? "Check the details before you approve the initial recurring crypto payment for this upgrade."
                : "Check the details before you approve the initial recurring crypto payment."
              : isUpgradeMode
                ? "Check the details before you approve and pay from your wallet to upgrade this campaign."
                : "Check the details before you approve and pay from your wallet."
            : isUpgradeMode
              ? "Check the details before you continue to secure card payment for this upgrade."
              : "Check the details before you continue to card payment."
        }
      >
        <SummaryRows
          rows={[
            { label: "Campaign", value: props.summary?.campaignName ?? "--" },
            { label: "Plan", value: props.selectedPlan?.name ?? "--" },
            {
              label: "Type",
              value: props.summary?.isPolitical ? "Political" : "Non-political",
            },
            props.selectedRail === "crypto"
              ? {
                  label: isRecurringCrypto ? "Initial charge" : "Wallet amount",
                  value: formatCryptoMinor(props.selectedCryptoPriceMinor),
                }
              : {
                  label: "Card amount",
                  value: formatUsdMinor(props.selectedPriceMinor),
                },
          ]}
        />

        {props.selectedRail === "crypto" ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <AssetMetric label="Wallet" value={shortenWalletAddress(props.address)} />
            <AssetMetric label="Network" value={props.networkLabel} />
            <AssetMetric
              label="Amount due"
              value={formatCryptoMinor(props.selectedCryptoPriceMinor)}
              caption={
                isRecurringCrypto
                  ? "Initial recurring charge from your wallet"
                  : "Paid from your wallet"
              }
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <AssetMetric
              label={isUpgradeMode ? "Flow" : "Data access"}
              value={
                isUpgradeMode
                  ? "Upgrade existing campaign"
                  : props.summary?.getDataAccess
                    ? "Yes"
                    : "No"
              }
            />
            <AssetMetric
              label="Duration"
              value={
                props.selectedPlan?.durationDays
                  ? `${props.selectedPlan.durationDays} days`
                  : "Unavailable"
              }
            />
            <AssetMetric label="Checkout" value="Stripe" caption="Secure card form" />
          </div>
        )}
      </CheckoutSection>

      <CheckoutSection
        title={props.selectedRail === "crypto" ? "Payment" : "Card payment"}
        caption={
          props.selectedRail === "crypto"
            ? isRecurringCrypto
              ? "Your wallet may ask you to approve the initial recurring subscription payment."
              : "Your wallet may ask you to confirm one or more actions to complete the purchase."
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
                  {isRecurringCrypto
                    ? "Your wallet may ask for approval and subscription confirmation"
                    : "Your wallet may ask for approval"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-black/55">
                {isRecurringCrypto
                  ? "The first payment is initiated from your wallet. Future renewals follow the same campaign plan cycle until you pause them."
                  : "In some cases, you may need to approve USDC before the payment can be completed."}
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
                    {isRecurringCrypto ? "Start subscription" : "Pay"}{" "}
                    {formatCryptoMinor(props.selectedCryptoPriceMinor)}
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
              description="If you want to change the payment method, go back before continuing."
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

function CampaignStripeCheckoutStep(props: {
  clientSecret: string;
  paymentId: string;
  summary: CampaignPlanCheckoutSummary | null;
  checkoutMode: CampaignPlanCheckoutMode;
  selectedPlan: CampaignPlan | null;
  selectedPriceMinor: number | null;
  onBack: () => void;
  onResolved: (result: CheckoutResult) => Promise<void> | void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
      <CampaignStripeCheckoutInner {...props} />
    </Elements>
  );
}

function CampaignStripeCheckoutInner(props: {
  clientSecret: string;
  paymentId: string;
  summary: CampaignPlanCheckoutSummary | null;
  checkoutMode: CampaignPlanCheckoutMode;
  selectedPlan: CampaignPlan | null;
  selectedPriceMinor: number | null;
  onBack: () => void;
  onResolved: (result: CheckoutResult) => Promise<void> | void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const isUpgradeMode =
    props.checkoutMode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE;

  useEffect(() => {
    return () => {
      props.onSubmittingChange?.(false);
    };
  }, [props]);

  function setSubmitting(nextValue: boolean) {
    setIsSubmitting(nextValue);
    props.onSubmittingChange?.(nextValue);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || !isReady || isSubmitting) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }

    try {
      const payment = await waitForStripeCheckoutResolution({
        paymentId: props.paymentId,
        attempts: 30,
        intervalMs: 2000,
      });

      await props.onResolved(
        buildCheckoutResult({
          kind: "success",
          title: isUpgradeMode ? "Upgrade payment successful" : "Payment successful",
          description:
            isUpgradeMode
              ? "Your card payment has been confirmed and this campaign upgrade is now being reflected in your account."
              : "Your card payment has been confirmed and your campaign purchase is now being reflected in your account.",
          payment,
          paymentId: payment._id,
        }),
      );
    } catch {
      await props.onResolved(
        buildCheckoutResult({
          kind: "pending",
          title: isUpgradeMode ? "Upgrade payment submitted" : "Payment submitted",
          description:
            isUpgradeMode
              ? "Your card was charged successfully. We are still finishing confirmation, so this campaign upgrade is marked as pending for now."
              : "Your card was charged successfully. We are still finishing confirmation, so the purchase is marked as pending for now.",
          paymentId: props.paymentId,
          retryLabel: "Back to review",
          retryStage: "review",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <CheckoutSection
        title="Secure card entry"
        caption={
          isUpgradeMode
            ? "Enter your card details to finish the upgrade. If you need to change anything, go back to the review step."
            : "Enter your card details to finish the purchase. If you need to change anything, go back to the review step."
        }
      >
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <AssetMetric label="Campaign" value={props.summary?.campaignName ?? "--"} />
          <AssetMetric label="Plan" value={props.selectedPlan?.name ?? "--"} />
          <AssetMetric label="Total" value={formatUsdMinor(props.selectedPriceMinor)} />
        </div>

        <div className="rounded-[22px] border border-black/10 bg-[#fafafa] p-4">
          <PaymentElement
            options={stripeCardOnlyPaymentElementOptions}
            onReady={() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => setIsReady(true));
              });
            }}
          />
        </div>
      </CheckoutSection>

      {error ? (
        <NoticePanel
          tone="danger"
          title="Card payment failed"
          description={error}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
        <FooterButton
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={props.onBack}
          disabled={isSubmitting}
        >
          Back to review
        </FooterButton>
        <FooterButton
          type="submit"
          className="w-full bg-[#132238] text-white hover:bg-[#0f172a] sm:w-auto"
          disabled={!stripe || !elements || !isReady || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming payment
            </>
          ) : (
            <>
              {isUpgradeMode ? "Confirm and upgrade" : "Confirm and pay"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </FooterButton>
      </div>
    </form>
  );
}

function CampaignResultStep(props: {
  result: CheckoutResult;
  summary: CampaignPlanCheckoutSummary | null;
  checkoutMode: CampaignPlanCheckoutMode;
  selectedPlan: CampaignPlan | null;
  selectedRail: CheckoutRail | null;
  resultPayment: PaymentIntentRecord | null;
  resultTxHash: string | null;
  selectedPriceMinor: number | null;
  selectedCryptoPriceMinor: number | null;
  address?: string;
  onClose: () => void;
  onRetry: () => void;
  onGoToCampaigns: () => void;
}) {
  const status = getStatusPresentation(props.result.kind);
  const StatusIcon = status.icon;
  const providerCode = props.resultPayment
    ? getPaymentProviderCode(props.resultPayment)
    : null;
  const isCryptoPayment =
    props.selectedRail === "crypto" ||
    providerCode === PAYMENT_PROVIDER_CODE.EVM ||
    Boolean(props.resultTxHash);
  const amountPaid = isCryptoPayment
    ? props.selectedCryptoPriceMinor != null
      ? `${formatTokenAmountFromMinor(
          props.selectedCryptoPriceMinor,
          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
        )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
      : "—"
    : formatUsdMinor(props.selectedPriceMinor);

  const summaryRows = [
    {
      label: "Campaign",
      value: props.summary?.campaignName ?? "—",
      icon: RadioTower,
      iconColor: "text-blue-500",
    },
    {
      label: "Plan",
      value: props.selectedPlan?.name ?? "—",
      icon: FileText,
      iconColor: "text-purple-500",
    },
    {
      label: "Amount Paid",
      value: amountPaid,
      icon: CreditCard,
      iconColor:
        props.result.kind === "success"
          ? "text-emerald-600"
          : props.result.kind === "pending"
            ? "text-amber-600"
            : "text-rose-600",
    },
    {
      label: isCryptoPayment ? "Wallet Address" : "Payment Method",
      value: isCryptoPayment ? shortenWalletAddress(props.address) : "Card Payment",
      icon: isCryptoPayment ? Wallet : CreditCard,
      iconColor: "text-orange-500",
      isStatus: false,
    },
    {
      label: "Status",
      value: status.badge,
      icon: StatusIcon,
      iconColor: "text-slate-400",
      isStatus: true,
    },
  ];
  const isUpgradeMode =
    props.checkoutMode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="flex-1 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Transaction Summary
        </h2>

        <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
          {summaryRows.map((row, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between px-6 py-5",
                idx !== summaryRows.length - 1 && "border-b border-slate-50",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50",
                    row.iconColor,
                  )}
                >
                  <row.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">
                  {row.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {row.isStatus ? (
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                      status.badgeClassName,
                    )}
                  >
                    {row.value}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-[#132238]">
                    {row.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 space-y-6 py-9 lg:w-[420px]">
        <div
          className={cn(
            "relative overflow-hidden rounded-[32px] border p-8 text-center shadow-sm transition-all",
            status.cardClassName,
          )}
        >
          <div
            className={cn(
              "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl",
              status.glowClassName,
            )}
          />

          <div
            className={cn(
              "relative mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-500",
              status.iconWrapClassName,
            )}
          >
            <StatusIcon className="h-10 w-10" />
          </div>

          <h3 className="mt-6 font-serif text-2xl font-bold leading-tight text-[#132238]">
            {status.title}
          </h3>

          <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700">
            {props.result.description}
          </p>
        </div>

        <div className="grid gap-3">
          <FooterButton
            className="h-14 w-full rounded-2xl bg-[#0f766e] font-bold text-white shadow-lg shadow-[#0f766e]/20 hover:bg-[#0d6b63]"
            onClick={props.result.kind === "success" ? props.onGoToCampaigns : props.onRetry}
          >
            {props.result.kind === "success"
              ? isUpgradeMode
                ? "Return to campaign"
                : "Go to my campaigns"
              : "Try Again"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </FooterButton>

          {props.resultTxHash ? (
            <button
              type="button"
              onClick={() => window.open(getTxExplorerUrl(props.resultTxHash!), "_blank")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </button>
          ) : null}

          <FooterButton type="button" variant="outline" onClick={props.onClose}>
            Close
          </FooterButton>
        </div>
      </div>
    </div>
  );
}

export function CampaignPlanCheckoutModal(props: CampaignPlanCheckoutModalProps) {
  const navigate = useNavigate();
  const { open: openWalletModal } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const stripePayment = useStripePayment();
  const cryptoPayment = useEvmUsdcPayment();
  const oneTimePaymentChain = getDefaultEvmPaymentChain();
  const recurringPaymentChain = getRecurringEvmPaymentChain();
  const checkoutMode = props.mode ?? CAMPAIGN_PLAN_CHECKOUT_MODE.CREATE;
  const isUpgradeMode =
    checkoutMode === CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE;
  const upgradeDetails = props.mode === "upgrade" ? props : null;
  const createSnapshot = props.mode === "upgrade" ? null : props.snapshot;
  const targetCampaignId = upgradeDetails?.campaignId ?? null;

  const selectedPriceObj = useMemo(
    () => getEnabledFiatPrice(props.selectedPlan?.buyConfig, "USD"),
    [props.selectedPlan],
  );
  const selectedCryptoPriceObj = useMemo(
    () =>
      getEnabledCryptoPrice(
        props.selectedPlan?.buyConfig,
        BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
      ),
    [props.selectedPlan],
  );
  const selectedRecurringCryptoPriceObj = useMemo(
    () =>
      getEnabledSubscriptionCryptoPrice(
        props.selectedPlan?.buyConfig,
        BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
      ),
    [props.selectedPlan],
  );
  const selectedPriceMinor = selectedPriceObj?.entry.rateInMinor ?? null;
  const selectedCryptoPriceMinor = selectedCryptoPriceObj?.entry.rateInMinor ?? null;
  const selectedRecurringCryptoPriceMinor =
    selectedRecurringCryptoPriceObj?.entry.rateInMinor ?? null;
  const checkoutSummary = useMemo(
    () =>
      upgradeDetails
        ? buildCampaignPlanCheckoutSummary({
            mode: CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE,
            campaignId: upgradeDetails.campaignId,
            campaignName: upgradeDetails.campaignName,
            campaignGoal: upgradeDetails.campaignGoal,
            isPolitical: upgradeDetails.campaignIsPolitical,
          })
        : buildCampaignPlanCheckoutSummary({
            mode: CAMPAIGN_PLAN_CHECKOUT_MODE.CREATE,
            snapshot: createSnapshot,
          }),
    [createSnapshot, upgradeDetails],
  );
  const paymentContext = useMemo(() => {
    if (!props.selectedPlan?._id) return null;

    if (upgradeDetails) {
      return buildCampaignPlanPaymentContext({
        mode: CAMPAIGN_PLAN_CHECKOUT_MODE.UPGRADE,
        planId: props.selectedPlan._id,
        campaignId: upgradeDetails.campaignId,
      });
    }

    if (!createSnapshot) return null;
    return buildCampaignPlanPaymentContext({
      mode: CAMPAIGN_PLAN_CHECKOUT_MODE.CREATE,
      planId: props.selectedPlan._id,
      snapshot: createSnapshot,
    });
  }, [createSnapshot, props.selectedPlan?._id, upgradeDetails]);
  const checkoutPlanIsBasic = useMemo(
    () => Boolean(props.selectedPlan && isBasicCampaign(props.selectedPlan)),
    [props.selectedPlan],
  );
  const recurringCryptoAvailable = selectedRecurringCryptoPriceMinor != null;
  const defaultCryptoBillingMode: CryptoBillingMode =
    selectedCryptoPriceMinor != null
      ? BILLING_MODE.ONE_TIME
      : recurringCryptoAvailable
        ? BILLING_MODE.SUBSCRIPTION
        : BILLING_MODE.ONE_TIME;

  const [stage, setStage] = useState<CheckoutStage>("configure");
  const [selectedRail, setSelectedRail] = useState<CheckoutRail | null>(
    getDefaultCampaignRail({
      hasFiat: selectedPriceMinor != null,
      hasCrypto:
        selectedCryptoPriceMinor != null || selectedRecurringCryptoPriceMinor != null,
    }),
  );
  const [selectedCryptoBillingMode, setSelectedCryptoBillingMode] =
    useState<CryptoBillingMode>(defaultCryptoBillingMode);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<WalletAction>(null);
  const [walletNotice, setWalletNotice] = useState<WalletStepNotice | null>(null);
  const [isStripeSubmitting, setIsStripeSubmitting] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentIntentRecord | null>(null);
  const [cryptoIntent, setCryptoIntent] = useState<EvmPaymentIntentResponse | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const effectiveCryptoPriceMinor =
    selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
      ? selectedRecurringCryptoPriceMinor
      : selectedCryptoPriceMinor;
  const paymentChain =
    selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
      ? recurringPaymentChain
      : oneTimePaymentChain;

  const walletReady = Boolean(isConnected || address);
  const chainMatches = walletReady && chainId === paymentChain.id;
  const latestWalletReadyRef = useRef<boolean>(walletReady);
  const hasBlockingCheckoutAction =
    walletAction !== null ||
    stripePayment.isStarting ||
    isStripeSubmitting ||
    cryptoPayment.isPending;

  useEffect(() => {
    if (!props.open) {
      setStage("configure");
      setFormError(null);
      setRequestError(null);
      setWalletAction(null);
      setWalletNotice(null);
      setIsStripeSubmitting(false);
      setActivePaymentId(null);
      setPaymentRecord(null);
      setCryptoIntent(null);
      setResult(null);
      stripePayment.reset();
      cryptoPayment.reset();
      setSelectedRail(
        getDefaultCampaignRail({
          hasFiat: selectedPriceMinor != null,
          hasCrypto:
            selectedCryptoPriceMinor != null || selectedRecurringCryptoPriceMinor != null,
        }),
      );
      setSelectedCryptoBillingMode(defaultCryptoBillingMode);
    }
  }, [
    cryptoPayment,
    defaultCryptoBillingMode,
    props.open,
    selectedRecurringCryptoPriceMinor,
    selectedCryptoPriceMinor,
    selectedPriceMinor,
    stripePayment,
  ]);

  useEffect(() => {
    if (!props.open) return;

    const nextRail =
      selectedRail === "fiat"
        ? selectedPriceMinor != null
          ? "fiat"
          : getDefaultCampaignRail({
              hasFiat: selectedPriceMinor != null,
              hasCrypto:
                selectedCryptoPriceMinor != null ||
                selectedRecurringCryptoPriceMinor != null,
            })
        : selectedRail === "crypto"
          ? selectedCryptoPriceMinor != null ||
            selectedRecurringCryptoPriceMinor != null
            ? "crypto"
            : getDefaultCampaignRail({
                hasFiat: selectedPriceMinor != null,
                hasCrypto:
                  selectedCryptoPriceMinor != null ||
                  selectedRecurringCryptoPriceMinor != null,
              })
          : getDefaultCampaignRail({
              hasFiat: selectedPriceMinor != null,
              hasCrypto:
                selectedCryptoPriceMinor != null ||
                selectedRecurringCryptoPriceMinor != null,
            });

    const nextCryptoBillingMode =
      nextRail === "crypto"
        ? selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION &&
            recurringCryptoAvailable
          ? BILLING_MODE.SUBSCRIPTION
          : selectedCryptoBillingMode === BILLING_MODE.ONE_TIME &&
              selectedCryptoPriceMinor != null
            ? BILLING_MODE.ONE_TIME
            : defaultCryptoBillingMode
        : BILLING_MODE.ONE_TIME;

    const railChanged = nextRail !== selectedRail;
    const billingModeChanged =
      nextCryptoBillingMode !== selectedCryptoBillingMode;

    if (!railChanged && !billingModeChanged) return;

    setSelectedRail(nextRail);
    setSelectedCryptoBillingMode(nextCryptoBillingMode);
    setFormError(null);
    setRequestError(null);
    setWalletNotice(null);
    setActivePaymentId(null);
    setPaymentRecord(null);
    setCryptoIntent(null);
    setResult(null);
    stripePayment.reset();
    cryptoPayment.reset();

    if (stage !== "configure") {
      setStage("configure");
    }
  }, [
    cryptoPayment,
    defaultCryptoBillingMode,
    props.open,
    recurringCryptoAvailable,
    selectedCryptoBillingMode,
    selectedCryptoPriceMinor,
    selectedPriceMinor,
    selectedRail,
    selectedRecurringCryptoPriceMinor,
    stage,
    stripePayment,
  ]);

  useEffect(() => {
    latestWalletReadyRef.current = walletReady;
  }, [walletReady]);

  useEffect(() => {
    if (walletReady && walletAction === "connect") {
      setWalletAction(null);
    }
  }, [walletAction, walletReady]);

  useEffect(() => {
    if (walletReady) {
      setWalletNotice((current) =>
        current?.source === "connect" ? null : current,
      );
    }
  }, [walletReady]);

  useEffect(() => {
    if (chainMatches) {
      setWalletNotice((current) =>
        current?.source === "switch" ? null : current,
      );
    }
  }, [chainMatches]);

  const steps = useMemo(
    () =>
      buildCheckoutSteps({
        rail: selectedRail,
        stage,
      }),
    [selectedRail, stage],
  );

  function closeCheckout(nextOpen: boolean) {
    if (!nextOpen && hasBlockingCheckoutAction) {
      return;
    }
    props.onOpenChange(nextOpen);
  }

  function continueFromConfigure() {
    if (!checkoutSummary || !paymentContext || !props.selectedPlan) {
      setFormError(
        isUpgradeMode
          ? "Campaign upgrade details are missing. Return to the campaign and try again."
          : "Campaign details are missing. Return to setup and try again.",
      );
      return;
    }

    if (checkoutPlanIsBasic) {
      setFormError("Basic plans require the dedicated free create flow.");
      return;
    }

    const rail =
      selectedRail ??
      getDefaultCampaignRail({
        hasFiat: selectedPriceMinor != null,
        hasCrypto:
          selectedCryptoPriceMinor != null || selectedRecurringCryptoPriceMinor != null,
      });

    if (!rail) {
      setFormError("Choose a payment method to continue.");
      return;
    }
    if (rail === "fiat" && selectedPriceMinor == null) {
      setFormError("Card payment is not available for this plan right now.");
      return;
    }
    if (rail === "crypto" && effectiveCryptoPriceMinor == null) {
      setFormError("Crypto payment is not available for this plan right now.");
      return;
    }
    if (
      rail === "crypto" &&
      selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION &&
      !recurringCryptoAvailable
    ) {
      setFormError("Recurring crypto is not available for this plan right now.");
      return;
    }

    setFormError(null);
    setSelectedRail(rail);
    setStage(rail === "crypto" ? "wallet" : "review");
  }

  async function connectWallet() {
    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("connect");

    try {
      await openWalletModal();
      const nextAddress = await waitForWalletAddress({
        attempts: 40,
        intervalMs: 300,
      });

      if (!nextAddress && !latestWalletReadyRef.current) {
        setWalletNotice({
          source: "connect",
          tone: "warning",
          title: "Wallet not connected",
          description:
            "Wallet connection was not completed. Choose a wallet and connect to continue.",
        });
        return;
      }
    } catch {
      if (!latestWalletReadyRef.current) {
        setWalletNotice({
          source: "connect",
          tone: "warning",
          title: "Wallet not connected",
          description:
            "Wallet connection was not completed. Choose a wallet and connect to continue.",
        });
      }
    } finally {
      setWalletAction(null);
    }
  }

  async function switchNetwork() {
    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("switch");

    try {
      await switchChainAsync({ chainId: paymentChain.id });
    } catch {
      setWalletNotice({
        source: "switch",
        tone: "warning",
        title: "Network not switched",
        description: `Switch to ${paymentChain.name} to continue with crypto payment.`,
      });
    } finally {
      setWalletAction(null);
    }
  }

  function disconnectWallet() {
    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("disconnect");

    try {
      disconnect();
      setWalletNotice({
        source: "connect",
        tone: "warning",
        title: "Wallet disconnected",
        description:
          "Your wallet has been disconnected. Connect another wallet to continue with crypto payment.",
      });
    } catch {
      setWalletNotice({
        source: "connect",
        tone: "danger",
        title: "Wallet could not be disconnected",
        description:
          "We couldn't disconnect the wallet right now. Try again to switch wallets.",
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function createCryptoQuote() {
    if (!props.selectedPlan || !paymentContext) return;

    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("quote");

    try {
      const paymentIntent = await requestPaymentIntent({
        purpose: PAYMENT_INTENT_PURPOSE.PURCHASE_CAMPAIGN_PLAN,
        providerCode: PAYMENT_PROVIDER_CODE.EVM,
        billingMode: selectedCryptoBillingMode,
        context: paymentContext,
      });

      if (!isEvmPaymentIntentResponse(paymentIntent)) {
        throw new Error("We couldn't prepare your crypto payment.");
      }

      setActivePaymentId(paymentIntent.paymentId);
      setCryptoIntent(paymentIntent);
      setStage("review");
    } catch (error) {
      setWalletNotice({
        source: "quote",
        tone: "danger",
        title: "We couldn't prepare payment",
        description: getErrorMessage(
          error,
          "We couldn't prepare your crypto payment.",
        ),
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function startStripeCheckout() {
    if (!props.selectedPlan || !paymentContext) return;

    setRequestError(null);

    try {
      const response = await stripePayment.start({
        purpose: PAYMENT_INTENT_PURPOSE.PURCHASE_CAMPAIGN_PLAN,
        context: paymentContext,
        fallbackErrorMessage: "We couldn't start card payment.",
      });

      setActivePaymentId(response.paymentId);
      setStage("stripe");
    } catch (error) {
      setRequestError(
        getErrorMessage(error, "We couldn't start card payment."),
      );
    }
  }

  async function finalizeSuccessfulPurchase(input: {
    payment: PaymentIntentRecord | null;
    paymentId?: string | null;
    txHash?: string | null;
    campaignId?: string | null;
  }) {
    const paymentId = input.paymentId ?? input.payment?._id ?? null;
    const campaignId =
      input.campaignId ?? getPurchasedCampaignId(input.payment ?? null);
    setPaymentRecord(input.payment);
    setActivePaymentId(paymentId);
    if (isUpgradeMode && campaignId) {
      clearAddInfoDraftForCampaign(campaignId);
    }
    await invalidateCampaignPurchaseQueries(paymentId, campaignId);
    setResult(
      buildCheckoutResult({
        kind: "success",
        title: isUpgradeMode ? "Campaign upgrade complete" : "Campaign purchase complete",
        description:
          isUpgradeMode
            ? "Your campaign upgrade has been confirmed. Your campaign and payment history are now refreshing."
            : "Your campaign purchase has been confirmed. Your campaigns and payment history are now refreshing.",
        payment: input.payment ?? null,
        paymentId,
        txHash: input.txHash ?? null,
        retryStage: null,
      }),
    );
    setStage("result");
  }

  async function handleStripeResolved(nextResult: CheckoutResult) {
    setPaymentRecord(nextResult.payment ?? null);
    setResult(nextResult);

    if (nextResult.kind === "success") {
      await finalizeSuccessfulPurchase({
        payment: nextResult.payment,
        paymentId: nextResult.payment?._id ?? nextResult.paymentId,
        campaignId: targetCampaignId,
      });
      return;
    }

    setStage("result");
  }

  async function payWithCrypto() {
    if (!cryptoIntent) return;

    setRequestError(null);

    try {
      const paymentOutcome = await cryptoPayment.pay(cryptoIntent);
      await finalizeSuccessfulPurchase({
        payment: paymentOutcome.payment,
        paymentId: paymentOutcome.payment._id,
        txHash: paymentOutcome.txHash,
        campaignId: targetCampaignId,
      });
    } catch (error) {
      if (isPaymentFlowHandledError(error)) {
        setPaymentRecord(null);
        if (error.recoveryStage === "wallet") {
          setWalletNotice({
            source: walletReady ? "switch" : "connect",
            tone: "warning",
            title: "Wallet action needed",
            description:
              (error instanceof Error && error.message) ||
              "Reconnect your wallet to continue.",
          });
          setStage("wallet");
          return;
        }

        if (error.recoveryStage === "review") {
          setRequestError(
            (error instanceof Error && error.message) ||
              cryptoPayment.error ||
              "The wallet payment could not be completed.",
          );
          setStage("review");
          return;
        }

        setResult(
          mapCryptoCheckoutFlowError(
            error as PaymentFlowError,
            (error instanceof Error && error.message) ||
              cryptoPayment.error ||
              "The wallet payment could not be completed.",
          ),
        );
        setStage("result");
        return;
      }

      setResult(
        buildCheckoutResult({
          kind: "failed",
          title: "Crypto payment failed",
          description: getErrorMessage(
            error,
            "The wallet payment could not be completed.",
          ),
          retryLabel: "Back to review",
          retryStage: "review",
        }),
      );
      setStage("result");
    }
  }

  function retryFromResult() {
    if (!result?.retryStage) return;
    setRequestError(null);
    setResult(null);
    if (
      result.retryStage === "review" &&
      selectedRail === "crypto" &&
      !cryptoIntent
    ) {
      setStage("wallet");
      return;
    }
    setStage(result.retryStage);
  }

  function goToCampaigns() {
    closeCheckout(false);
    const purchasedCampaignId = getPurchasedCampaignId(resultPayment ?? null);
    if (purchasedCampaignId) {
      navigate(`/campaigns/edit/${purchasedCampaignId}/overview`);
      return;
    }

    if (isUpgradeMode && targetCampaignId) {
      navigate(`/campaigns/edit/${targetCampaignId}/overview`);
      return;
    }

    navigate("/campaigns/my-campaigns?afterPayment=1");
  }

  const resultPayment = result?.payment ?? paymentRecord;
  const resultTxHash =
    result?.txHash ??
    resultPayment?.display?.crypto?.txHash ??
    resultPayment?.settlement?.payload?.txHash ??
    null;

  return (
    <CheckoutModal
      open={props.open}
      onOpenChange={closeCheckout}
      dismissible={false}
      eyebrow={props.selectedPlan?.code ?? "Campaign checkout"}
      title={
        checkoutSummary?.campaignName
          ? isUpgradeMode
            ? `Upgrade ${checkoutSummary.campaignName}`
            : `Buy ${checkoutSummary.campaignName}`
          : isUpgradeMode
            ? "Upgrade campaign plan"
            : "Buy campaign plan"
      }
      subtitle={
        isUpgradeMode
          ? "Complete your campaign upgrade through one guided checkout."
          : "Complete your campaign purchase through one guided checkout."
      }
      steps={steps}
    >
      {stage === "configure" ? (
        <CampaignConfigureStep
          summary={checkoutSummary}
          checkoutMode={checkoutMode}
          selectedPlan={props.selectedPlan}
          selectedRail={selectedRail}
          selectedPriceMinor={selectedPriceMinor}
          selectedCryptoPriceMinor={selectedCryptoPriceMinor}
          selectedRecurringCryptoPriceMinor={selectedRecurringCryptoPriceMinor}
          selectedCryptoBillingMode={selectedCryptoBillingMode}
          formError={formError}
          onRailChange={(rail) => {
            setSelectedRail(rail);
            setSelectedCryptoBillingMode(
              rail === "crypto"
                ? selectedCryptoPriceMinor != null
                  ? BILLING_MODE.ONE_TIME
                  : recurringCryptoAvailable
                    ? BILLING_MODE.SUBSCRIPTION
                    : BILLING_MODE.ONE_TIME
                : BILLING_MODE.ONE_TIME,
            );
            setFormError(null);
            setRequestError(null);
            setWalletNotice(null);
            setPaymentRecord(null);
            setCryptoIntent(null);
            setResult(null);
            stripePayment.reset();
            cryptoPayment.reset();
          }}
          onCryptoBillingModeChange={(mode) => {
            setSelectedCryptoBillingMode(mode);
            setFormError(null);
            setRequestError(null);
            setWalletNotice(null);
            setPaymentRecord(null);
            setCryptoIntent(null);
            setResult(null);
          }}
          onClose={() => closeCheckout(false)}
          onContinue={continueFromConfigure}
        />
      ) : null}

      {stage === "wallet" ? (
        <CampaignWalletStep
          summary={checkoutSummary}
          checkoutMode={checkoutMode}
          selectedPlan={props.selectedPlan}
          selectedCryptoBillingMode={selectedCryptoBillingMode}
          walletReady={walletReady}
          chainMatches={chainMatches}
          paymentChainName={paymentChain.name}
          address={address}
          selectedCryptoPriceMinor={effectiveCryptoPriceMinor}
          walletAction={walletAction}
          walletNotice={walletNotice}
          onBack={() => setStage("configure")}
          onConnectWallet={connectWallet}
          onDisconnectWallet={disconnectWallet}
          onSwitchNetwork={switchNetwork}
          onContinue={createCryptoQuote}
        />
      ) : null}

      {stage === "review" && selectedRail ? (
        <CampaignReviewStep
          summary={checkoutSummary}
          checkoutMode={checkoutMode}
          selectedPlan={props.selectedPlan}
          selectedRail={selectedRail}
          selectedCryptoBillingMode={selectedCryptoBillingMode}
          selectedPriceMinor={selectedPriceMinor}
          selectedCryptoPriceMinor={effectiveCryptoPriceMinor}
          address={address}
          networkLabel={paymentChain.name}
          requestError={requestError}
          cryptoStatusText={cryptoPayment.statusText}
          cryptoError={cryptoPayment.error}
          isCryptoPending={cryptoPayment.isPending}
          hasCryptoIntent={Boolean(cryptoIntent)}
          isStripeStarting={stripePayment.isStarting}
          onBackToWallet={() => setStage("wallet")}
          onBackToConfigure={() => setStage("configure")}
          onPayWithCrypto={payWithCrypto}
          onStartStripeCheckout={startStripeCheckout}
        />
      ) : null}

      {stage === "stripe" && stripePayment.clientSecret && activePaymentId ? (
        <CampaignStripeCheckoutStep
          clientSecret={stripePayment.clientSecret}
          paymentId={activePaymentId}
          summary={checkoutSummary}
          checkoutMode={checkoutMode}
          selectedPlan={props.selectedPlan}
          selectedPriceMinor={selectedPriceMinor}
          onBack={() => setStage("review")}
          onResolved={handleStripeResolved}
          onSubmittingChange={setIsStripeSubmitting}
        />
      ) : null}

      {stage === "result" && result ? (
        <CampaignResultStep
          result={result}
          summary={checkoutSummary}
          checkoutMode={checkoutMode}
          selectedPlan={props.selectedPlan}
          selectedRail={selectedRail}
          resultPayment={resultPayment}
          resultTxHash={resultTxHash}
          selectedPriceMinor={selectedPriceMinor}
          selectedCryptoPriceMinor={effectiveCryptoPriceMinor}
          address={address}
          onClose={() => closeCheckout(false)}
          onRetry={retryFromResult}
          onGoToCampaigns={goToCampaigns}
        />
      ) : null}
    </CheckoutModal>
  );
}
