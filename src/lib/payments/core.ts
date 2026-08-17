import apiInstance from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";

// Shared payment client types now include recurring campaign billing metadata
// so checkout, payment history, and campaign billing controls stay aligned.

export const PAYMENT_PROVIDER_CODE = {
  STRIPE: "stripe",
  EVM: "evm",
} as const;

export type PaymentProviderCode =
  (typeof PAYMENT_PROVIDER_CODE)[keyof typeof PAYMENT_PROVIDER_CODE];

export const BILLING_MODE = {
  ONE_TIME: "one_time",
  SUBSCRIPTION: "subscription",
} as const;

export type BillingMode = (typeof BILLING_MODE)[keyof typeof BILLING_MODE];

type ApiEnvelope<T> = {
  data?: T;
  success?: boolean;
  message?: string;
} & Record<string, unknown>;

function unwrapApiData<T>(payload: ApiEnvelope<T> | T): T {
  return ((payload as ApiEnvelope<T>)?.data ?? payload) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export type EvmPaymentQuotePayload = {
  chainId: number;
  networkKey: string;
  paymentContractAddress: `0x${string}`;
  tokenKey: string;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  tokenDecimals: number;
  expectedAmountAtomic: string;
  receiverAddress: `0x${string}`;
  quotedAt: string;
  expiresAt: string | null;
  minConfirmations: number;
  rateSnapshot?: Record<string, unknown> | null;
  quoteNonce?: string | null;
  signature?: string | null;
};

export type EvmPaymentIntentResponse = {
  paymentId: string;
  providerCode: "evm";
  billingMode?: BillingMode;
  amount: number;
  currency: string;
  subscription?: {
    paymentSubscriptionId?: string | null;
    chargePhase?: "initial" | "renewal";
    trigger?: "user_initiated" | "scheduled" | "recovery";
    target?: {
      entityType?: string;
      entityId?: string | null;
    } | null;
    cadence?: {
      intervalUnit?: "day" | "month";
      intervalCount?: number;
    } | null;
    plannedPeriodStartAt?: string | null;
    plannedPeriodEndAt?: string | null;
    cycleKey?: string;
    attemptKey?: string;
    contractPlanId?: string;
  } | null;
  quote: {
    kind: "crypto";
    provider: "evm";
    pricing: {
      currency: string;
      amountMinor: number;
    };
    payload: EvmPaymentQuotePayload;
  };
};

export type StripePaymentIntentResponse = {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
};

export type PaymentSubscriptionContinueDispatchResponse = {
  paymentId: string;
  paymentSubscriptionId: string;
  trigger: "recovery";
  status: "processing";
  txHash: string | null;
  dispatchedAt: string | null;
};

export type PaymentIntentRecord = {
  _id: string;
  status: "created" | "processing" | "succeeded" | "failed" | "canceled";
  amount?: number | null;
  currency?: string | null;
  billingMode?: BillingMode;
  subscription?: {
    paymentSubscriptionId?: string | null;
    chargePhase?: "initial" | "renewal";
    trigger?: "user_initiated" | "scheduled" | "recovery";
    target?: {
      entityType?: string;
      entityId?: string | null;
    } | null;
    cadence?: {
      intervalUnit?: "day" | "month";
      intervalCount?: number;
    } | null;
    plannedPeriodStartAt?: string | null;
    plannedPeriodEndAt?: string | null;
    cycleKey?: string;
    attemptKey?: string;
    contractPlanId?: string;
  } | null;
  invoiceUrl?: string | null;
  display?: {
    rail?: "fiat" | "crypto";
    fiat?: {
      currency?: string | null;
      amountMinor?: number | null;
      amountReceivedMinor?: number | null;
      providerPaymentId?: string | null;
      providerEventId?: string | null;
    } | null;
    crypto?: {
      currency?: string | null;
      amountAtomic?: string | null;
      tokenSymbol?: string | null;
      tokenDecimals?: number | null;
      txHash?: string | null;
      chainId?: number | null;
      tokenAddress?: string | null;
      payerAddress?: string | null;
      receiverAddress?: string | null;
      amountMinorEquivalent?: number | null;
    } | null;
  } | null;
  provider?: {
    code?: string | null;
    family?: string | null;
  };
  quote?: {
    kind?: string | null;
    pricing?: {
      currency?: string | null;
      amountMinor?: number | null;
    } | null;
    payload?: {
      tokenSymbol?: string | null;
      tokenDecimals?: number | null;
      expectedAmountAtomic?: string | null;
      chainId?: number | null;
      tokenAddress?: string | null;
      receiverAddress?: string | null;
    } & Record<string, unknown>;
  } | null;
  settlement?: {
    kind?: string | null;
    payload?: {
      txHash?: string | null;
      tokenSymbol?: string | null;
      tokenDecimals?: number | null;
      amountAtomic?: string | null;
      chainId?: number | null;
      tokenAddress?: string | null;
      payerAddress?: string | null;
      receiverAddress?: string | null;
      amountMinorEquivalent?: number | null;
    } & Record<string, unknown>;
  } | null;
  context?: ({
    recurringDispatch?: {
      at?: string | null;
      txHash?: string | null;
      trigger?: "scheduled" | "recovery" | null;
      error?: string | null;
    } | null;
    failure?: {
      at?: string | null;
      eventType?: string | null;
      providerStatus?: string | null;
      reason?: string | null;
      source?: string | null;
    } | null;
  } & Record<string, unknown>) | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PaymentIntentListResponse = {
  subscriptionId?: string;
  total: number;
  page: number;
  pageSize: number;
  entries: PaymentIntentRecord[];
};

export type PaymentSubscriptionRecord = {
  _id: string;
  externalAccountId: string;
  purpose: string;
  status: "active" | "paused";
  autoRenew: boolean;
  pauseReason: string | null;
  currency: string;
  amount: number;
  provider?: {
    family?: "crypto";
    code?: "evm";
    refs?: {
      subscriptionId?: string | null;
      paymentReference?: string | null;
    } | null;
    state?: {
      providerStatus?: string | null;
      lastSyncedAt?: string | null;
    } | null;
  } | null;
  authorization?: {
    kind?: "crypto";
    crypto?: {
      walletAddress?: string | null;
      chainId?: number | null;
      recurringContractAddress?: string | null;
      tokenSymbol?: string | null;
      tokenAddress?: string | null;
      tokenDecimals?: number | null;
      allowance?: {
        amountAtomic?: string | null;
        lastSyncedAt?: string | null;
      } | null;
    } | null;
  } | null;
  cadence?: {
    intervalUnit?: "day" | "month";
    intervalCount?: number;
  } | null;
  period?: {
    currentStartAt?: string | null;
    currentEndAt?: string | null;
    nextChargeAt?: string | null;
  } | null;
  nextBillingDateUtc?: string | null;
  autoAttemptWindowStartDateUtc?: string | null;
  lastAttemptDateUtc?: string | null;
  manualContinueRequired?: boolean;
  target?: {
    entityType?: string;
    entityId?: string;
  } | null;
  offer?: {
    sourceType?: string;
    sourceId?: string;
    title?: string;
    snapshot?: Record<string, unknown>;
  } | null;
  lastPaymentIntentId?: string | null;
  attemptLock?: {
    locked?: boolean;
    paymentIntentId?: string | null;
    lockedAt?: string | null;
    trigger?: "scheduled" | "recovery" | null;
    cycleKey?: string | null;
    attemptKey?: string | null;
  } | null;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PaymentSubscriptionAllowance = {
  subscriptionId: string;
  walletAddress: string;
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  allowanceAtomic: string;
  lastSyncedAt: string;
};

export type PaymentClientStateStatus = "canceled" | "failed";

export type PaymentFlowErrorCode =
  | "USER_REJECTED"
  | "WALLET_CONNECTION_CANCELED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED";

export type PaymentFlowError = Error & {
  code?: PaymentFlowErrorCode;
  handledInUi?: boolean;
  recoveryStage?: "wallet" | "review" | "result";
};

export async function requestPaymentIntent(input: {
  purpose: string;
  context: Record<string, unknown>;
  providerCode?: PaymentProviderCode;
  billingMode?: BillingMode;
}) {
  const response = await apiInstance.post(endpoints.payment.createPaymentIntent, input);
  return unwrapApiData(response.data) as EvmPaymentIntentResponse | StripePaymentIntentResponse;
}

export async function fetchPaymentIntentById(paymentId: string) {
  const response = await apiInstance.get(endpoints.payment.getPaymentById(paymentId));
  return unwrapApiData(response.data) as PaymentIntentRecord;
}

export async function fetchPaymentSubscriptionById(subscriptionId: string) {
  const response = await apiInstance.get(endpoints.payment.getPaymentSubscriptionById(subscriptionId));
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function fetchPaymentSubscriptionAllowance(subscriptionId: string) {
  const response = await apiInstance.get(endpoints.payment.getPaymentSubscriptionAllowance(subscriptionId));
  return unwrapApiData(response.data) as PaymentSubscriptionAllowance;
}

export async function pausePaymentSubscriptionById(subscriptionId: string) {
  const response = await apiInstance.post(endpoints.payment.pausePaymentSubscription(subscriptionId));
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function unpausePaymentSubscriptionById(subscriptionId: string) {
  const response = await apiInstance.post(endpoints.payment.unpausePaymentSubscription(subscriptionId));
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function continuePaymentSubscriptionById(subscriptionId: string) {
  const response = await apiInstance.post(endpoints.payment.continuePaymentSubscription(subscriptionId));
  return unwrapApiData(response.data) as PaymentSubscriptionContinueDispatchResponse;
}

// Campaign-scoped wrappers keep the subscription-management page tied to one
// campaign instead of leaking user-wide subscription list concerns into the UI.
export async function fetchCampaignPaymentSubscription(campaignId: string) {
  const response = await apiInstance.get(endpoints.campaigns.getCampaignSubscription(campaignId));
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function fetchCampaignPaymentSubscriptionPayments(
  campaignId: string,
  input?: { page?: number; pageSize?: number },
) {
  const response = await apiInstance.get(
    endpoints.campaigns.getCampaignSubscriptionPayments(
      campaignId,
      input?.page ?? 1,
      input?.pageSize ?? 20,
    ),
  );
  return unwrapApiData(response.data) as PaymentIntentListResponse;
}

export async function fetchCampaignPaymentSubscriptionAllowance(campaignId: string) {
  const response = await apiInstance.get(endpoints.campaigns.getCampaignSubscriptionAllowance(campaignId));
  return unwrapApiData(response.data) as PaymentSubscriptionAllowance;
}

export async function pauseCampaignPaymentSubscription(campaignId: string) {
  const response = await apiInstance.post(endpoints.campaigns.pauseCampaignSubscription(campaignId));
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function unpauseCampaignPaymentSubscription(campaignId: string) {
  const response = await apiInstance.post(endpoints.campaigns.unpauseCampaignSubscription(campaignId));
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function continueCampaignPaymentSubscription(campaignId: string) {
  const response = await apiInstance.post(endpoints.campaigns.continueCampaignSubscription(campaignId));
  return unwrapApiData(response.data) as PaymentSubscriptionContinueDispatchResponse;
}

export async function fetchSoulboundPaymentSubscription() {
  const response = await apiInstance.get(endpoints.profile.getSoulboundSubscription);
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function fetchSoulboundPaymentSubscriptionPayments(input?: {
  page?: number;
  pageSize?: number;
}) {
  const response = await apiInstance.get(
    endpoints.profile.getSoulboundSubscriptionPayments(
      input?.page ?? 1,
      input?.pageSize ?? 20,
    ),
  );
  return unwrapApiData(response.data) as PaymentIntentListResponse;
}

export async function fetchSoulboundPaymentSubscriptionAllowance() {
  const response = await apiInstance.get(endpoints.profile.getSoulboundSubscriptionAllowance);
  return unwrapApiData(response.data) as PaymentSubscriptionAllowance;
}

export async function pauseSoulboundPaymentSubscription() {
  const response = await apiInstance.post(endpoints.profile.pauseSoulboundSubscription);
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function unpauseSoulboundPaymentSubscription() {
  const response = await apiInstance.post(endpoints.profile.unpauseSoulboundSubscription);
  return unwrapApiData(response.data) as PaymentSubscriptionRecord;
}

export async function continueSoulboundPaymentSubscription() {
  const response = await apiInstance.post(endpoints.profile.continueSoulboundSubscription);
  return unwrapApiData(response.data) as PaymentSubscriptionContinueDispatchResponse;
}

export async function updatePaymentIntentClientState(input: {
  paymentId: string;
  status: PaymentClientStateStatus;
  reason?: string;
  txHash?: string | null;
}) {
  const response = await apiInstance.patch(
    endpoints.payment.updatePaymentClientState(input.paymentId),
    {
      status: input.status,
      reason: input.reason,
      txHash: input.txHash ?? null,
    },
  );
  return unwrapApiData(response.data) as PaymentIntentRecord;
}

export async function waitForPaymentIntentTerminalState(
  paymentId: string,
  options?: {
    attempts?: number;
    intervalMs?: number;
  },
) {
  const attempts = options?.attempts ?? 45;
  const intervalMs = options?.intervalMs ?? 2000;
  let lastFetchError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const payment = await fetchPaymentIntentById(paymentId);
      lastFetchError = null;

      if (
        payment.status === "succeeded" ||
        payment.status === "failed" ||
        payment.status === "canceled"
      ) {
        return payment;
      }
    } catch (error) {
      lastFetchError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (lastFetchError instanceof Error) {
    // Treat repeated polling request errors as an unresolved confirmation state,
    // not as a terminal payment failure. Callers decide whether that means
    // "pending" or a provider-specific fallback.
    throw new Error("Payment confirmation timed out on the server.");
  }

  throw new Error("Payment confirmation timed out on the server.");
}

function createPaymentFlowError(
  message: string,
  code: PaymentFlowErrorCode,
  options?: {
    recoveryStage?: "wallet" | "review" | "result";
  },
): PaymentFlowError {
  const error = new Error(message) as PaymentFlowError;
  error.code = code;
  error.handledInUi = true;
  error.recoveryStage = options?.recoveryStage ?? "result";
  return error;
}

export function createHandledUserRejectedError() {
  return createPaymentFlowError("Transaction canceled.", "USER_REJECTED");
}

export function createHandledWalletConnectionCanceledError() {
  return createPaymentFlowError(
    "Wallet connection canceled.",
    "WALLET_CONNECTION_CANCELED",
    { recoveryStage: "wallet" },
  );
}

export function createHandledPaymentPendingError(message: string) {
  return createPaymentFlowError(message, "PAYMENT_PENDING", {
    recoveryStage: "result",
  });
}

export function createHandledPaymentFailedError(
  message: string,
  options?: {
    recoveryStage?: "wallet" | "review" | "result";
  },
) {
  return createPaymentFlowError(message, "PAYMENT_FAILED", options);
}

export function createHandledReviewRecoveryError(message: string) {
  return createPaymentFlowError(message, "PAYMENT_FAILED", {
    recoveryStage: "review",
  });
}

export function getPaymentProviderCode(
  payment: PaymentIntentRecord | null | undefined,
): PaymentProviderCode | null {
  const providerCode = String(payment?.provider?.code ?? "").toLowerCase();
  if (providerCode === PAYMENT_PROVIDER_CODE.EVM) {
    return PAYMENT_PROVIDER_CODE.EVM;
  }
  if (providerCode === PAYMENT_PROVIDER_CODE.STRIPE) {
    return PAYMENT_PROVIDER_CODE.STRIPE;
  }

  if (payment?.display?.rail === "crypto" || payment?.quote?.kind === "crypto") {
    return PAYMENT_PROVIDER_CODE.EVM;
  }

  if (payment?.display?.rail === "fiat") {
    return PAYMENT_PROVIDER_CODE.STRIPE;
  }

  return null;
}

export function createHandledWalletRecoveryError(message: string) {
  return createPaymentFlowError(message, "PAYMENT_FAILED", {
    recoveryStage: "wallet",
  });
}

export function isPaymentFlowHandledError(
  error: unknown,
): error is PaymentFlowError {
  return isRecord(error) && Boolean(error.handledInUi);
}

export function isEvmPaymentIntentResponse(
  value: unknown,
): value is EvmPaymentIntentResponse {
  if (!isRecord(value)) return false;
  const quote = value.quote;
  return (
    value.providerCode === PAYMENT_PROVIDER_CODE.EVM &&
    isRecord(quote) &&
    quote.kind === "crypto" &&
    quote.provider === PAYMENT_PROVIDER_CODE.EVM &&
    isRecord(quote.payload)
  );
}

export function isStripePaymentIntentResponse(
  value: unknown,
): value is StripePaymentIntentResponse {
  return (
    isRecord(value) &&
    typeof value.paymentId === "string" &&
    typeof value.clientSecret === "string" &&
    value.clientSecret.trim().length > 0
  );
}

export async function requestStripePaymentIntent(input: {
  purpose: string;
  context: Record<string, unknown>;
  missingClientSecretMessage?: string;
}) {
  const paymentIntent = await requestPaymentIntent({
    purpose: input.purpose,
    context: input.context,
    providerCode: PAYMENT_PROVIDER_CODE.STRIPE,
  });

  // Centralize the Stripe response shape check so every payment surface does
  // not need to duplicate the same clientSecret validation.
  if (!isStripePaymentIntentResponse(paymentIntent)) {
    throw new Error(
      input.missingClientSecretMessage ?? "Failed to create Stripe payment intent.",
    );
  }

  return paymentIntent;
}
