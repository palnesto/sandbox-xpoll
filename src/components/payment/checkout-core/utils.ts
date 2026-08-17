import type { PaymentFlowError, PaymentIntentRecord } from "@/lib/payments/core";
import type {
  CheckoutRail,
  CheckoutResult,
  CheckoutStage,
  CheckoutStep,
} from "./types";

type CheckoutLabels = {
  configure?: string;
  wallet?: string;
  review?: string;
  stripe?: string;
  result?: string;
};

const DEFAULT_CHECKOUT_LABELS: Required<CheckoutLabels> = {
  configure: "Configure",
  wallet: "Wallet",
  review: "Review",
  stripe: "Pay",
  result: "Result",
};

export function getCheckoutErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getDefaultCheckoutRail(input: {
  hasFiat: boolean;
  hasCrypto: boolean;
}): CheckoutRail | null {
  if (input.hasFiat && !input.hasCrypto) return "fiat";
  if (!input.hasFiat && input.hasCrypto) return "crypto";
  return null;
}

export function buildCheckoutSteps(input: {
  rail: CheckoutRail | null;
  stage: CheckoutStage;
  labels?: CheckoutLabels;
}): CheckoutStep[] {
  const labels = { ...DEFAULT_CHECKOUT_LABELS, ...input.labels };
  const sequence =
    input.rail === "crypto"
      ? [labels.configure, labels.wallet, labels.review, labels.result]
      : [labels.configure, labels.review, labels.stripe, labels.result];

  const currentLabel =
    input.stage === "configure"
      ? labels.configure
      : input.stage === "wallet"
        ? labels.wallet
        : input.stage === "review"
          ? labels.review
          : input.stage === "stripe"
            ? labels.stripe
            : labels.result;

  const currentIndex = Math.max(sequence.indexOf(currentLabel), 0);

  return sequence.map((label, index) => ({
    label,
    state:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "active"
          : "upcoming",
  }));
}

export function buildCheckoutResult(
  input: Partial<CheckoutResult> &
    Pick<CheckoutResult, "kind" | "title" | "description">,
): CheckoutResult {
  return {
    payment: null,
    paymentId: null,
    retryStage: "configure",
    txHash: null,
    ...input,
  };
}

export function mapStripeCheckoutFailureResult(
  payment: PaymentIntentRecord | null,
) {
  if (payment?.status === "canceled") {
    return buildCheckoutResult({
      kind: "canceled",
      title: "Payment canceled",
      description:
        "Your card payment was canceled before the purchase completed. You can review the order and try again.",
      payment,
      paymentId: payment?._id ?? null,
      retryLabel: "Back to review",
      retryStage: "review",
    });
  }

  return buildCheckoutResult({
    kind: "failed",
    title: "Payment failed",
    description:
      "The card payment did not complete. Review the order details or choose a different payment method.",
    payment,
    paymentId: payment?._id ?? null,
    retryLabel: "Back to review",
    retryStage: "review",
  });
}

export function mapCryptoCheckoutFlowError(
  error: PaymentFlowError,
  fallbackMessage: string,
) {
  switch (error.code) {
    case "WALLET_CONNECTION_CANCELED":
      return buildCheckoutResult({
        kind: "canceled",
        title: "Wallet connection canceled",
        description:
          "No wallet was connected, so the purchase could not continue.",
        retryLabel: "Connect wallet again",
        retryStage: "wallet",
      });
    case "USER_REJECTED":
      return buildCheckoutResult({
        kind: "canceled",
        title: "Transaction canceled",
        description:
          "The wallet request was closed before the payment was completed. Your order details are still preserved.",
        retryLabel: "Try wallet payment again",
        retryStage: "review",
      });
    case "PAYMENT_PENDING":
      return buildCheckoutResult({
        kind: "pending",
        title: "Verification still pending",
        description:
          "Your payment was sent successfully. We are still confirming it before marking the purchase complete.",
        retryLabel: "Back to review",
        retryStage: "review",
      });
    default:
      return buildCheckoutResult({
        kind: "failed",
        title: "Crypto payment failed",
        description: fallbackMessage,
        retryLabel: "Back to review",
        retryStage: "review",
      });
  }
}
