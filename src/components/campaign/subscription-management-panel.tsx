import { useEffect, useMemo, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Button } from "@/components/ui/button";
import { ContinueNowConfirmDialog } from "@/components/payment/continue-now-confirm-dialog";
import { SubscriptionAllowanceCard } from "@/components/payment/subscription-allowance-card";
import { SubscriptionAllowanceRefillDialog } from "@/components/payment/subscription-allowance-refill-dialog";
import { TxHashLink } from "@/components/payment/tx-hash-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  continueCampaignPaymentSubscription,
  type PaymentIntentRecord,
  type PaymentIntentListResponse,
  type PaymentSubscriptionContinueDispatchResponse,
  pauseCampaignPaymentSubscription,
  type PaymentSubscriptionAllowance,
  type PaymentSubscriptionRecord,
  unpauseCampaignPaymentSubscription,
} from "@/lib/payments/core";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import {
  SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC,
  parseAtomicBigInt,
} from "@/lib/payments/subscription-allowance";

type Props = {
  campaignId: string;
  apiCampaign: any;
  refetchCampaign?: () => Promise<unknown>;
};

const CONTINUE_BUTTON_DISABLE_MS = 2 * 60 * 1000;
const CONTINUE_PAYMENT_REFETCH_CHECKPOINTS_MS = [
  5_000,
  15_000,
  30_000,
  60_000,
  CONTINUE_BUTTON_DISABLE_MS,
];

function pickDataRoot(resp: any) {
  return resp?.data?.data ?? resp?.data ?? resp ?? null;
}

function toDateOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDateTime(value: unknown) {
  const date = toDateOrNull(value);
  if (!date) return "—";
  return date.toLocaleString();
}

function formatUtcDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const parsed = raw.includes("T")
    ? toDateOrNull(raw)
    : toDateOrNull(`${raw}T00:00:00.000Z`);
  if (!parsed) return raw;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(parsed);
}

function formatAllowanceAmount(amountAtomic?: string | null) {
  if (!amountAtomic) return "—";
  const numeric = Number(amountAtomic);
  if (!Number.isFinite(numeric) || numeric < 0) return amountAtomic;
  return `${formatTokenAmountFromMinor(
    numeric,
    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
}

function formatCryptoMinor(amountMinor: unknown) {
  const numeric = Number(amountMinor);
  if (!Number.isFinite(numeric) || numeric < 0) return "—";
  return `${formatTokenAmountFromMinor(
    numeric,
    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
}

function formatCountdownMs(ms: number) {
  const safeMs = Math.max(0, Math.trunc(ms));
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function readErrorMessage(error: unknown, fallback: string) {
  return (
    (error as any)?.response?.data?.message ||
    (error instanceof Error ? error.message : fallback)
  );
}

function formatPaymentPhase(payment: PaymentIntentRecord) {
  const phase = String(payment?.subscription?.chargePhase ?? "").trim();
  if (phase === "initial") return "Initial purchase";
  if (phase === "renewal") {
    const trigger = String(payment?.subscription?.trigger ?? "").trim();
    if (trigger === "scheduled") return "Scheduled renewal";
    if (trigger === "recovery") return "Manual continue";
    return "Renewal";
  }
  return "Payment";
}

function formatPaymentTxHash(payment: PaymentIntentRecord) {
  return (
    payment?.display?.crypto?.txHash ??
    payment?.context?.recurringDispatch?.txHash ??
    payment?.settlement?.payload?.txHash ??
    null
  );
}

function getPaymentStatusTone(status: PaymentIntentRecord["status"]) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700";
  if (status === "processing") return "bg-sky-50 text-sky-700";
  if (status === "failed" || status === "canceled")
    return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function getPaymentCardTone(status: PaymentIntentRecord["status"]) {
  if (status === "succeeded") {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (status === "failed" || status === "canceled") {
    return "border-red-200 bg-red-50/70";
  }
  return "border-sky-200 bg-sky-50/70";
}

function isTerminalPaymentStatus(status: unknown) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  return (
    normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "canceled"
  );
}

function getPaymentFailureReason(payment?: PaymentIntentRecord | null) {
  const rawReason = String(
    payment?.context?.failure?.reason ??
      payment?.context?.recurringDispatch?.error ??
      "",
  ).trim();
  if (!rawReason) return null;
  if (rawReason === "CONTINUE_NOW_TIMEOUT") {
    return "This retry did not complete within 2 minutes. You can start Continue now again.";
  }
  return rawReason;
}

export default function SubscriptionManagementPanel({
  campaignId,
  apiCampaign,
  refetchCampaign,
}: Props) {
  const subscriptionBillingMode = String(
    apiCampaign?.billing?.mode ?? "",
  ).trim();
  const isSubscriptionCampaign = subscriptionBillingMode === "subscription";
  const campaignSubscriptionRoute =
    isSubscriptionCampaign && campaignId
      ? endpoints.campaigns.getCampaignSubscription(campaignId)
      : "";
  const {
    data: paymentSubscriptionResp,
    error: paymentSubscriptionError,
    isLoading: paymentSubscriptionLoading,
    isFetching: paymentSubscriptionFetching,
    refetch: refetchPaymentSubscription,
  } = useApiQuery(campaignSubscriptionRoute, {
    enabled: isSubscriptionCampaign && !!campaignId,
    retry: false,
  });
  const fetchedPaymentSubscription = useMemo(
    () =>
      (pickDataRoot(paymentSubscriptionResp) ??
        null) as PaymentSubscriptionRecord | null,
    [paymentSubscriptionResp],
  );
  const paymentSubscription = fetchedPaymentSubscription ?? null;
  const paymentSubscriptionId = String(paymentSubscription?._id ?? "").trim();

  const campaignSubscriptionPaymentsRoute =
    isSubscriptionCampaign && campaignId && paymentSubscriptionId
      ? endpoints.campaigns.getCampaignSubscriptionPayments(campaignId, 1, 50)
      : "";
  const {
    data: subscriptionPaymentsResp,
    error: subscriptionPaymentsError,
    isLoading: subscriptionPaymentsLoading,
    isFetching: subscriptionPaymentsFetching,
    refetch: refetchSubscriptionPayments,
  } = useApiQuery(campaignSubscriptionPaymentsRoute, {
    enabled: isSubscriptionCampaign && !!campaignId && !!paymentSubscriptionId,
    retry: false,
  });
  const subscriptionPayments = useMemo(
    () =>
      (pickDataRoot(subscriptionPaymentsResp) ??
        null) as PaymentIntentListResponse | null,
    [subscriptionPaymentsResp],
  );
  const paymentEntries = subscriptionPayments?.entries ?? [];

  const campaignSubscriptionAllowanceRoute =
    isSubscriptionCampaign && campaignId
      ? endpoints.campaigns.getCampaignSubscriptionAllowance(campaignId)
      : "";
  const {
    data: paymentSubscriptionAllowanceResp,
    error: paymentSubscriptionAllowanceError,
    refetch: refetchAllowance,
  } = useApiQuery(campaignSubscriptionAllowanceRoute, {
    enabled: isSubscriptionCampaign && !!paymentSubscriptionId,
    retry: false,
  });
  const paymentSubscriptionAllowance = useMemo(
    () =>
      (pickDataRoot(paymentSubscriptionAllowanceResp) ??
        null) as PaymentSubscriptionAllowance | null,
    [paymentSubscriptionAllowanceResp],
  );

  const [subscriptionActionBusy, setSubscriptionActionBusy] = useState<
    "pause" | "unpause" | "continue" | null
  >(null);
  const [continueDispatch, setContinueDispatch] =
    useState<PaymentSubscriptionContinueDispatchResponse | null>(null);
  const [handledContinuePaymentId, setHandledContinuePaymentId] = useState<
    string | null
  >(null);
  const [continueCountdownNow, setContinueCountdownNow] = useState(() =>
    Date.now(),
  );
  const [continueConfirmOpen, setContinueConfirmOpen] = useState(false);
  const [allowanceRefillOpen, setAllowanceRefillOpen] = useState(false);
  const [subscriptionActionError, setSubscriptionActionError] = useState<
    string | null
  >(null);

  const continueDispatchPaymentId = String(
    continueDispatch?.paymentId ?? "",
  ).trim();
  const recoveryLockedPaymentId =
    paymentSubscription?.attemptLock?.trigger === "recovery"
      ? String(paymentSubscription?.attemptLock?.paymentIntentId ?? "").trim()
      : "";
  const activeContinuePaymentId =
    continueDispatchPaymentId || recoveryLockedPaymentId;
  const continuePaymentRoute = activeContinuePaymentId
    ? endpoints.payment.getPaymentById(activeContinuePaymentId)
    : "";
  const {
    data: continuePaymentResp,
    error: continuePaymentError,
    isLoading: continuePaymentLoading,
    isFetching: continuePaymentFetching,
    refetch: refetchContinuePayment,
  } = useApiQuery(continuePaymentRoute, {
    enabled: !!activeContinuePaymentId,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const continuePayment = useMemo(
    () =>
      (pickDataRoot(continuePaymentResp) ?? null) as PaymentIntentRecord | null,
    [continuePaymentResp],
  );
  const continueStatus = String(continuePayment?.status ?? "").trim();
  const continueFailureReason = getPaymentFailureReason(continuePayment);
  const continueTxHash =
    continueDispatch?.txHash ??
    continuePayment?.context?.recurringDispatch?.txHash ??
    formatPaymentTxHash(continuePayment ?? ({} as PaymentIntentRecord));
  const continueDispatchedAt =
    continueDispatch?.dispatchedAt ??
    continuePayment?.context?.recurringDispatch?.at ??
    paymentSubscription?.attemptLock?.lockedAt ??
    null;
  const continueDispatchStartedAtMs = useMemo(() => {
    const raw = String(continueDispatchedAt ?? "").trim();
    if (!raw) return null;
    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed.getTime();
  }, [continueDispatchedAt]);
  const continueCountdownRemainingMs =
    continueDispatchStartedAtMs == null
      ? 0
      : Math.max(
          0,
          continueDispatchStartedAtMs +
            CONTINUE_BUTTON_DISABLE_MS -
            continueCountdownNow,
        );
  const continueCountdownActive =
    !!activeContinuePaymentId &&
    !isTerminalPaymentStatus(continueStatus) &&
    continueCountdownRemainingMs > 0;
  const hasPendingRecoveryPayment =
    !!activeContinuePaymentId && !isTerminalPaymentStatus(continueStatus);
  const showContinueProgress = !!continueDispatch || !!activeContinuePaymentId;
  const isContinueFlowActive = hasPendingRecoveryPayment;

  const isResolvingSubscription =
    isSubscriptionCampaign &&
    !paymentSubscription &&
    !paymentSubscriptionError &&
    (paymentSubscriptionLoading || paymentSubscriptionFetching);
  const subscriptionReadError =
    isSubscriptionCampaign && paymentSubscriptionError
      ? readErrorMessage(
          paymentSubscriptionError,
          "Failed to load the subscription for this campaign.",
        )
      : null;

  const paymentSubscriptionCurrentEndAt = toDateOrNull(
    paymentSubscription?.period?.currentEndAt,
  );
  const currentAllowanceAtomic =
    paymentSubscriptionAllowance?.allowanceAtomic ??
    paymentSubscription?.authorization?.crypto?.allowance?.amountAtomic ??
    null;
  const currentAllowanceBigInt = parseAtomicBigInt(currentAllowanceAtomic);
  const targetAllowanceDisplay = `${formatTokenAmountFromMinor(
    Number(SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC),
    BUY_CONFIG_CRYPTO_DECIMALS[BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC],
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
  const paymentSubscriptionIsStillPaid =
    !!paymentSubscriptionCurrentEndAt &&
    paymentSubscriptionCurrentEndAt.getTime() > Date.now();
  const showNextBillingDate =
    !!paymentSubscription &&
    paymentSubscription.manualContinueRequired !== true &&
    paymentSubscription.autoRenew === true;
  const canPauseRecurring =
    !!paymentSubscriptionId &&
    paymentSubscription?.autoRenew === true &&
    paymentSubscription?.manualContinueRequired !== true &&
    !isContinueFlowActive &&
    subscriptionActionBusy === null;
  const canUnpauseRecurring =
    !!paymentSubscriptionId &&
    paymentSubscription?.autoRenew === false &&
    paymentSubscription?.manualContinueRequired !== true &&
    paymentSubscriptionIsStillPaid &&
    !isContinueFlowActive &&
    subscriptionActionBusy === null;
  const canContinueRecurring =
    !!paymentSubscriptionId &&
    paymentSubscription?.manualContinueRequired === true &&
    (!paymentSubscription?.attemptLock?.locked ||
      (paymentSubscription?.attemptLock?.trigger === "recovery" &&
        !continueCountdownActive)) &&
    subscriptionActionBusy === null;
  const canRefillAllowance =
    !!paymentSubscriptionId &&
    !!paymentSubscription?.authorization?.crypto?.walletAddress &&
    !!paymentSubscription?.authorization?.crypto?.tokenAddress &&
    !!paymentSubscription?.authorization?.crypto?.chainId &&
    !!(
      paymentSubscriptionAllowance?.spenderAddress ??
      paymentSubscription?.authorization?.crypto?.recurringContractAddress
    ) &&
    currentAllowanceBigInt !== null &&
    currentAllowanceBigInt < SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC &&
    !isContinueFlowActive &&
    subscriptionActionBusy === null;

  async function refreshSubscriptionViews() {
    const queries = [];
    if (campaignSubscriptionRoute) {
      queries.push(
        queryClient.invalidateQueries({
          queryKey: [campaignSubscriptionRoute],
        }),
      );
    }
    if (campaignSubscriptionAllowanceRoute) {
      queries.push(
        queryClient.invalidateQueries({
          queryKey: [campaignSubscriptionAllowanceRoute],
        }),
      );
    }
    if (campaignSubscriptionPaymentsRoute) {
      queries.push(
        queryClient.invalidateQueries({
          queryKey: [campaignSubscriptionPaymentsRoute],
        }),
      );
    }

    if (campaignId) {
      queries.push(
        queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.getCampaignByIdOwner(campaignId)],
        }),
      );
    }

    await Promise.all(queries);
    await Promise.all([
      refetchPaymentSubscription(),
      refetchAllowance(),
      refetchSubscriptionPayments(),
      refetchCampaign?.() ?? Promise.resolve(),
    ]);
  }

  async function handlePauseRecurring() {
    if (!campaignId || !canPauseRecurring) return;
    setSubscriptionActionBusy("pause");
    setSubscriptionActionError(null);
    try {
      await pauseCampaignPaymentSubscription(campaignId);
      await refreshSubscriptionViews();
    } catch (error) {
      setSubscriptionActionError(
        readErrorMessage(error, "Failed to pause recurring billing."),
      );
    } finally {
      setSubscriptionActionBusy(null);
    }
  }

  async function handleUnpauseRecurring() {
    if (!campaignId || !canUnpauseRecurring) return;
    setSubscriptionActionBusy("unpause");
    setSubscriptionActionError(null);
    try {
      await unpauseCampaignPaymentSubscription(campaignId);
      await refreshSubscriptionViews();
    } catch (error) {
      setSubscriptionActionError(
        readErrorMessage(error, "Failed to resume auto-renew."),
      );
    } finally {
      setSubscriptionActionBusy(null);
    }
  }

  async function handleContinueRecurring() {
    if (!campaignId || !canContinueRecurring) return;
    setContinueConfirmOpen(false);
    setSubscriptionActionBusy("continue");
    setSubscriptionActionError(null);
    setHandledContinuePaymentId(null);
    try {
      const dispatch = await continueCampaignPaymentSubscription(campaignId);
      setContinueDispatch(dispatch);
      setContinueCountdownNow(Date.now());
      setSubscriptionActionBusy(null);
      try {
        await refreshSubscriptionViews();
      } catch {}
    } catch (error) {
      setContinueDispatch(null);
      setSubscriptionActionError(
        readErrorMessage(error, "Failed to continue recurring billing."),
      );
      setSubscriptionActionBusy(null);
    }
  }

  useEffect(() => {
    if (!activeContinuePaymentId || !continuePayment) return;
    if (!isTerminalPaymentStatus(continueStatus)) return;
    if (handledContinuePaymentId === activeContinuePaymentId) return;

    setHandledContinuePaymentId(activeContinuePaymentId);
    setSubscriptionActionBusy((current) =>
      current === "continue" ? null : current,
    );
    void refreshSubscriptionViews();
  }, [
    activeContinuePaymentId,
    continuePayment,
    continueStatus,
    handledContinuePaymentId,
  ]);

  useEffect(() => {
    if (!continueCountdownActive) return;

    const timer = window.setInterval(() => {
      setContinueCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [continueCountdownActive]);

  useEffect(() => {
    if (!activeContinuePaymentId) return;
    if (isTerminalPaymentStatus(continueStatus)) return;

    const dispatchStartedAtMs = continueDispatchStartedAtMs ?? Date.now();
    const now = Date.now();
    const timers = CONTINUE_PAYMENT_REFETCH_CHECKPOINTS_MS.map((checkpointMs) =>
      window.setTimeout(
        () => {
          void queryClient.invalidateQueries({
            queryKey: [continuePaymentRoute],
          });
          void refetchContinuePayment();
        },
        Math.max(0, dispatchStartedAtMs + checkpointMs - now),
      ),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    activeContinuePaymentId,
    continueDispatchStartedAtMs,
    continuePaymentRoute,
    continueStatus,
    refetchContinuePayment,
  ]);

  if (!isSubscriptionCampaign) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7A7A7A]">
          Subscription Management
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#111]">
          This campaign is not on recurring billing
        </h2>
        <p className="mt-2 text-sm text-[#6E6E6E]">
          Subscription controls appear here only for campaigns purchased on the
          recurring crypto rail.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      {/* This page is the single home for recurring campaign billing status and
          actions so overview stays focused on campaign content and launch state. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f766e]">
            Subscription Management
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111]">
            Current subscription
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#6E6E6E]">
            Manage auto-renew, see the current paid-through window, and continue
            manually when the server marks the subscription as requiring action.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-[420px]">
          <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
            {canPauseRecurring || subscriptionActionBusy === "pause" ? (
              <Button
                type="button"
                disabled={!canPauseRecurring}
                className="rounded-full bg-[#132238] text-white hover:bg-[#0f172a]"
                onClick={handlePauseRecurring}
              >
                {subscriptionActionBusy === "pause"
                  ? "Pausing..."
                  : "Pause auto-pay"}
              </Button>
            ) : null}
            {canUnpauseRecurring || subscriptionActionBusy === "unpause" ? (
              <Button
                type="button"
                disabled={!canUnpauseRecurring}
                className="rounded-full bg-[#0f766e] text-white hover:bg-[#115e59]"
                onClick={handleUnpauseRecurring}
              >
                {subscriptionActionBusy === "unpause"
                  ? "Unpausing..."
                  : "Resume auto-pay"}
              </Button>
            ) : null}
            {canContinueRecurring ||
            subscriptionActionBusy === "continue" ||
            isContinueFlowActive ? (
              <Button
                type="button"
                disabled={!canContinueRecurring || continueCountdownActive}
                className="rounded-full bg-[#0EA5A5] text-white hover:bg-[#0C9A9A]"
                onClick={() => setContinueConfirmOpen(true)}
              >
                {subscriptionActionBusy === "continue"
                  ? "Submitting..."
                  : continueCountdownActive
                    ? `Continue again in ${formatCountdownMs(
                        continueCountdownRemainingMs,
                      )}`
                    : isContinueFlowActive
                      ? "Continue now"
                      : "Continue now"}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F7FAFA] p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Status
              </div>
              <div className="mt-2 text-lg font-semibold text-[#111]">
                {isResolvingSubscription
                  ? "Loading subscription"
                  : !paymentSubscription
                    ? "Unavailable"
                    : paymentSubscription.manualContinueRequired
                      ? "Action required"
                      : paymentSubscription.status === "paused"
                        ? "Paused"
                        : paymentSubscription.autoRenew
                          ? "Active"
                          : "Active until billing date"}
              </div>
            </div>
            <div className="rounded-2xl bg-[#F7FAFA] p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Amount
              </div>
              <div className="mt-2 text-lg font-semibold text-[#111]">
                {formatCryptoMinor(paymentSubscription?.amount ?? null)}
              </div>
            </div>
            <div className="rounded-2xl bg-[#F7FAFA] p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Paid through
              </div>
              <div className="mt-2 text-sm font-semibold text-[#111]">
                {formatDateTime(paymentSubscription?.period?.currentEndAt)}
              </div>
            </div>
            {showNextBillingDate ? (
              <div className="rounded-2xl bg-[#F7FAFA] p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
                  Next billing date
                </div>
                <div className="mt-2 text-sm font-semibold text-[#111]">
                  {formatUtcDate(paymentSubscription?.nextBillingDateUtc)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ContinueNowConfirmDialog
        open={continueConfirmOpen}
        onOpenChange={setContinueConfirmOpen}
        subjectLabel="campaign subscription"
        walletAddress={paymentSubscription?.authorization?.crypto?.walletAddress}
        loading={subscriptionActionBusy === "continue"}
        onConfirm={handleContinueRecurring}
      />
      <SubscriptionAllowanceRefillDialog
        open={allowanceRefillOpen}
        onOpenChange={setAllowanceRefillOpen}
        subjectLabel="campaign subscription"
        walletAddress={paymentSubscription?.authorization?.crypto?.walletAddress}
        chainId={paymentSubscription?.authorization?.crypto?.chainId}
        tokenAddress={paymentSubscription?.authorization?.crypto?.tokenAddress}
        spenderAddress={
          paymentSubscriptionAllowance?.spenderAddress ??
          paymentSubscription?.authorization?.crypto?.recurringContractAddress
        }
        currentAllowanceAtomic={currentAllowanceAtomic}
        onSuccess={refreshSubscriptionViews}
      />

      {showContinueProgress ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${
            continueStatus === "succeeded"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : continueStatus === "failed" || continueStatus === "canceled"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.24em]">
            Continue Now Status
          </div>
          <div className="mt-2 text-base font-semibold">
            {continueStatus === "succeeded"
              ? "Recovery payment confirmed"
              : continueStatus === "failed"
                ? "Recovery payment failed"
                : continueStatus === "canceled"
                  ? "Recovery payment canceled"
                  : continueTxHash
                    ? "Keeper transaction submitted"
                    : continuePaymentLoading || continuePaymentFetching
                      ? "Request accepted"
                      : "Recovery payment created"}
          </div>
          <p className="mt-2 text-sm">
            {continueStatus === "succeeded"
              ? "The backend confirmed the retry and refreshed this campaign's recurring subscription."
              : continueStatus === "failed" || continueStatus === "canceled"
                ? continueFailureReason?.includes("did not complete within 2 minutes")
                  ? "The previous retry timed out. You can start a fresh Continue now attempt."
                  : "The retry finished without restoring auto-renew."
                : continueCountdownActive
                  ? `Waiting for backend confirmation. Continue now unlocks in ${formatCountdownMs(
                      continueCountdownRemainingMs,
                    )}.`
                  : continueTxHash
                    ? "Waiting for backend confirmation from the recurring payment listener."
                    : "Preparing the keeper retry for this subscription."}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Request accepted
              </div>
              <div className="mt-2 text-sm font-semibold">
                {showContinueProgress ? "Yes" : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Recovery payment
              </div>
              <div className="mt-2 break-all text-sm font-semibold">
                {activeContinuePaymentId || "Creating..."}
              </div>
            </div>
            <div className="rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Keeper transaction
              </div>
              {continueTxHash ? (
                <TxHashLink txHash={continueTxHash} />
              ) : (
                <div className="mt-2 break-all text-sm font-semibold">
                  Submitting from server...
                </div>
              )}
            </div>
            <div className="rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Payment status
              </div>
              <div className="mt-2 text-sm font-semibold capitalize">
                {continueStatus || "processing"}
              </div>
            </div>
          </div>

          {continueDispatchedAt ? (
            <div className="mt-3 rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Dispatched at
              </div>
              <div className="mt-2 text-sm font-semibold">
                {formatDateTime(continueDispatchedAt)}
              </div>
            </div>
          ) : null}

          {hasPendingRecoveryPayment ? (
            <div className="mt-3 rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Continue button
              </div>
              <div className="mt-2 text-sm font-semibold">
                {continueCountdownActive
                  ? `Disabled for ${formatCountdownMs(
                      continueCountdownRemainingMs,
                    )}`
                  : "Unlocked again"}
              </div>
            </div>
          ) : null}

          {continueFailureReason ? (
            <div className="mt-3 rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Failure reason
              </div>
              <div className="mt-2 text-sm font-semibold">
                {continueFailureReason}
              </div>
            </div>
          ) : null}

          {continuePaymentError ? (
            <div className="mt-3 rounded-xl bg-white/70 p-3 text-[#111]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                Polling status
              </div>
              <div className="mt-2 text-sm font-semibold">
                {readErrorMessage(
                  continuePaymentError,
                  "Waiting for backend confirmation.",
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {paymentSubscription?.manualContinueRequired && !showContinueProgress ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Automatic retry window is over. Continue manually to restart recurring
          billing.
        </div>
      ) : null}

      {subscriptionReadError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {subscriptionReadError}
        </div>
      ) : null}

      {!subscriptionReadError && paymentSubscriptionAllowanceError ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {readErrorMessage(
            paymentSubscriptionAllowanceError,
            "Failed to refresh allowance.",
          )}
        </div>
      ) : null}

      {subscriptionActionError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {subscriptionActionError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
            Current subscription
          </div>
          <div className="mt-2 break-all text-sm font-semibold text-[#111]">
            {paymentSubscription?._id ?? "—"}
          </div>
        </div>
        <SubscriptionAllowanceCard
          allowanceDisplay={formatAllowanceAmount(currentAllowanceAtomic)}
          tokenSymbol={
            paymentSubscriptionAllowance?.tokenSymbol ??
            paymentSubscription?.authorization?.crypto?.tokenSymbol ??
            BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC
          }
          targetDisplay={targetAllowanceDisplay}
          showRefill={canRefillAllowance}
          refillDisabled={!canRefillAllowance}
          onRefill={() => setAllowanceRefillOpen(true)}
        />
        <div className="rounded-2xl border border-black/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
            Auto renew
          </div>
          <div className="mt-2 text-sm font-semibold text-[#111]">
            {paymentSubscription?.manualContinueRequired
              ? "Waiting for manual continue"
              : paymentSubscription?.autoRenew
                ? "Enabled"
                : "Disabled"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="rounded-2xl border border-black/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
            Wallet
          </div>
          <div className="mt-2 break-all text-sm font-semibold text-[#111]">
            {paymentSubscription?.authorization?.crypto?.walletAddress ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/5 bg-[#FCFDFC] p-4">
        {/* This accordion keeps all payment intents for the current subscription
            together on one page, so owners can inspect the initial purchase and
            later renewals without leaving subscription management. */}
        <Accordion
          type="single"
          collapsible
          defaultValue="subscription-payments"
          className="w-full"
        >
          <AccordionItem value="subscription-payments" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
                  Subscription Payments
                </div>
                <div className="mt-2 text-left text-base font-semibold text-[#111]">
                  {paymentEntries.length > 0
                    ? `${paymentEntries.length} payment intent${
                        paymentEntries.length === 1 ? "" : "s"
                      } in this subscription`
                    : "No payment intents recorded yet"}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              {subscriptionPaymentsLoading || subscriptionPaymentsFetching ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-5 text-sm text-[#6E6E6E]">
                  Loading subscription payments...
                </div>
              ) : subscriptionPaymentsError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {readErrorMessage(
                    subscriptionPaymentsError,
                    "Failed to load payment intents for this subscription.",
                  )}
                </div>
              ) : paymentEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-5 text-sm text-[#6E6E6E]">
                  This subscription has not recorded any payment intents yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentEntries.map((payment) => {
                    const txHash = formatPaymentTxHash(payment);
                    const paymentFailureReason = getPaymentFailureReason(payment);
                    return (
                      <div
                        key={payment._id}
                        className={`rounded-2xl border p-4 ${getPaymentCardTone(
                          payment.status,
                        )}`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#111]">
                              {formatPaymentPhase(payment)}
                            </div>
                            <div className="mt-1 break-all text-xs text-[#6E6E6E]">
                              Payment ID: {payment._id}
                            </div>
                          </div>
                          <div
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${getPaymentStatusTone(
                              payment.status,
                            )}`}
                          >
                            {payment.status}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                              Amount
                            </div>
                            <div className="mt-2 text-sm font-semibold text-[#111]">
                              {formatCryptoMinor(payment.amount ?? null)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                              Created
                            </div>
                            <div className="mt-2 text-sm font-semibold text-[#111]">
                              {formatDateTime(payment.createdAt)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                              Charge phase
                            </div>
                            <div className="mt-2 text-sm font-semibold text-[#111]">
                              {String(payment.subscription?.chargePhase ?? "—")}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                              Trigger
                            </div>
                            <div className="mt-2 text-sm font-semibold text-[#111]">
                              {String(payment.subscription?.trigger ?? "—")}
                            </div>
                          </div>
                        </div>

                        {txHash ? (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                              Transaction
                            </div>
                            <TxHashLink txHash={txHash} />
                          </div>
                        ) : null}

                        {payment.status === "failed" && paymentFailureReason ? (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#7A7A7A]">
                              Failure reason
                            </div>
                            <div className="mt-2 text-sm font-semibold text-[#111]">
                              {paymentFailureReason}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
