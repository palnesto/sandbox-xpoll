import { LEVELS } from "@/config/levelConfig";
import { cn } from "@/lib/utils";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  stripeCardOnlyPaymentElementOptions,
  stripePromise,
} from "@/lib/payments/useStripePayment";

const ANIM_DURATION_MS = 2000;
const START_DELAY_MS = 700;
const EASE_STRONG_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

const SUBSCRIPTION_TERMS = `XPOLL Subscription Terms & Services

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

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(String(email).trim());
}

export type SubscriptionPurpose =
  | "soul-bound-subscription"
  | "ad-experience-subscription"
  | "web3-launch-campaign";

export type SubscriptionMeData = {
  emailAuth?: {
    email?: string | null;
  };
  googleEmail?: string | null;
  soulbound?: {
    canBuyNow?: boolean;
  };
  profile?: {
    level?: number;
    civicScore?: number;
    apps?: {
      xpoll?: { username?: string };
    };
  };
};

function OfflineCheckoutFormInModal(props: {
  onSuccess?: () => void;
  onCancel?: () => void;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !ready || loading) return;

    setLoading(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: props.returnUrl,
      },
    });

    if (error) {
      setError(error.message ?? "Payment failed");
      setLoading(false);
      return;
    }

    props.onSuccess?.();
  };

  return (
    <form onSubmit={pay} className="grid gap-4">
      <PaymentElement
        options={stripeCardOnlyPaymentElementOptions}
        onReady={() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setReady(true));
          });
        }}
      />

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={props.onCancel}
          disabled={loading}
          className="flex-1 h-[44px] rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || !ready || loading}
          className={cn(
            "flex-1 h-[44px] rounded-full bg-blue text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity",
            ready ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {loading ? "Confirming..." : "Confirm & Pay"}
        </button>
      </div>

      {!ready && (
        <p className="text-sm text-gray-500 text-center">
          Loading secure payment form...
        </p>
      )}
    </form>
  );
}

const VISIBLE_LEVELS = LEVELS.filter((l) => !l.isHidden);

export function LevelUpSuccessModal({
  open,
  onClose,
  previousLevel,
  currentLevel,
}: {
  open: boolean;
  onClose: () => void;
  previousLevel: number;
  currentLevel: number;
}) {
  const prevIndex = VISIBLE_LEVELS.findIndex((l) => l.id === previousLevel);
  const currIndex = VISIBLE_LEVELS.findIndex((l) => l.id === currentLevel);
  const startPct = prevIndex >= 0 ? prevIndex * 100 : 0;
  const endPct = currIndex >= 0 ? currIndex * 100 : 0;

  const [xPct, setXPct] = useState(startPct);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!open) return;
    setXPct(startPct);
    setAnimate(false);
    const t = setTimeout(() => {
      setAnimate(true);
      requestAnimationFrame(() => setXPct(endPct));
    }, START_DELAY_MS);
    return () => clearTimeout(t);
  }, [open, startPct, endPct]);

  const currentBadge =
    VISIBLE_LEVELS.find((l) => l.id === currentLevel) ?? VISIBLE_LEVELS[0];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl border border-black/10"
      >
        <h3 className="text-xl font-bold text-slate-900 text-center">
          You have been leveled up
        </h3>

        <div
          className="px-4 my-4 rounded-2xl border border-slate-200"
          style={{
            background:
              "linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 58.84%)",
          }}
        >
          <div className="relative w-20 h-20 mx-auto overflow-hidden">
            <div
              className={cn(
                "absolute inset-0 flex items-center will-change-transform",
                animate && "transition-transform",
              )}
              style={{
                transform: `translateX(-${xPct}%)`,
                transitionDuration: animate
                  ? `${ANIM_DURATION_MS}ms`
                  : undefined,
                transitionTimingFunction: animate ? EASE_STRONG_OUT : undefined,
              }}
            >
              {VISIBLE_LEVELS?.map((lvl) => (
                <figure
                  key={lvl.id}
                  className="w-full shrink-0 flex items-center justify-center"
                >
                  <img
                    src={lvl.image}
                    alt={lvl.title}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </figure>
              ))}
            </div>
          </div>
          <h4 className="font-bold text-gray-800 pb-2 rounded-2xl text-center">
            {currentBadge.title}
          </h4>
          <p className="text-sm text-gray-600 font-medium text-center">
            LEVEL {currentBadge.id}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-[44px] rounded-full bg-blue text-white font-semibold hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function EmailSuccessModal({
  open,
  onClose,
  videoUrl,
}: {
  open: boolean;
  onClose: () => void;
  videoUrl?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl border border-black/10"
      >
        {videoUrl ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
            Video
          </div>
        )}
        <p className="mt-4 text-center text-slate-700">
          Check your email for more details.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-[44px] rounded-full bg-blue text-white font-semibold hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function SubscriptionModal(props: {
  open: boolean;
  onClose: () => void;
  purpose: SubscriptionPurpose;
  ctaText: string;
  meData: SubscriptionMeData | Record<string, unknown> | null;
  nextLevelCivicScore: number;
  clientSecret: string | null;
  onStripeClick: (contactEmail: string) => void;
  onCryptoClick: (contactEmail: string) => void;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
  creatingStripePayment: boolean;
  creatingCryptoPayment: boolean;
  stripeEnabled?: boolean;
  cryptoEnabled?: boolean;
  cryptoPaymentLabel?: string | null;
  cryptoStatusText?: string | null;
  cryptoError?: string | null;
}) {
  const {
    open,
    onClose,
    purpose,
    ctaText,
    meData,
    clientSecret,
    onStripeClick,
    onCryptoClick,
    onPaymentSuccess,
    onPaymentCancel,
    creatingStripePayment,
    creatingCryptoPayment,
    stripeEnabled = true,
    cryptoEnabled = true,
    cryptoPaymentLabel,
    cryptoStatusText,
    cryptoError,
  } = props;
  const [view, setView] = useState<"form" | "terms">("form");
  const rawMe = meData as SubscriptionMeData | null;
  const initialEmail = rawMe?.googleEmail ?? rawMe?.emailAuth?.email ?? "";
  const [email, setEmail] = useState(initialEmail);

  const [termsChecked, setTermsChecked] = useState(false);

  const soulboundCanBuyNow = rawMe?.soulbound?.canBuyNow ?? true;
  const soulboundBlocked =
    purpose === "soul-bound-subscription" && !soulboundCanBuyNow;
  const emailValid = isValidEmail(email);
  const emailFilled = email.trim() !== "";

  useEffect(() => {
    if (open) {
      setView("form");
      setEmail(initialEmail);
      setTermsChecked(false);
    }
  }, [open, initialEmail]);

  if (!open) return null;

  const showPaymentInModal = Boolean(clientSecret);

  return (
    <div className="fixed inset-0 z-[10000]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => {
          if (!showPaymentInModal) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-black/10"
      >
        <button
          type="button"
          onClick={() => {
            if (showPaymentInModal) onPaymentCancel();
            else onClose();
          }}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {showPaymentInModal ? (
          <>
            <h3 className="text-lg font-semibold text-slate-900 pr-8">
              Complete Payment
            </h3>
            <p className="mt-1 text-sm text-slate-500">{ctaText}</p>
            <div className="mt-4">
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: clientSecret! }}
              >
                <OfflineCheckoutFormInModal
                  onSuccess={onPaymentSuccess}
                  onCancel={onPaymentCancel}
                  returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/subscriptionSuccessful?type=${encodeURIComponent(purpose)}`}
                />
              </Elements>
            </div>
          </>
        ) : view === "terms" ? (
          <>
            <h3 className="text-lg font-semibold text-slate-900 pr-8">
              XPOLL Subscription Terms & Services
            </h3>
            <div className="mt-4 whitespace-pre-line text-sm text-slate-700 max-h-[50vh] overflow-y-auto">
              {SUBSCRIPTION_TERMS}
            </div>
            <button
              type="button"
              onClick={() => setView("form")}
              className="mt-6 w-full h-[44px] rounded-full bg-blue text-white font-semibold hover:opacity-90"
            >
              I, Agree
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-slate-900 pr-8">
              {ctaText}
            </h3>

            <div className="mt-4 space-y-4">
              {/* <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  readOnly
                  value={username}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your Current Civic score (Civic Score needed for next level :{" "}
                  {nextLevelCivicScore})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={civicScore}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700"
                  />
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    start polling
                  </button>
                </div>
              </div> */}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2",
                    email.trim() && !emailValid
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:ring-gray-200 bg-white text-slate-800",
                  )}
                />
                {email.trim() && !emailValid && (
                  <p className="mt-1 text-xs text-red-600">
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-blue"
                />
                <label htmlFor="terms" className="text-xs text-slate-700">
                  By checking this box, I confirm I agree to XPOLL&apos;s
                  Subscription Terms & Services.
                </label>
              </div>
              <button
                type="button"
                onClick={() => setView("terms")}
                className="text-blue text-sm font-bold underline hover:no-underline"
              >
                READ T&C
              </button>

              {soulboundBlocked && (
                <p className="text-xs text-red-600">
                  Your current Soul-bound subscription is still active. You can
                  buy again after expiry.
                </p>
              )}

              <button
                type="button"
                disabled={
                  !emailFilled ||
                  !emailValid ||
                  !termsChecked ||
                  creatingStripePayment ||
                  creatingCryptoPayment ||
                  !stripeEnabled ||
                  soulboundBlocked
                }
                onClick={() => onStripeClick(email.trim())}
                className={cn(
                  "w-full h-[48px] rounded-full flex items-center justify-between px-6 font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed",
                  emailFilled &&
                    emailValid &&
                    termsChecked &&
                    !creatingStripePayment &&
                    !creatingCryptoPayment &&
                    stripeEnabled &&
                    !soulboundBlocked
                    ? "bg-[#14b8a6] hover:opacity-90"
                    : "bg-gray-300",
                )}
              >
                <span>
                  {creatingStripePayment ? "Starting..." : ctaText}
                </span>
                <span className="text-white/90 text-sm font-normal">
                  stripe
                </span>
              </button>

              <button
                type="button"
                disabled={
                  !emailFilled ||
                  !emailValid ||
                  !termsChecked ||
                  creatingStripePayment ||
                  creatingCryptoPayment ||
                  !cryptoEnabled ||
                  soulboundBlocked
                }
                onClick={() => onCryptoClick(email.trim())}
                className={cn(
                  "w-full h-[48px] rounded-full flex items-center justify-between px-6 font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed",
                  emailFilled &&
                    emailValid &&
                    termsChecked &&
                    !creatingStripePayment &&
                    !creatingCryptoPayment &&
                    cryptoEnabled &&
                    !soulboundBlocked
                    ? "bg-[#0f766e] hover:opacity-90"
                    : "bg-gray-300",
                )}
              >
                <span>
                  {creatingCryptoPayment
                    ? "Processing..."
                    : cryptoPaymentLabel ?? "Pay with USDC"}
                </span>
                <span className="text-white/90 text-sm font-normal">USDC</span>
              </button>

              {cryptoStatusText && (
                <p className="text-xs text-slate-600">{cryptoStatusText}</p>
              )}

              {cryptoError && (
                <p className="text-xs text-red-600">{cryptoError}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
