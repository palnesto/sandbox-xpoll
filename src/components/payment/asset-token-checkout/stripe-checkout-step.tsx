import { useEffect, useState, type FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { ArrowRight, Loader2 } from "lucide-react";

import {
  buildCheckoutResult,
  type CheckoutResult,
} from "@/components/payment/checkout-core";
import {
  AssetMetric,
  CheckoutSection,
  FooterButton,
  NoticePanel,
  ResultActions,
} from "@/components/payment/checkout-ui";
import {
  fetchPaymentIntentById,
  type PaymentIntentRecord,
} from "@/lib/payments/core";
import {
  stripeCardOnlyPaymentElementOptions,
  stripePromise,
} from "@/lib/payments/useStripePayment";
import type { AssetMarketCard } from "./types";
import { formatUsd } from "./utils";

type StripeCheckoutStepProps = {
  clientSecret: string;
  paymentId: string;
  asset: AssetMarketCard;
  quantity: number;
  totalUsdMinor: number | null;
  onBack: () => void;
  onResolved: (result: CheckoutResult) => Promise<void> | void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

export function StripeCheckoutStep(props: StripeCheckoutStepProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
      <StripeCheckoutFormInner {...props} />
    </Elements>
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

function StripeCheckoutFormInner(props: StripeCheckoutStepProps) {
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
            "Your card payment has been confirmed and the asset purchase is now being reflected in your account.",
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
          <AssetMetric label="Asset" value={props.asset.parentLabel} />
          <AssetMetric label="Tokens" value={props.quantity.toLocaleString()} />
          <AssetMetric
            label="Total"
            value={formatUsd(props.totalUsdMinor) ?? "Pending"}
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

      <ResultActions>
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
      </ResultActions>
    </form>
  );
}
