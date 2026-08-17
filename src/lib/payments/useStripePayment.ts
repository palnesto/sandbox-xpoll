import { useState } from "react";
import { loadStripe, type StripePaymentElementOptions } from "@stripe/stripe-js";
import { requestStripePaymentIntent, type StripePaymentIntentResponse } from "./core";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Stripe bootstrap stays shared so every payment surface resolves the same
// client instance instead of each screen creating its own promise.
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export const stripeCardOnlyPaymentElementOptions: StripePaymentElementOptions = {
  wallets: {
    applePay: "never",
    googlePay: "never",
    link: "never",
  },
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useStripePayment() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const reset = () => {
    setClientSecret(null);
    setError(null);
  };

  async function start(input: {
    purpose: string;
    context: Record<string, unknown>;
    fallbackErrorMessage?: string;
  }): Promise<StripePaymentIntentResponse> {
    setError(null);
    setIsStarting(true);

    try {
      const paymentIntent = await requestStripePaymentIntent({
        purpose: input.purpose,
        context: input.context,
        missingClientSecretMessage:
          input.fallbackErrorMessage ?? "Failed to create Stripe payment intent.",
      });
      setClientSecret(paymentIntent.clientSecret);
      return paymentIntent;
    } catch (error: unknown) {
      setError(
        getErrorMessage(
          error,
          input.fallbackErrorMessage ?? "Failed to create Stripe payment intent.",
        ),
      );
      throw error;
    } finally {
      setIsStarting(false);
    }
  }

  return {
    clientSecret,
    error,
    isStarting,
    reset,
    start,
  };
}
