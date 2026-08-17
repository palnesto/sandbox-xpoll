import React, { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PAYMENT_INTENT_PURPOSE,
  campaignSubscriptionModeZod,
} from "../payment-configs";
import { endpoints } from "@/api/endpoints";

// "type": "payment_intent.canceled"
// "type": "payment_intent.payment_failed"
// "type": "payment_intent.succeeded"
// "type": "payment_intent.processing"
// const dummyCards = {
//   failed: "4000000000009995",
//   processing: "4000000000000009",
// };
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const API_BASE = import.meta.env.VITE_BACKEND_URL;

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/campaigns/my-campaigns`,
      },
    });

    if (error) setError(error.message ?? "Payment failed");
    setLoading(false);
  };

  return (
    <form onSubmit={pay} style={{ display: "grid", gap: 12 }}>
      <PaymentElement />
      {error && <div style={{ color: "crimson" }}>{error}</div>}
      <button disabled={!stripe || !elements || loading}>
        {loading ? "Paying..." : `Confirm & Pay`}
      </button>
    </form>
  );
}

const createBody = {
  body: JSON.stringify({
    purpose: PAYMENT_INTENT_PURPOSE.PURCHASE_CAMPAIGN_PLAN,
    context: {
      planId: "P_1M_PLAN",
      extend_campaign_plan: null, // explicitly not extension
      create_campaign: {
        name: "The best campaign ever",
        goal: "The best goal ever",
        isPolitical: true,
      },
    },
  }),
};

const extendBody = {
  body: JSON.stringify({
    purpose: PAYMENT_INTENT_PURPOSE.PURCHASE_CAMPAIGN_PLAN,
    context: {
      planId: "NP_3M_PLAN",
      extend_campaign_plan: {
        campaignId: "696909693d2d9a46319c1a31",
        subscriptionMode: campaignSubscriptionModeZod.enum.REPLACE_NOW, // or "REPLACE_NOW"
      },
      create_campaign: null,
    },
  }),
};

export function SimpleUsdPayment() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const createIntent = async () => {
    setCreating(true);
    setServerError(null);
    setClientSecret(null);

    try {
      const res = await fetch(
        `${API_BASE}${endpoints.payment.createPaymentIntent}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          // body: createBody.body,
          body: extendBody.body,
        },
      );

      const data = await res.json();
      if (!res.ok || !data?.success || !data.data?.clientSecret)
        throw new Error(data.error || "Failed to create PaymentIntent");
      setClientSecret(data.data.clientSecret); // till here i am getting correct client secret
    } catch (e: any) {
      setServerError(e.message || "Server error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Pay (USD)</h2>

      {serverError && <div style={{ color: "crimson" }}>{serverError}</div>}

      {!clientSecret && (
        <button onClick={createIntent} disabled={creating}>
          {creating ? "Starting..." : "Pay now"}
        </button>
      )}

      {clientSecret && (
        <div style={{ marginTop: 16 }}>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </div>
      )}
    </div>
  );
}
