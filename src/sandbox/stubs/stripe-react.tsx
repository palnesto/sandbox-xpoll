/**
 * Sandbox stub for `@stripe/react-stripe-js`.
 *
 * No Stripe account, no card tokenisation, no charge. `PaymentElement` renders a
 * look-alike card form pre-filled with the standard Stripe test card, and
 * `confirmPayment` always resolves as succeeded after a short pause.
 *
 * The field values are never read or transmitted — they exist only so a
 * walkthrough can reach the success screen without typing anything.
 */

import { useEffect, type ReactNode } from "react";

/** Passthrough — there is no Stripe context to provide. */
export function Elements({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

/**
 * Visual stand-in for Stripe's Payment Element.
 *
 * Pre-filled with the standard Stripe test card so a walkthrough can reach the
 * success screen without typing anything. The fields stay editable, but the
 * values are never read: `confirmPayment` below always resolves as succeeded and
 * no card data leaves the component.
 */
const TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12 / 34",
  cvc: "123",
} as const;

export function PaymentElement({
  onReady,
  onChange,
}: {
  options?: unknown;
  onReady?: (element?: unknown) => void;
  onChange?: (event: { complete: boolean; empty: boolean }) => void;
} = {}) {
  const fieldClass =
    "w-full rounded-md border border-black/10 bg-black/[0.02] px-3 py-2.5 text-sm text-black/70 outline-none focus:border-black/30";

  /**
   * The real Stripe element signals readiness/completeness before checkout will
   * enable its submit button. Fire both once on mount, otherwise "Confirm and
   * pay" stays permanently disabled.
   */
  useEffect(() => {
    onReady?.();
    onChange?.({ complete: true, empty: false });
  }, [onReady, onChange]);

  return (
    <div className="rounded-lg border border-black/15 bg-white p-4">
      <span className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-black/50">
        Card details
      </span>

      <div className="space-y-2">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25"
            aria-hidden
          >
            <rect
              x="2"
              y="5"
              width="20"
              height="14"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            aria-label="Card number"
            defaultValue={TEST_CARD.number}
            className={`${fieldClass} pl-9`}
            inputMode="numeric"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Expiry date"
            defaultValue={TEST_CARD.expiry}
            className={fieldClass}
            inputMode="numeric"
          />
          <input
            aria-label="Security code"
            defaultValue={TEST_CARD.cvc}
            className={fieldClass}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}

export function CardElement() {
  return <PaymentElement />;
}

export function LinkAuthenticationElement() {
  return null;
}

export function AddressElement() {
  return null;
}

/** Minimal Elements instance; the real one is only used to submit the form. */
export function useElements() {
  return {
    submit: async () => ({ error: undefined }),
    getElement: () => null,
    update: () => {},
  };
}

/** Only `confirmPayment` is used by the app. Always resolves as succeeded. */
export function useStripe() {
  return {
    confirmPayment: async () => {
      await new Promise((r) => setTimeout(r, 1500));
      return {
        paymentIntent: {
          id: "pi_demo_sandbox",
          status: "succeeded",
          amount: 4900,
          currency: "usd",
        },
        error: undefined,
      };
    },
    confirmSetup: async () => ({
      setupIntent: { id: "seti_demo_sandbox", status: "succeeded" },
      error: undefined,
    }),
    retrievePaymentIntent: async () => ({
      paymentIntent: { id: "pi_demo_sandbox", status: "succeeded" },
      error: undefined,
    }),
  };
}
