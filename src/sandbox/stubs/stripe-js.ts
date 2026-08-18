/**
 * Sandbox stub for `@stripe/stripe-js`.
 *
 * `loadStripe` normally fetches Stripe's JS from their CDN. Here it resolves to
 * a placeholder so nothing is loaded and no publishable key is needed.
 */

export type StripePaymentElementOptions = Record<string, unknown>;
export type Stripe = Record<string, unknown>;
export type StripeElements = Record<string, unknown>;

export async function loadStripe(_publishableKey?: string) {
  return {} as Stripe;
}
