import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import {
  getDefaultCheckoutRail,
  type CheckoutRail,
} from "@/components/payment/checkout-core";
import { PAYMENT_INTENT_PURPOSE } from "@/components/payment/payment-configs";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
  getEnabledCryptoPrice,
  getEnabledFiatPrice,
  getEnabledSubscriptionCryptoPrice,
  normalizePurchasableBuyConfig,
  type PurchasableBuyConfig,
} from "@/lib/payments/buy-config";
import type { OfflineProduct, OfflineProductPurpose } from "./types";

export const OFFLINE_PRODUCT_ORDER = [
  PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION,
  PAYMENT_INTENT_PURPOSE.AD_EXPERIENCE_SUBSCRIPTION,
  PAYMENT_INTENT_PURPOSE.WEB3_LAUNCH_CAMPAIGN,
] as const satisfies readonly OfflineProductPurpose[];

const offlinePurposeSet = new Set<string>(OFFLINE_PRODUCT_ORDER);

export const SUBSCRIPTION_TERMS = `XPOLL Subscription Terms & Services

Effective Date: 20th Feb, 2026

Platform: XPOLL (app.xpoll.io)

These Subscription Terms govern access to and use of XPOLL's paid subscription services, including:

Campaign Subscriptions
Advertising Subscriptions
Soul-Bound Subscription Reports

By purchasing or activating any XPOLL subscription, you agree to the following terms.

1. General Platform Disclaimer

XPOLL operates as a technology platform that enables users to create campaigns, polls, advertising placements, and data-driven insights.

XPOLL:

Does not create, control, or endorse user-generated campaigns or polls
Does not guarantee accuracy, reliability, or legality of user-submitted content
Is not responsible for opinions, claims, statements, or representations made within campaigns, advertisements, or polls
Does not verify the truthfulness of any poll or campaign content unless explicitly stated

All content created under subscriptions is solely the responsibility of the subscribing user or entity.

2. Campaign Subscription Terms

Campaign Subscriptions allow users to create and manage polling campaigns within the XPOLL platform.

2.1 User Responsibility

Campaign creators are solely responsible for:

The legality of their campaign content
Compliance with applicable local, national, and international laws
Political, financial, medical, or other regulated claims
Accuracy of descriptions, titles, and poll structures
Ensuring content does not violate intellectual property rights

XPOLL does not review, fact-check, or validate campaign claims before or after publication unless required by law.

2.2 No Liability for Campaign Outcomes

XPOLL:

Does not guarantee engagement levels
Does not guarantee poll participation
Does not guarantee revenue, conversions, or performance outcomes
Is not responsible for how campaign data is interpreted or used

Campaign data is provided "as-is."

2.3 Political & Sensitive Content

Campaign creators are fully responsible for compliance with election laws, disclosure laws, and advertising regulations applicable in their jurisdiction.

XPOLL is not liable for regulatory penalties incurred by campaign creators.

3. Advertising Subscription Terms

Advertising Subscriptions allow users to promote campaigns, products, or services within XPOLL.

3.1 Advertiser Responsibility

Advertisers are solely responsible for:

The legality and compliance of their advertisements
Truthfulness of claims
Regulatory compliance (FTC, SEC, election laws, etc.)
Obtaining necessary rights, licenses, and permissions

XPOLL does not independently verify advertising claims.

3.2 No Endorsement

Publication of an advertisement on XPOLL does not constitute endorsement, validation, or recommendation by XPOLL.

3.3 Ad Performance Disclaimer

XPOLL does not guarantee:

Impressions
Click-through rates
Conversions
Revenue outcomes
Specific audience targeting results

Advertising results vary based on user engagement and market conditions.

4. Soul-Bound Subscription Terms

Soul-Bound Subscriptions provide access to exclusive reporting, intelligence summaries, or data insights derived from poll participation and engagement.

4.1 Data Nature Disclaimer

Soul-Bound reports:

Reflect aggregated community sentiment
Do not represent verified facts
Are not financial, legal, medical, or political advice
Should not be relied upon as professional advisory guidance

All insights are informational only.

4.2 User-Generated Content

Soul-Bound reporting may include data derived from:

User polls
Campaign responses
Public engagement metrics

XPOLL does not guarantee accuracy of user-submitted responses.

4.3 No Liability for Decisions

XPOLL is not liable for:

Business decisions
Investment decisions
Political decisions
Personal decisions
Any action taken based on Soul-Bound insights

Users assume full responsibility for how they use subscription reports.

5. Content Moderation Rights

XPOLL reserves the right, but not the obligation, to:

Remove content
Suspend campaigns
Disable advertisements
Terminate subscriptions

If content:

Violates laws
Violates platform policies
Poses reputational or legal risk
Encourages harm, fraud, or illegal conduct

6. Indemnification

By subscribing, you agree to indemnify and hold harmless XPOLL, its founders, employees, affiliates, and partners from any claims, damages, liabilities, penalties, or legal actions arising from:

Campaign content
Advertisement content
Poll content
Regulatory violations
Intellectual property infringement
Misuse of subscription features

7. Subscription Billing & Refund Policy

All subscriptions are billed as specified at checkout.

Fees are non-refundable unless required by law.

XPOLL reserves the right to modify pricing with prior notice.

Cancellation does not entitle users to refunds for unused subscription periods.

8. Limitation of Liability

To the maximum extent permitted by law:

XPOLL shall not be liable for:

Indirect damages
Consequential damages
Lost profits
Regulatory fines
Reputational harm
Data misinterpretation

XPOLL's total liability shall not exceed the amount paid for the subscription in the preceding billing cycle.

9. No Guarantee of Platform Availability

XPOLL does not guarantee uninterrupted or error-free operation of subscription services.

Platform features may be modified, suspended, or discontinued at any time.

10. Governing Law

These Subscription Terms shall be governed by and construed in accordance with the laws of the State of Rhode Island, United States, without regard to its conflict of law principles.`;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRouteQuery(key: unknown): key is string {
  return typeof key === "string";
}

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(String(email).trim());
}

export function formatUsdMinor(amountMinor: number): string {
  const usd = amountMinor / 100;
  const fixed = Number.isInteger(usd) ? usd.toFixed(0) : usd.toFixed(2);
  return `$${fixed}/mo`;
}

export function formatUsdcMinorMonthly(amountMinor: number): string {
  return `${formatTokenAmountFromMinor(
    amountMinor,
    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}/mo`;
}

export function formatUsdcMinor(amountMinor: number): string {
  return `${formatTokenAmountFromMinor(
    amountMinor,
    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
}

export function getUsdPriceMinor(
  buyConfig: PurchasableBuyConfig | unknown,
): number | null {
  const usdPricing = getEnabledFiatPrice(buyConfig, "USD");
  return usdPricing?.entry.rateInMinor ?? null;
}

export function getUsdcPriceMinor(
  buyConfig: PurchasableBuyConfig | unknown,
): number | null {
  const usdcPricing = getEnabledCryptoPrice(
    buyConfig,
    BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
  );
  return usdcPricing?.entry.rateInMinor ?? null;
}

export function getSubscriptionUsdcPriceMinor(
  buyConfig: PurchasableBuyConfig | unknown,
): number | null {
  const usdcPricing = getEnabledSubscriptionCryptoPrice(
    buyConfig,
    BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
  );
  return usdcPricing?.entry.rateInMinor ?? null;
}

export function formatSubscriptionCadenceSuffix(
  buyConfig: PurchasableBuyConfig | unknown,
): string {
  const normalized = normalizePurchasableBuyConfig(buyConfig);
  const cadence = normalized?.subscription?.cadence ?? null;
  if (!cadence?.intervalUnit || !cadence?.intervalCount) return "";

  if (cadence.intervalUnit === "month" && cadence.intervalCount === 1) {
    return "/mo";
  }
  if (cadence.intervalUnit === "day" && cadence.intervalCount === 1) {
    return "/day";
  }

  return cadence.intervalUnit === "month"
    ? ` every ${cadence.intervalCount} months`
    : ` every ${cadence.intervalCount} days`;
}

export function getDefaultOfflineProductRail(
  product: OfflineProduct | null,
): CheckoutRail | null {
  if (!product) return null;
  return getDefaultCheckoutRail({
    hasFiat: getUsdPriceMinor(product.buyConfig) != null,
    hasCrypto: getUsdcPriceMinor(product.buyConfig) != null,
  });
}

export function extractProductList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data;
  return [];
}

export function toOfflineProduct(value: unknown): OfflineProduct | null {
  if (!isRecord(value)) return null;

  const purpose = String(value._id ?? "");
  if (!offlinePurposeSet.has(purpose)) return null;

  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name
      : "Subscription";
  const description =
    typeof value.description === "string" ? value.description : "";
  const ctaText =
    typeof value.ctaText === "string" && value.ctaText.trim().length > 0
      ? value.ctaText
      : "Buy Now";
  const features = Array.isArray(value.features)
    ? value.features.filter(
        (feature): feature is string =>
          typeof feature === "string" && feature.trim().length > 0,
      )
    : [];

  return {
    _id: purpose as OfflineProductPurpose,
    name,
    description,
    ctaText,
    features,
    buyConfig: normalizePurchasableBuyConfig(value.buyConfig),
    isActive: value.isActive !== false,
  };
}

export async function invalidateOfflineProductPurchaseQueries(
  paymentId?: string | null,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [endpoints.profile.me] }),
    queryClient.invalidateQueries({
      queryKey: [endpoints.payment.offlineProducts],
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
  ]);
}

export function getProductStatusLabel(purpose: OfflineProductPurpose) {
  if (purpose === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION) {
    return "Soul-bound access";
  }
  if (purpose === PAYMENT_INTENT_PURPOSE.AD_EXPERIENCE_SUBSCRIPTION) {
    return "Advertising subscription";
  }
  return "Launch campaign service";
}

export function getSuccessDescription(input: {
  purpose: OfflineProductPurpose;
  previousLevel?: number | null;
  currentLevel?: number | null;
}) {
  if (input.purpose === PAYMENT_INTENT_PURPOSE.SOUL_BOUND_SUBSCRIPTION) {
    if (
      input.previousLevel != null &&
      input.currentLevel != null &&
      input.currentLevel > input.previousLevel
    ) {
      return `Your Soul-bound subscription is active. Your profile level moved from ${input.previousLevel} to ${input.currentLevel}.`;
    }
    return "Your Soul-bound subscription is active. Your profile and payment history are now refreshing.";
  }

  if (input.purpose === PAYMENT_INTENT_PURPOSE.AD_EXPERIENCE_SUBSCRIPTION) {
    return "Your Ad Experience subscription is confirmed. Check your email for the next steps and delivery details.";
  }

  return "Your purchase is confirmed. Check your email for the next steps and delivery details.";
}
