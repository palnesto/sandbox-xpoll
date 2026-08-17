import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  ReceiptText,
  ShieldCheck,
  Unplug,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useAppKit } from "@reown/appkit/react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";

import { endpoints } from "@/api/endpoints";
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
import { PAYMENT_INTENT_PURPOSE } from "@/components/payment/payment-configs";
import {
  AnimatedDotsText,
  AssetMetric,
  CheckoutModal,
  CheckoutSection,
  EmptyStateCard,
  FooterButton,
  NoticePanel,
  PageLoadingGrid,
  RailOptionCard,
  SummaryRows,
} from "@/components/payment/checkout-ui";
import { CryptoPoweredByStrip } from "@/components/payment/crypto-powered-by-strip";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import {
  BILLING_MODE,
  fetchPaymentIntentById,
  getPaymentProviderCode,
  isEvmPaymentIntentResponse,
  isPaymentFlowHandledError,
  PAYMENT_PROVIDER_CODE,
  requestPaymentIntent,
  type BillingMode,
  type EvmPaymentIntentResponse,
  type PaymentFlowError,
  type PaymentIntentRecord,
} from "@/lib/payments/core";
import { getDefaultEvmPaymentChain } from "@/lib/payments/evm-network";
import { useEvmUsdcPayment } from "@/lib/payments/useEvmUsdcPayment";
import {
  stripeCardOnlyPaymentElementOptions,
  stripePromise,
  useStripePayment,
} from "@/lib/payments/useStripePayment";
import {
  shortenWalletAddress,
  waitForWalletAddress,
} from "@/lib/payments/wallet";
import { cn } from "@/lib/utils";
import { getTxExplorerUrl } from "@/utils/txExplorer";
import soulBoundTokenImg from "@/assets/soulBound.webp";
import type { OfflineProduct, OfflineProductPurpose } from "./types";
import {
  extractProductList,
  formatUsdMinor,
  formatUsdcMinor,
  formatUsdcMinorMonthly,
  formatSubscriptionCadenceSuffix,
  getDefaultOfflineProductRail,
  getProductStatusLabel,
  getSuccessDescription,
  getSubscriptionUsdcPriceMinor,
  getUsdPriceMinor,
  getUsdcPriceMinor,
  invalidateOfflineProductPurchaseQueries,
  isValidEmail,
  OFFLINE_PRODUCT_ORDER,
  SUBSCRIPTION_TERMS,
  toOfflineProduct,
} from "./utils";

const container = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.08,
      duration: 0.45,
      ease: "easeOut" as const,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

type ProfileData = {
  emailAuth?: {
    email?: string | null;
  };
  googleEmail?: string | null;
  soulbound?: {
    canBuyNow?: boolean;
    isActive?: boolean;
    purchasePolicy?: {
      checkoutState?:
        | "all_blocked_active"
        | "manage_in_profile"
        | "choose_one_time_or_subscription"
        | "subscription_only";
      fiatOneTimeAllowed?: boolean;
      cryptoOneTimeAllowed?: boolean;
      cryptoSubscriptionAllowed?: boolean;
      message?: string | null;
    } | null;
  };
  profile?: {
    level?: number;
  };
};

type SoulboundPurchasePolicy = NonNullable<
  NonNullable<ProfileData["soulbound"]>["purchasePolicy"]
>;

const SOULBOUND_CHECKOUT_STATE = {
  ALL_BLOCKED_ACTIVE: "all_blocked_active",
  MANAGE_IN_PROFILE: "manage_in_profile",
  CHOOSE_ONE_TIME_OR_SUBSCRIPTION: "choose_one_time_or_subscription",
  SUBSCRIPTION_ONLY: "subscription_only",
} as const;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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

  if (kind === "canceled") {
    return {
      title: "Payment Canceled",
      badge: "Canceled",
      cardClassName:
        "border-slate-300 bg-slate-200/70 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200",
      iconWrapClassName:
        "bg-slate-600 text-white shadow-lg shadow-slate-600/25",
      glowClassName: "bg-slate-400/25",
      icon: XCircle,
      badgeClassName: "bg-slate-200 text-slate-900",
    };
  }

  return {
    title: "Payment Failed",
    badge: "Failed",
    cardClassName:
      "border-rose-300 bg-rose-200/70 bg-gradient-to-b from-rose-200 via-rose-100 to-rose-200",
    iconWrapClassName: "bg-rose-600 text-white shadow-lg shadow-rose-600/25",
    glowClassName: "bg-rose-400/25",
    icon: CircleAlert,
    badgeClassName: "bg-rose-200 text-rose-900",
  };
}

function getDefaultSoulboundPurchasePolicy(): SoulboundPurchasePolicy {
  return {
    checkoutState: SOULBOUND_CHECKOUT_STATE.CHOOSE_ONE_TIME_OR_SUBSCRIPTION,
    fiatOneTimeAllowed: true,
    cryptoOneTimeAllowed: true,
    cryptoSubscriptionAllowed: true,
    message: "Choose one-time or recurring billing for your Soul-bound purchase.",
  };
}

function normalizeSoulboundPurchasePolicy(
  value: ProfileData["soulbound"] extends infer Soulbound
    ? Soulbound extends { purchasePolicy?: infer Policy }
      ? Policy
      : never
    : never,
): SoulboundPurchasePolicy {
  const fallback = getDefaultSoulboundPurchasePolicy();
  if (!value || typeof value !== "object") return fallback;

  const state = String((value as SoulboundPurchasePolicy).checkoutState ?? "")
    .trim()
    .toLowerCase();
  const checkoutState =
    state === SOULBOUND_CHECKOUT_STATE.ALL_BLOCKED_ACTIVE ||
    state === SOULBOUND_CHECKOUT_STATE.MANAGE_IN_PROFILE ||
    state === SOULBOUND_CHECKOUT_STATE.SUBSCRIPTION_ONLY ||
    state === SOULBOUND_CHECKOUT_STATE.CHOOSE_ONE_TIME_OR_SUBSCRIPTION
      ? (state as SoulboundPurchasePolicy["checkoutState"])
      : fallback.checkoutState;

  return {
    checkoutState,
    fiatOneTimeAllowed:
      (value as SoulboundPurchasePolicy).fiatOneTimeAllowed === true,
    cryptoOneTimeAllowed:
      (value as SoulboundPurchasePolicy).cryptoOneTimeAllowed === true,
    cryptoSubscriptionAllowed:
      (value as SoulboundPurchasePolicy).cryptoSubscriptionAllowed === true,
    message:
      typeof (value as SoulboundPurchasePolicy).message === "string" &&
      (value as SoulboundPurchasePolicy).message!.trim().length > 0
        ? (value as SoulboundPurchasePolicy).message!.trim()
        : fallback.message,
  };
}

function getSoulboundBlockedNotice(
  policy: SoulboundPurchasePolicy,
): {
  tone: "danger" | "neutral";
  title: string;
  description: string;
  showGoToProfile: boolean;
} | null {
  if (policy.checkoutState === SOULBOUND_CHECKOUT_STATE.MANAGE_IN_PROFILE) {
    return {
      tone: "danger",
      title: "Manage Soul-bound from your profile",
      description: policy.message,
      showGoToProfile: true,
    };
  }

  if (policy.checkoutState === SOULBOUND_CHECKOUT_STATE.ALL_BLOCKED_ACTIVE) {
    return {
      tone: "danger",
      title: "Soul-bound purchase unavailable",
      description: policy.message,
      showGoToProfile: false,
    };
  }

  if (policy.checkoutState === SOULBOUND_CHECKOUT_STATE.SUBSCRIPTION_ONLY) {
    return {
      tone: "neutral",
      title: "Recurring billing required",
      description: policy.message,
      showGoToProfile: false,
    };
  }

  return null;
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue/90">
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
      <div className="text-[13px] leading-[18px] text-slate-600">
        {children}
      </div>
    </div>
  );
}

function renderFeatureLabel(label: string): ReactNode {
  const match = String(label).match(/^(.*)\(([^)]+)\)(.*)$/);
  if (!match) return label;
  const [, before, mid, after] = match;
  return (
    <>
      {before}(<span className="font-semibold text-blue">{mid.trim()}</span>)
      {after}
    </>
  );
}

function ProductCard(props: {
  product: OfflineProduct;
  usdMinor: number | null;
  usdcMinor: number | null;
  recurringUsdcMinor?: number | null;
  soulboundPurchasePolicy?: SoulboundPurchasePolicy | null;
  disabled?: boolean;
  actionLabel?: string;
  onAction: (purpose: OfflineProductPurpose) => void;
}) {
  const isSoulBound =
    props.product._id === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION;
  const soulboundPolicy = props.soulboundPurchasePolicy
    ? normalizeSoulboundPurchasePolicy(props.soulboundPurchasePolicy)
    : null;
  const recurringSuffix = formatSubscriptionCadenceSuffix(props.product.buyConfig);
  const recurringLabel =
    props.recurringUsdcMinor != null
      ? `${formatUsdcMinor(props.recurringUsdcMinor)}${recurringSuffix}`
      : null;
  const soulboundSupportText = !isSoulBound
    ? null
    : soulboundPolicy?.checkoutState === SOULBOUND_CHECKOUT_STATE.MANAGE_IN_PROFILE
      ? "Recurring Soul-bound is managed from your profile"
      : soulboundPolicy?.checkoutState ===
          SOULBOUND_CHECKOUT_STATE.ALL_BLOCKED_ACTIVE
        ? "Current Soul-bound access is active until expiry"
        : soulboundPolicy?.checkoutState ===
            SOULBOUND_CHECKOUT_STATE.SUBSCRIPTION_ONLY
          ? "Future Soul-bound payments stay on recurring billing"
          : "Choose one-time or recurring crypto during checkout";
  const primaryPriceLabel =
    props.usdMinor != null
      ? formatUsdMinor(props.usdMinor)
      : props.usdcMinor != null
        ? formatUsdcMinorMonthly(props.usdcMinor)
        : recurringLabel ?? "Pricing unavailable";
  const secondaryPriceLabel =
    props.usdMinor != null && props.usdcMinor != null
      ? `or ${formatUsdcMinorMonthly(props.usdcMinor)}`
      : null;

  return (
    <motion.div
      variants={item}
      whileHover={{
        y: -6,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      className="rounded-xl h-fit bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_25px_rgba(15,23,42,0.6)] ring-1 ring-slate-900/5"
    >
      <div className="font-semibold text-slate-800">{props.product.name}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">
        {primaryPriceLabel}
      </div>

      {secondaryPriceLabel ? (
        <div className="mt-1 text-xs text-slate-500">
          {secondaryPriceLabel}
        </div>
      ) : null}

      <p className="mt-2 whitespace-pre-line text-[12.5px] leading-[18px] text-slate-500">
        {props.product.description}
      </p>

      <div className="space-y-3 py-5">
        {props.product.features.map((feature, idx) => (
          <Bullet key={`${props.product._id}-${idx}`}>
            {renderFeatureLabel(feature)}
          </Bullet>
        ))}
      </div>

      {isSoulBound ? (
        <p className="flex items-center gap-1 text-[13px] font-bold">
          <img
            src={soulBoundTokenImg}
            alt="Soul Bound Token"
            className="h-7 w-7 object-contain"
            style={{ animation: "spinY 2s linear infinite" }}
          />
          {soulboundSupportText}
        </p>
      ) : null}

      {isSoulBound &&
      (props.usdcMinor != null || props.recurringUsdcMinor != null) ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          {props.usdcMinor != null ? (
            <div className="font-semibold text-[#132238]">
              One-time crypto: {formatUsdcMinor(props.usdcMinor)}
            </div>
          ) : null}
          {recurringLabel ? (
            <div className={cn(props.usdcMinor != null ? "mt-1" : "")}>
              Recurring crypto: {recurringLabel}
            </div>
          ) : null}
        </div>
      ) : null}

      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        disabled={props.disabled}
        onClick={() => props.onAction(props.product._id)}
        className={cn(
          "mt-5 w-full rounded-full border border-blue/70 bg-white px-4 py-2.5 text-sm font-semibold text-blue shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:bg-blue hover:text-white focus:outline-none focus:ring-2 focus:ring-blue/40",
          props.disabled ? "cursor-not-allowed opacity-40" : "",
        )}
      >
        {props.actionLabel ?? props.product.ctaText}
      </motion.button>
    </motion.div>
  );
}

function ProductConfigureStep(props: {
  product: OfflineProduct | null;
  contactEmail: string;
  emailError: string | null;
  termsChecked: boolean;
  showTerms: boolean;
  selectedRail: CheckoutRail | null;
  formError: string | null;
  usdMinor: number | null;
  oneTimeUsdcMinor: number | null;
  recurringUsdcMinor: number | null;
  cryptoDisplayUsdcMinor: number | null;
  cryptoDisplayLabel: string | null;
  selectedCryptoBillingMode: BillingMode;
  soulboundNotice: ReturnType<typeof getSoulboundBlockedNotice>;
  soulboundCheckoutBlocked: boolean;
  soulboundFiatOneTimeAllowed: boolean;
  showSoulboundCryptoModes: boolean;
  soulboundOneTimeAllowed: boolean;
  soulboundRecurringAllowed: boolean;
  soulboundRecurringCadenceSuffix: string;
  onEmailChange: (value: string) => void;
  onToggleTermsChecked: (value: boolean) => void;
  onToggleTermsVisible: () => void;
  onRailChange: (rail: CheckoutRail) => void;
  onCryptoBillingModeChange: (mode: BillingMode) => void;
  onGoToProfile: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const isSoulbound =
    props.product?._id === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION;
  const canContinue =
    Boolean(props.product) &&
    props.contactEmail.trim().length > 0 &&
    !props.emailError &&
    props.termsChecked &&
    !props.soulboundCheckoutBlocked &&
    Boolean(props.selectedRail ?? getDefaultOfflineProductRail(props.product)) &&
    ((props.selectedRail ?? getDefaultOfflineProductRail(props.product)) !==
      "fiat" ||
      (props.usdMinor != null &&
        (!isSoulbound || props.soulboundFiatOneTimeAllowed))) &&
    ((props.selectedRail ?? getDefaultOfflineProductRail(props.product)) !==
      "crypto" ||
      props.cryptoDisplayUsdcMinor != null);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px,1fr] xl:grid-cols-[440px,1fr]">
      <div className="space-y-6">
        <div className="sticky space-y-6">
          <CheckoutSection
            title="Selected Product"
            caption="Review the subscription details and available payment options."
          >
            {props.product ? (
              <div className="rounded-[32px] border border-slate-100 bg-[#f8fbfa]/50 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl font-bold text-[#132238]">
                      {props.product.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {props.product.description}
                    </p>
                  </div>
                  <div className="rounded-full border border-[#0f766e]/20 bg-[#eef8f5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">
                    Active
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <CreditCard className="h-3 w-3" />
                      Card price
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#132238]">
                      {props.usdMinor != null
                        ? formatUsdMinor(props.usdMinor)
                        : "Unavailable"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0f766e]">
                      <Wallet className="h-3 w-3" />
                      Wallet price
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#0f766e]">
                      {props.cryptoDisplayLabel ?? "Unavailable"}
                    </p>
                  </div>
                </div>

                {props.product.features.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    {props.product.features.map((feature, idx) => (
                      <Bullet key={`${props.product?._id}-summary-${idx}`}>
                        {renderFeatureLabel(feature)}
                      </Bullet>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CheckoutSection>
        </div>
      </div>

      <div className="space-y-8 ">
        <CheckoutSection
          title="Payment and contact"
          caption="Choose the payment rail, confirm your contact email, and accept the subscription terms before continuing."
        >
          <div className="grid gap-4">
            <RailOptionCard
              title="Pay with Card"
              subtitle="Visa, Mastercard, or AMEX"
              value={
                props.usdMinor != null ? formatUsdMinor(props.usdMinor) : "—"
              }
              icon={<CreditCard className="h-5 w-5" />}
              active={props.selectedRail === "fiat"}
              disabled={
                props.usdMinor == null ||
                (isSoulbound && !props.soulboundFiatOneTimeAllowed)
              }
              onClick={() => props.onRailChange("fiat")}
            />
            <RailOptionCard
              title="Pay with Crypto"
              subtitle="USDC via connected wallet"
              value={props.cryptoDisplayLabel ?? "—"}
              icon={<Wallet className="h-5 w-5" />}
              active={props.selectedRail === "crypto"}
              disabled={
                props.oneTimeUsdcMinor == null && props.recurringUsdcMinor == null
              }
              footer={
                <CryptoPoweredByStrip
                  active={props.selectedRail === "crypto"}
                />
              }
              onClick={() => props.onRailChange("crypto")}
            />
          </div>

          {props.selectedRail === "crypto" && props.showSoulboundCryptoModes ? (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#132238]">
                    Crypto billing mode
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a single wallet payment or start recurring Soul-bound
                    billing that you can manage later from your profile.
                  </p>
                </div>
                <span className="rounded-full bg-[#e6fffb] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0f766e]">
                  Crypto only
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={!props.soulboundOneTimeAllowed}
                  onClick={() =>
                    props.onCryptoBillingModeChange(BILLING_MODE.ONE_TIME)
                  }
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition-all",
                    props.selectedCryptoBillingMode === BILLING_MODE.ONE_TIME
                      ? "border-[#132238] bg-[#132238] text-white"
                      : "border-slate-200 bg-slate-50 text-[#132238] hover:border-slate-300",
                    !props.soulboundOneTimeAllowed &&
                      "cursor-not-allowed opacity-50 hover:border-slate-200",
                  )}
                >
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    One-time
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {props.oneTimeUsdcMinor != null
                      ? formatUsdcMinor(props.oneTimeUsdcMinor)
                      : "Unavailable"}
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">
                    {props.soulboundOneTimeAllowed
                      ? "Single crypto payment for the current Soul-bound period."
                      : "Unavailable because this account must stay on recurring Soul-bound billing."}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!props.soulboundRecurringAllowed}
                  onClick={() =>
                    props.onCryptoBillingModeChange(BILLING_MODE.SUBSCRIPTION)
                  }
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition-all",
                    props.selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-slate-200 bg-slate-50 text-[#132238] hover:border-slate-300",
                    !props.soulboundRecurringAllowed &&
                      "cursor-not-allowed opacity-50 hover:border-slate-200",
                  )}
                >
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Recurring
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {props.recurringUsdcMinor != null
                      ? `${formatUsdcMinor(props.recurringUsdcMinor)}${props.soulboundRecurringCadenceSuffix}`
                      : "Unavailable"}
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">
                    Starts recurring Soul-bound billing that you can pause,
                    resume, or continue from your profile.
                  </p>
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contact email
              </label>
              <input
                type="email"
                value={props.contactEmail}
                onChange={(e) => props.onEmailChange(e.target.value)}
                placeholder="Enter your email"
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2",
                  props.contactEmail.trim() && props.emailError
                    ? "border-rose-300 bg-rose-50/60 focus:ring-rose-200"
                    : "border-slate-200 bg-white text-slate-800 focus:ring-[#0f766e]/20",
                )}
              />
              {props.contactEmail.trim() && props.emailError ? (
                <p className="mt-2 text-xs text-rose-600">{props.emailError}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={props.onToggleTermsVisible}
              className="text-left text-sm font-semibold text-[#0f766e] underline decoration-[#0f766e]/30 underline-offset-4 hover:decoration-[#0f766e]"
            >
              {props.showTerms
                ? "Hide subscription terms"
                : "Read subscription terms"}
            </button>

            {props.showTerms ? (
              <div className="max-h-[260px] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                {SUBSCRIPTION_TERMS}
              </div>
            ) : null}

            {props.soulboundNotice ? (
              <NoticePanel
                tone={props.soulboundNotice.tone}
                title={props.soulboundNotice.title}
                description={props.soulboundNotice.description}
              >
                {props.soulboundNotice.showGoToProfile ? (
                  <FooterButton
                    type="button"
                    className="bg-[#132238] text-white hover:bg-[#0f172a]"
                    onClick={props.onGoToProfile}
                  >
                    Go to profile
                  </FooterButton>
                ) : null}
              </NoticePanel>
            ) : null}

            {props.formError ? (
              <NoticePanel
                tone="danger"
                title="We couldn't continue"
                description={props.formError}
              />
            ) : null}

            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={props.termsChecked}
                  onChange={(e) => props.onToggleTermsChecked(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-[#0f766e]"
                />
                <span>
                  I agree to XPOLL&apos;s subscription terms and understand this
                  purchase is subject to the platform terms.
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <FooterButton
                  type="button"
                  variant="outline"
                  onClick={props.onClose}
                >
                  Close
                </FooterButton>
                <FooterButton
                  type="button"
                  className="bg-[#132238] text-white hover:bg-[#0f172a]"
                  disabled={!canContinue}
                  onClick={props.onContinue}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </FooterButton>
              </div>
            </div>
          </div>
        </CheckoutSection>
      </div>
    </div>
  );
}

function ProductWalletStep(props: {
  product: OfflineProduct | null;
  contactEmail: string;
  walletReady: boolean;
  chainMatches: boolean;
  paymentChainName: string;
  address?: string;
  usdcMinor: number | null;
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
      <CheckoutSection
        title="Wallet readiness"
        caption="Make sure your wallet is connected before you continue."
      >
        <NoticePanel
          tone={
            !props.walletReady || !props.chainMatches ? "warning" : "success"
          }
          title={walletStatusTitle}
          description={walletStatusDescription}
        />

        <div className="mt-5 grid gap-3">
          <AssetMetric
            label="Wallet"
            value={
              props.walletReady && props.address ? (
                <span className="inline-flex items-center gap-2">
                  <span>{shortenWalletAddress(props.address)}</span>
                  <CopyIconButton
                    value={props.address}
                    srLabel="Copy wallet address"
                    className="text-black/45 hover:text-[#132238]"
                  />
                </span>
              ) : (
                props.walletReady
                  ? "Connected"
                  : shortenWalletAddress(props.address)
              )
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
            value={
              props.usdcMinor != null
                ? `${formatTokenAmountFromMinor(
                    props.usdcMinor,
                    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
                : "Unavailable"
            }
            caption="Paid from your wallet"
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
        caption="Review the basic details before moving to payment."
      >
        <SummaryRows
          rows={[
            { label: "Product", value: props.product?.name ?? "--" },
            { label: "Contact email", value: props.contactEmail || "--" },
            {
              label: "Amount due",
              value:
                props.usdcMinor != null
                  ? `${formatTokenAmountFromMinor(
                      props.usdcMinor,
                      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                    )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
                  : "Unavailable",
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

function ProductReviewStep(props: {
  product: OfflineProduct | null;
  selectedRail: CheckoutRail;
  contactEmail: string;
  usdMinor: number | null;
  usdcMinor: number | null;
  cryptoBillingModeLabel?: string | null;
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
            { label: "Product", value: props.product?.name ?? "--" },
            { label: "Contact email", value: props.contactEmail || "--" },
            {
              label: "Payment method",
              value:
                props.selectedRail === "crypto"
                  ? "USDC wallet"
                  : "Card / Stripe",
            },
            ...(props.selectedRail === "crypto" &&
            props.cryptoBillingModeLabel
              ? [
                  {
                    label: "Billing mode",
                    value: props.cryptoBillingModeLabel,
                  },
                ]
              : []),
            props.selectedRail === "crypto"
              ? {
                  label: "Wallet amount",
                  value:
                    props.usdcMinor != null
                      ? `${formatTokenAmountFromMinor(
                          props.usdcMinor,
                          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                        )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
                      : "Unavailable",
                }
              : {
                  label: "Card amount",
                  value:
                    props.usdMinor != null
                      ? formatUsdMinor(props.usdMinor)
                      : "Unavailable",
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
                props.usdcMinor != null
                  ? `${formatTokenAmountFromMinor(
                      props.usdcMinor,
                      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                    )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
                  : "Unavailable"
              }
              caption="Paid from your wallet"
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            <AssetMetric
              label="Contact"
              value={props.contactEmail || "Unavailable"}
              caption="Delivery email"
            />
            <AssetMetric
              label="Amount"
              value={
                props.usdMinor != null
                  ? formatUsdMinor(props.usdMinor)
                  : "Unavailable"
              }
              caption="Billed on checkout"
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
                    {props.usdcMinor != null
                      ? `${formatTokenAmountFromMinor(
                          props.usdcMinor,
                          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                        )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
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
              description="If you want to change the email or payment method, go back before continuing."
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

function OfflineProductStripeCheckoutStep(props: {
  clientSecret: string;
  paymentId: string;
  product: OfflineProduct;
  contactEmail: string;
  totalUsdMinor: number | null;
  onBack: () => void;
  onResolved: (result: CheckoutResult) => Promise<void> | void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: props.clientSecret }}
    >
      <OfflineProductStripeCheckoutInner {...props} />
    </Elements>
  );
}

function OfflineProductStripeCheckoutInner(props: {
  clientSecret: string;
  paymentId: string;
  product: OfflineProduct;
  contactEmail: string;
  totalUsdMinor: number | null;
  onBack: () => void;
  onResolved: (result: CheckoutResult) => Promise<void> | void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

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
          title: "Payment successful",
          description:
            "Your card payment has been confirmed and your subscription purchase is now being reflected in your account.",
          payment,
          paymentId: payment._id,
        }),
      );
    } catch {
      await props.onResolved(
        buildCheckoutResult({
          kind: "pending",
          title: "Payment submitted",
          description:
            "Your card was charged successfully. We are still finishing confirmation, so the purchase is marked as pending for now.",
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
        caption="Enter your card details to finish the purchase. If you need to change anything, go back to the review step."
      >
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <AssetMetric label="Product" value={props.product.name} />
          <AssetMetric label="Contact" value={props.contactEmail} />
          <AssetMetric
            label="Total"
            value={
              props.totalUsdMinor != null
                ? formatUsdMinor(props.totalUsdMinor)
                : "Pending"
            }
          />
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
              Confirm and pay
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </FooterButton>
      </div>
    </form>
  );
}

function ProductResultStep(props: {
  result: CheckoutResult;
  product: OfflineProduct | null;
  selectedRail: CheckoutRail | null;
  resultPayment: PaymentIntentRecord | null;
  resultTxHash: string | null;
  usdMinor: number | null;
  usdcMinor: number | null;
  contactEmail: string;
  address?: string;
  onClose: () => void;
  onRetry: () => void;
  onViewPayment: () => void;
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
    ? props.usdcMinor != null
      ? `${formatTokenAmountFromMinor(
          props.usdcMinor,
          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
        )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
      : "—"
    : props.usdMinor != null
      ? formatUsdMinor(props.usdMinor)
      : "—";

  const summaryRows = [
    {
      label: "Product",
      value: props.product?.name ?? "—",
      icon: ReceiptText,
      iconColor: "text-blue-500",
    },
    {
      label: "Contact email",
      value: props.contactEmail || "—",
      icon: Mail,
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
      value: isCryptoPayment
        ? shortenWalletAddress(props.address)
        : "Card Payment",
      icon: isCryptoPayment ? Wallet : CreditCard,
      iconColor: "text-orange-500",
      isWallet: isCryptoPayment,
    },
    {
      label: "Status",
      value: status.badge,
      icon: StatusIcon,
      iconColor: "text-slate-400",
      isStatus: true,
    },
  ];

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

                {row.isWallet ? (
                  <CopyIconButton
                    value={props.address}
                    srLabel="Copy wallet address"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0f766e]"
                  />
                ) : null}
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
            onClick={
              props.result.kind === "success"
                ? props.onViewPayment
                : props.onRetry
            }
          >
            {props.result.kind === "success"
              ? "View Payment History"
              : "Try Again"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </FooterButton>

          {props.resultTxHash ? (
            <button
              type="button"
              onClick={() =>
                window.open(getTxExplorerUrl(props.resultTxHash!), "_blank")
              }
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </button>
          ) : null}

          {/* <FooterButton type="button" variant="outline" onClick={props.onClose}>
            Close
          </FooterButton> */}
        </div>
      </div>
    </div>
  );
}

export function OfflineProductCheckout() {
  const navigate = useNavigate();
  const { open: openWalletModal } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const stripePayment = useStripePayment();
  const cryptoPayment = useEvmUsdcPayment();
  const paymentChain = getDefaultEvmPaymentChain();

  const {
    data: offlineProductsRaw,
    isLoading,
    isError,
  } = useApiQuery(endpoints.payment.offlineProducts);
  const { data: meResponse, refetch: refetchMe } = useApiQuery(
    endpoints.profile.me,
  );

  const meData = useMemo(
    () => (meResponse?.data?.data ?? null) as ProfileData | null,
    [meResponse],
  );

  const products = useMemo<OfflineProduct[]>(() => {
    const payload = offlineProductsRaw?.data?.data;
    return extractProductList(payload)
      .map(toOfflineProduct)
      .filter((product): product is OfflineProduct => product !== null)
      .filter((product) => product.isActive !== false)
      .sort(
        (a, b) =>
          OFFLINE_PRODUCT_ORDER.indexOf(a._id) -
          OFFLINE_PRODUCT_ORDER.indexOf(b._id),
      );
  }, [offlineProductsRaw]);

  const initialEmail = useMemo(
    () => meData?.googleEmail ?? meData?.emailAuth?.email ?? "",
    [meData],
  );

  const [selectedPurpose, setSelectedPurpose] =
    useState<OfflineProductPurpose | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stage, setStage] = useState<CheckoutStage>("configure");
  const [selectedCryptoBillingMode, setSelectedCryptoBillingMode] =
    useState<BillingMode>(BILLING_MODE.ONE_TIME);
  const [contactEmail, setContactEmail] = useState(initialEmail);
  const [termsChecked, setTermsChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedRail, setSelectedRail] = useState<CheckoutRail | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<WalletAction>(null);
  const [walletNotice, setWalletNotice] = useState<WalletStepNotice | null>(
    null,
  );
  const [isStripeSubmitting, setIsStripeSubmitting] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] =
    useState<PaymentIntentRecord | null>(null);
  const [cryptoIntent, setCryptoIntent] =
    useState<EvmPaymentIntentResponse | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === selectedPurpose) ?? null,
    [products, selectedPurpose],
  );

  const usdMinor = useMemo(
    () =>
      selectedProduct ? getUsdPriceMinor(selectedProduct.buyConfig) : null,
    [selectedProduct],
  );
  const usdcMinor = useMemo(
    () =>
      selectedProduct ? getUsdcPriceMinor(selectedProduct.buyConfig) : null,
    [selectedProduct],
  );
  const recurringUsdcMinor = useMemo(
    () =>
      selectedProduct &&
      selectedProduct._id === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION
        ? getSubscriptionUsdcPriceMinor(selectedProduct.buyConfig)
        : null,
    [selectedProduct],
  );
  const soulboundPurchasePolicy = useMemo(
    () => normalizeSoulboundPurchasePolicy(meData?.soulbound?.purchasePolicy),
    [meData?.soulbound?.purchasePolicy],
  );
  const isSelectedSoulbound =
    selectedPurpose === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION;
  const selectedSoulboundNotice = isSelectedSoulbound
    ? getSoulboundBlockedNotice(soulboundPurchasePolicy)
    : null;
  const selectedSoulboundCheckoutBlocked =
    isSelectedSoulbound &&
    (soulboundPurchasePolicy.checkoutState ===
      SOULBOUND_CHECKOUT_STATE.ALL_BLOCKED_ACTIVE ||
      soulboundPurchasePolicy.checkoutState ===
        SOULBOUND_CHECKOUT_STATE.MANAGE_IN_PROFILE);
  const soulboundFiatOneTimeAllowed = isSelectedSoulbound
    ? soulboundPurchasePolicy.fiatOneTimeAllowed
    : true;
  const soulboundOneTimeAllowed = isSelectedSoulbound
    ? soulboundPurchasePolicy.cryptoOneTimeAllowed
    : true;
  const soulboundRecurringAllowed = isSelectedSoulbound
    ? soulboundPurchasePolicy.cryptoSubscriptionAllowed
    : true;
  const showSoulboundCryptoModes =
    isSelectedSoulbound && selectedRail === "crypto";
  const soulboundRecurringCadenceSuffix = selectedProduct
    ? formatSubscriptionCadenceSuffix(selectedProduct.buyConfig)
    : "";
  const cryptoDisplayUsdcMinor =
    isSelectedSoulbound && selectedRail === "crypto"
      ? selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
        ? recurringUsdcMinor
        : usdcMinor
      : usdcMinor;
  const selectedCryptoBillingModeLabel =
    selectedRail === "crypto"
      ? isSelectedSoulbound
        ? selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
          ? "Recurring"
          : "One-time"
        : "One-time"
      : null;
  const cryptoDisplayLabel =
    cryptoDisplayUsdcMinor == null
      ? null
      : isSelectedSoulbound && selectedRail === "crypto"
        ? selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
          ? `${formatUsdcMinor(cryptoDisplayUsdcMinor)}${soulboundRecurringCadenceSuffix}`
          : formatUsdcMinor(cryptoDisplayUsdcMinor)
        : formatUsdcMinorMonthly(cryptoDisplayUsdcMinor);
  const emailError = useMemo(() => {
    if (!contactEmail.trim()) return "Contact email is required.";
    if (!isValidEmail(contactEmail)) return "Enter a valid email address.";
    return null;
  }, [contactEmail]);

  const walletReady = Boolean(isConnected || address);
  const chainMatches = walletReady && chainId === paymentChain.id;
  const latestWalletReadyRef = useRef<boolean>(walletReady);
  const hasBlockingCheckoutAction =
    walletAction !== null ||
    stripePayment.isStarting ||
    isStripeSubmitting ||
    cryptoPayment.isPending;

  useEffect(() => {
    if (!isModalOpen) {
      setContactEmail(initialEmail);
    }
  }, [initialEmail, isModalOpen]);

  useEffect(() => {
    if (!isSelectedSoulbound) {
      if (selectedCryptoBillingMode !== BILLING_MODE.ONE_TIME) {
        setSelectedCryptoBillingMode(BILLING_MODE.ONE_TIME);
      }
      return;
    }

    if (
      selectedCryptoBillingMode === BILLING_MODE.ONE_TIME &&
      (!soulboundOneTimeAllowed || usdcMinor == null) &&
      soulboundRecurringAllowed &&
      recurringUsdcMinor != null
    ) {
      setSelectedCryptoBillingMode(BILLING_MODE.SUBSCRIPTION);
      return;
    }

    if (
      selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION &&
      (!soulboundRecurringAllowed || recurringUsdcMinor == null) &&
      soulboundOneTimeAllowed &&
      usdcMinor != null
    ) {
      setSelectedCryptoBillingMode(BILLING_MODE.ONE_TIME);
    }
  }, [
    isSelectedSoulbound,
    recurringUsdcMinor,
    selectedCryptoBillingMode,
    soulboundOneTimeAllowed,
    soulboundRecurringAllowed,
    usdcMinor,
  ]);

  useEffect(() => {
    latestWalletReadyRef.current = Boolean(isConnected || address);
  }, [address, isConnected]);

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

  function resetEphemeralState() {
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
  }

  function resetFlowState() {
    setStage("configure");
    setTermsChecked(false);
    setShowTerms(false);
    setSelectedRail(null);
    setSelectedCryptoBillingMode(BILLING_MODE.ONE_TIME);
    resetEphemeralState();
  }

  function openCheckout(purpose: OfflineProductPurpose) {
    const product = products.find((entry) => entry._id === purpose) ?? null;
    const isSoulbound =
      purpose === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION;
    const policy = isSoulbound
      ? normalizeSoulboundPurchasePolicy(meData?.soulbound?.purchasePolicy)
      : null;
    const nextDefaultRail =
      isSoulbound &&
      policy?.checkoutState === SOULBOUND_CHECKOUT_STATE.SUBSCRIPTION_ONLY
        ? "crypto"
        : getDefaultOfflineProductRail(product);

    setSelectedPurpose(purpose);
    setContactEmail(initialEmail);
    setSelectedRail(nextDefaultRail);
    setSelectedCryptoBillingMode(
      isSoulbound &&
        policy?.checkoutState === SOULBOUND_CHECKOUT_STATE.SUBSCRIPTION_ONLY
        ? BILLING_MODE.SUBSCRIPTION
        : BILLING_MODE.ONE_TIME,
    );
    setTermsChecked(false);
    setShowTerms(false);
    setStage("configure");
    setIsModalOpen(true);
    resetEphemeralState();
  }

  function closeCheckout(nextOpen: boolean) {
    if (!nextOpen && hasBlockingCheckoutAction) {
      return;
    }

    setIsModalOpen(nextOpen);
    if (!nextOpen) {
      setSelectedPurpose(null);
      setContactEmail(initialEmail);
      resetFlowState();
    }
  }

  function onRailChange(rail: CheckoutRail) {
    setSelectedRail(rail);
    setFormError(null);
    setRequestError(null);
    setWalletNotice(null);
    setIsStripeSubmitting(false);
    setActivePaymentId(null);
    setPaymentRecord(null);
    setCryptoIntent(null);
    setResult(null);
    stripePayment.reset();
    cryptoPayment.reset();
  }

  function continueFromConfigure() {
    if (!selectedProduct) {
      setFormError("Select a product to continue.");
      return;
    }
    if (selectedSoulboundCheckoutBlocked) {
      setFormError(
        selectedSoulboundNotice?.description ??
          "This Soul-bound purchase is currently managed from your profile.",
      );
      return;
    }
    if (emailError) {
      setFormError(emailError);
      return;
    }
    if (!termsChecked) {
      setFormError("Accept the subscription terms to continue.");
      return;
    }

    const rail = selectedRail ?? getDefaultOfflineProductRail(selectedProduct);
    if (!rail) {
      setFormError("Choose a payment method to continue.");
      return;
    }
    if (rail === "fiat") {
      if (usdMinor == null) {
        setFormError(
          "Card payment is not available for this subscription right now.",
        );
        return;
      }
      if (isSelectedSoulbound && !soulboundFiatOneTimeAllowed) {
        setFormError(
          selectedSoulboundNotice?.description ??
            "Card payment is not available for this Soul-bound account.",
        );
        return;
      }
    }
    if (rail === "crypto") {
      if (
        isSelectedSoulbound &&
        selectedCryptoBillingMode === BILLING_MODE.SUBSCRIPTION
      ) {
        if (!soulboundRecurringAllowed || recurringUsdcMinor == null) {
          setFormError(
            "Recurring crypto payment is not available for this Soul-bound account right now.",
          );
          return;
        }
      } else if (
        (isSelectedSoulbound && !soulboundOneTimeAllowed) ||
        usdcMinor == null
      ) {
        setFormError(
          isSelectedSoulbound
            ? selectedSoulboundNotice?.description ??
              "One-time crypto payment is not available for this Soul-bound account."
            : "Crypto payment is not available for this subscription right now.",
        );
        return;
      }
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
    if (!selectedProduct) return;

    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("quote");

    try {
      const paymentIntent = await requestPaymentIntent({
        purpose: selectedProduct._id,
        providerCode: PAYMENT_PROVIDER_CODE.EVM,
        billingMode:
          selectedProduct._id === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION
            ? selectedCryptoBillingMode
            : BILLING_MODE.ONE_TIME,
        context: { contactEmail: contactEmail.trim() },
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
    if (!selectedProduct) return;

    setRequestError(null);

    try {
      const response = await stripePayment.start({
        purpose: selectedProduct._id,
        context: { contactEmail: contactEmail.trim() },
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
  }) {
    const paymentId = input.paymentId ?? input.payment?._id ?? null;
    setPaymentRecord(input.payment);
    setActivePaymentId(paymentId);
    await invalidateOfflineProductPurchaseQueries(paymentId);

    let previousLevel: number | null = null;
    let currentLevel: number | null = null;

    if (selectedPurpose === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION) {
      previousLevel = meData?.profile?.level ?? null;
      const refreshed = await refetchMe();
      const refreshedProfile = (refreshed.data?.data ??
        null) as ProfileData | null;
      currentLevel = refreshedProfile?.profile?.level ?? previousLevel;
    }

    setResult(
      buildCheckoutResult({
        kind: "success",
        title: "Purchase complete",
        description: selectedPurpose
          ? getSuccessDescription({
              purpose: selectedPurpose,
              previousLevel,
              currentLevel,
            })
          : "Your purchase has been confirmed. Your account and payment history are now refreshing.",
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

  function openMarketplacePaymentHistory() {
    const resultPayment = result?.payment ?? paymentRecord;
    const resultPaymentId =
      resultPayment?._id ?? result?.paymentId ?? activePaymentId ?? null;

    closeCheckout(false);
    navigate("/marketplace", {
      state: {
        marketplaceTab: "payments",
        highlightPaymentId: resultPaymentId,
        highlightRequestKey: Date.now(),
      },
    });
  }

  const resultPayment = result?.payment ?? paymentRecord;
  const resultTxHash =
    result?.txHash ??
    resultPayment?.display?.crypto?.txHash ??
    resultPayment?.settlement?.payload?.txHash ??
    null;
  const marketplaceGridClassName = cn(
    "grid gap-6 sm:gap-7",
    products.length <= 1
      ? "max-w-xl mx-auto"
      : products.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3",
  );

  return (
    <section className="w-full bg-slate-100 py-10 sm:py-12">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl"
      >
        <motion.h2
          variants={item}
          className="mb-7 text-center text-xl font-semibold text-slate-900 sm:mb-9 sm:text-2xl"
        >
          Marketplace Subscriptions
        </motion.h2>

        {isLoading ? (
          <PageLoadingGrid />
        ) : isError ? (
          <EmptyStateCard
            title="Marketplace subscriptions could not be loaded"
            description="Please try again to restore subscription availability and pricing."
          />
        ) : products.length === 0 ? (
          <EmptyStateCard
            title="No subscriptions available"
            description="There are no marketplace subscriptions available right now."
          />
        ) : (
          <motion.div
            variants={item}
            className={marketplaceGridClassName}
          >
            {products.map((product) => {
              const usd = getUsdPriceMinor(product.buyConfig);
              const usdc = getUsdcPriceMinor(product.buyConfig);
              const recurringUsdc =
                product._id === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION
                  ? getSubscriptionUsdcPriceMinor(product.buyConfig)
                  : null;
              const isSoulbound =
                product._id === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION;
              const policy = isSoulbound ? soulboundPurchasePolicy : null;
              const actionLabel =
                isSoulbound &&
                policy?.checkoutState ===
                  SOULBOUND_CHECKOUT_STATE.MANAGE_IN_PROFILE
                  ? "Manage in Profile"
                  : undefined;
              const disabled =
                (product._id ===
                  PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION &&
                  policy?.checkoutState ===
                    SOULBOUND_CHECKOUT_STATE.ALL_BLOCKED_ACTIVE) ||
                (usd == null && usdc == null && recurringUsdc == null);

              return (
                <ProductCard
                  key={product._id}
                  product={product}
                  usdMinor={usd}
                  usdcMinor={usdc}
                  recurringUsdcMinor={recurringUsdc}
                  soulboundPurchasePolicy={policy}
                  disabled={disabled}
                  actionLabel={actionLabel}
                  onAction={
                    isSoulbound &&
                    policy?.checkoutState ===
                      SOULBOUND_CHECKOUT_STATE.MANAGE_IN_PROFILE
                      ? () => navigate("/profile")
                      : openCheckout
                  }
                />
              );
            })}
          </motion.div>
        )}

        <motion.div variants={item} className="mt-10 flex justify-center">
          <a
            href="https://t.me/cryptogeek_ivan"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl  px-6 py-3 text-center md:text-xl font-bold text-white shadow-2xl transition bg-blue hover:bg-blue/60"
          >
            Please Contact Us for AI training data and RLHF data sales
          </a>
        </motion.div>
      </motion.div>

      <CheckoutModal
        open={isModalOpen}
        onOpenChange={closeCheckout}
        dismissible={false}
        eyebrow={
          selectedProduct
            ? getProductStatusLabel(selectedProduct._id)
            : "Subscription checkout"
        }
        title={selectedProduct ? selectedProduct.name : "Subscription checkout"}
        subtitle={
          selectedProduct
            ? `Purchase ${selectedProduct.name} with card or crypto in one guided checkout.`
            : "Choose a marketplace subscription and complete your purchase in one guided checkout."
        }
        steps={steps}
      >
        {stage === "configure" ? (
          <ProductConfigureStep
            product={selectedProduct}
            contactEmail={contactEmail}
            emailError={contactEmail.trim() ? emailError : null}
            termsChecked={termsChecked}
            showTerms={showTerms}
            selectedRail={selectedRail}
            formError={formError}
            usdMinor={usdMinor}
            oneTimeUsdcMinor={usdcMinor}
            recurringUsdcMinor={recurringUsdcMinor}
            cryptoDisplayUsdcMinor={cryptoDisplayUsdcMinor}
            cryptoDisplayLabel={cryptoDisplayLabel}
            selectedCryptoBillingMode={selectedCryptoBillingMode}
            soulboundNotice={selectedSoulboundNotice}
            soulboundCheckoutBlocked={selectedSoulboundCheckoutBlocked}
            soulboundFiatOneTimeAllowed={soulboundFiatOneTimeAllowed}
            showSoulboundCryptoModes={showSoulboundCryptoModes}
            soulboundOneTimeAllowed={soulboundOneTimeAllowed}
            soulboundRecurringAllowed={soulboundRecurringAllowed}
            soulboundRecurringCadenceSuffix={soulboundRecurringCadenceSuffix}
            onEmailChange={(value) => {
              setContactEmail(value);
              setFormError(null);
            }}
            onToggleTermsChecked={(value) => {
              setTermsChecked(value);
              setFormError(null);
            }}
            onToggleTermsVisible={() => setShowTerms((current) => !current)}
            onRailChange={onRailChange}
            onCryptoBillingModeChange={setSelectedCryptoBillingMode}
            onGoToProfile={() => {
              closeCheckout(false);
              navigate("/profile");
            }}
            onClose={() => closeCheckout(false)}
            onContinue={continueFromConfigure}
          />
        ) : null}

        {stage === "wallet" ? (
          <ProductWalletStep
            product={selectedProduct}
            contactEmail={contactEmail.trim()}
            walletReady={walletReady}
            chainMatches={chainMatches}
            paymentChainName={paymentChain.name}
            address={address}
            usdcMinor={cryptoDisplayUsdcMinor}
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
          <ProductReviewStep
            product={selectedProduct}
            selectedRail={selectedRail}
            contactEmail={contactEmail.trim()}
            usdMinor={usdMinor}
            usdcMinor={cryptoDisplayUsdcMinor}
            cryptoBillingModeLabel={selectedCryptoBillingModeLabel}
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

        {stage === "stripe" &&
        selectedProduct &&
        stripePayment.clientSecret &&
        activePaymentId ? (
          <OfflineProductStripeCheckoutStep
            clientSecret={stripePayment.clientSecret}
            paymentId={activePaymentId}
            product={selectedProduct}
            contactEmail={contactEmail.trim()}
            totalUsdMinor={usdMinor}
            onBack={() => setStage("review")}
            onResolved={handleStripeResolved}
            onSubmittingChange={setIsStripeSubmitting}
          />
        ) : null}

        {stage === "result" && result ? (
          <ProductResultStep
            result={result}
            product={selectedProduct}
            selectedRail={selectedRail}
            resultPayment={resultPayment}
            resultTxHash={resultTxHash}
            usdMinor={usdMinor}
            usdcMinor={cryptoDisplayUsdcMinor}
            contactEmail={contactEmail.trim()}
            address={address}
            onClose={() => closeCheckout(false)}
            onRetry={retryFromResult}
            onViewPayment={openMarketplacePaymentHistory}
          />
        ) : null}
      </CheckoutModal>
    </section>
  );
}
