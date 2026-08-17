import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Wallet } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { cn } from "@/lib/utils";
import {
  getCampaignOwnerAccessState,
  getCampaignTier,
  getCampaignVisibility,
  isBasicCampaign,
} from "@/lib/campaign";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
  getEnabledCryptoPrice,
  getEnabledFiatPrice,
  getEnabledSubscriptionCryptoPrice,
} from "@/lib/payments/buy-config";
import { CampaignPlanCheckoutModal } from "@/components/payment/campaign-plan-checkout";
import type { ApiCampaignById, CampaignPlan } from "@/types/campaigns";
import { Button } from "@/components/ui/button";
import { formatMoneyFromMinor } from "@/utils/currency-plans";
import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";
import addInfoImg from "@/assets/campaigns/01-add-info.png";
import addTrailsImg from "@/assets/campaigns/02-add-trails.png";
import addBlogsImg from "@/assets/campaigns/03-add-blogs.png";
import launchImg from "@/assets/campaigns/04-launch.png";

function getPlanPrimaryPriceLabel(plan: CampaignPlan) {
  const usd = getEnabledFiatPrice(plan.buyConfig, "USD");
  if (usd) {
    return formatMoneyFromMinor(usd.entry.rateInMinor, usd.key);
  }

  const usdc = getEnabledCryptoPrice(
    plan.buyConfig,
    BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
  );
  if (usdc) {
    return `${formatTokenAmountFromMinor(
      usdc.entry.rateInMinor,
      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
    )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
  }

  const recurringUsdc = getEnabledSubscriptionCryptoPrice(
    plan.buyConfig,
    BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
  );
  if (recurringUsdc) {
    return `${formatTokenAmountFromMinor(
      recurringUsdc.entry.rateInMinor,
      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
    )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
  }

  return "Pricing unavailable";
}

function getPlanRailSummary(plan: CampaignPlan) {
  const rails: string[] = [];

  if (getEnabledFiatPrice(plan.buyConfig, "USD")) rails.push("Fiat one-time");
  if (
    getEnabledCryptoPrice(plan.buyConfig, BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC)
  ) {
    rails.push("Crypto one-time");
  }
  if (
    getEnabledSubscriptionCryptoPrice(
      plan.buyConfig,
      BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
    )
  ) {
    rails.push("Crypto subscription");
  }

  return rails.join(" • ");
}

function getCompatiblePaidPlans(input: {
  plans: CampaignPlan[];
  campaign: ApiCampaignById | null;
}) {
  const isPoliticalValue = (input.campaign as any)?.isPolitical;
  const donationSupportedValue =
    input.campaign?.currentPlan?.donation?.supported;
  const hasPoliticalFlag = typeof isPoliticalValue === "boolean";
  const hasDonationFlag = typeof donationSupportedValue === "boolean";

  return input.plans
    .filter((plan) => plan.isActive)
    .filter((plan) => plan.archivedAt == null)
    .filter((plan) => !isBasicCampaign(plan))
    .filter((plan) =>
      hasPoliticalFlag ? plan.isPolitical === isPoliticalValue : true,
    )
    .filter((plan) =>
      hasDonationFlag
        ? plan.donationSupported === donationSupportedValue
        : true,
    );
}

function scrollClosestScrollableToBottom(fromEl: HTMLElement | null) {
  if (typeof window === "undefined") return;

  let node: HTMLElement | null = fromEl;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight;
    if (isScrollable) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      return;
    }
    node = node.parentElement;
  }

  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: "smooth",
  });
}

type BasicStepCardProps = {
  step: number;
  title: string;
  description: string;
  imgSrc: string;
  onClick: () => void;
};

function BasicStepCard({
  step,
  title,
  description,
  imgSrc,
  onClick,
}: BasicStepCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative aspect-[5/1.7] overflow-hidden rounded-xl bg-[#162EA8] xl:aspect-[5/2]",
        "shadow-[0_1px_2px_rgba(15,29,29,0.06),0_4px_14px_-6px_rgba(15,29,29,0.12)]",
        "transition-[transform,box-shadow] duration-[350ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        "hover:-translate-y-[3px] hover:shadow-[0_14px_36px_-14px_rgba(15,29,29,0.35),0_2px_6px_rgba(15,29,29,0.08)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
      )}
    >
      <img
        src={imgSrc}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          "outline outline-1 -outline-offset-1 outline-black/[0.04]",
          "transition-transform duration-500 group-hover:scale-[1.06]",
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <span
        className={cn(
          "absolute top-2.5 left-2.5 inline-flex h-6 items-center justify-center rounded-full px-2.5",
          "text-[11px] font-bold uppercase tracking-wider text-gray-900",
          "ring-1 ring-white/70 shadow-sm bg-white/80",
          "backdrop-blur-[10px] backdrop-saturate-[160%]",
        )}
      >
        Step {step}
      </span>

      <span
        className={cn(
          "absolute top-2.5 right-2.5 inline-flex h-6 items-center gap-1 rounded-full px-2.5",
          "text-[11px] font-semibold text-gray-900",
          "ring-1 ring-white/70 shadow-sm bg-white/80",
          "backdrop-blur-[10px] backdrop-saturate-[160%]",
          "translate-x-[6px] opacity-90",
          "transition-[transform,opacity] duration-[350ms]",
          "group-hover:translate-x-0 group-hover:opacity-100",
        )}
      >
        Open <span aria-hidden>→</span>
      </span>

      <div className="absolute inset-x-0 bottom-0 p-3 text-left text-white">
        <div className="text-[15px] font-bold leading-tight">{title}</div>
        <div className="mt-0.5 text-[11px] leading-tight opacity-90">
          {description}
        </div>
      </div>
    </button>
  );
}

export function CampaignPlanStatePanel(props: {
  campaignId: string;
  campaign: ApiCampaignById | null;
  initialUpgradeOpen?: boolean;
}) {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  const [showUpgradePlans, setShowUpgradePlans] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] =
    useState<CampaignPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const tier = getCampaignTier(props.campaign);
  const visibility = getCampaignVisibility(props.campaign);
  const ownerAccessState = getCampaignOwnerAccessState(props.campaign);
  const billingMode = props.campaign?.billing?.mode ?? null;
  const isBasic = tier === "basic";
  const isMainOwner = props.campaign?.ownership?.type !== "co-owner";

  const { data: plansResponse, isLoading: isPlansLoading } = useApiQuery(
    endpoints.campaigns.plans,
    { enabled: isBasic && isMainOwner } as any,
  );

  const paidPlans = useMemo(() => {
    const plans = Array.isArray(plansResponse?.data?.data)
      ? (plansResponse.data.data as CampaignPlan[])
      : [];
    return getCompatiblePaidPlans({
      plans,
      campaign: props.campaign,
    });
  }, [plansResponse, props.campaign]);

  const description = isBasic
    ? visibility === "unlisted"
      ? "This Basic campaign can appear to users in its selected country once live. Anyone with the direct URL can still open the campaign page."
      : "This Basic campaign uses the free entry tier and can be upgraded any time."
    : billingMode === "subscription"
      ? "This campaign is on subscription billing. Use Subscription Management for renewals and allowance controls."
      : "This campaign is on one-time paid billing and follows the normal paid campaign flow.";

  useEffect(() => {
    if (props.initialUpgradeOpen && isBasic && isMainOwner) {
      setShowUpgradePlans(true);
    }
  }, [isBasic, isMainOwner, props.initialUpgradeOpen]);

  const upgradePlansContainer =
    isBasic && showUpgradePlans ? (
      <div className="mt-5 rounded-2xl border border-[#D9E4EC] bg-[#F8FBFD] p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-[#132238]">
            Choose a paid plan
          </h3>
          <p className="text-sm text-[#64748B]">
            Upgrades replace Basic immediately. Queue mode is not available for Basic campaigns.
          </p>
        </div>

        {isPlansLoading ? (
          <div className="mt-4 text-sm text-[#64748B]">Loading paid plans...</div>
        ) : paidPlans.length === 0 ? (
          <div className="mt-4 text-sm text-[#64748B]">
            No compatible paid plans are available for this campaign right now.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {paidPlans.map((plan) => (
              <div
                key={plan._id}
                className={cn(
                  "rounded-2xl border border-[#D8E3EA] bg-white p-4 transition-colors",
                  selectedUpgradePlan?._id === plan._id &&
                    "border-[#0EA5A5] bg-[#F0FDFF]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#132238]">
                      {plan.name}
                    </div>
                    <div className="mt-1 text-xs text-[#64748B]">
                      {plan.durationDays
                        ? `${plan.durationDays} days`
                        : "Campaign plan"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#111]">
                      {getPlanPrimaryPriceLabel(plan)}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-[#64748B]">
                  {getPlanRailSummary(plan)}
                </p>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    className="rounded-full bg-[#132238] px-4 text-white hover:bg-[#0f172a]"
                    onClick={() => {
                      setSelectedUpgradePlan(plan);
                      setCheckoutOpen(true);
                    }}
                  >
                    Choose plan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : null;

  const paymentRequiredNotice =
    ownerAccessState === "payment_required" ? (
      <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
        Payment is required to restore full owner access to this paid campaign.
      </div>
    ) : null;

  return (
    <>
      {isBasic ? (
        <section
          ref={sectionRef}
          className="mb-4 w-full overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(15,29,29,0.04),0_8px_24px_-12px_rgba(15,29,29,0.08)]"
        >
          <div className="grid grid-cols-1 items-stretch lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.9fr)]">
            {/* LEFT PANEL */}
            <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
              <div>
                <div className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-teal-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_0_3px_rgba(13,148,136,0.12)]" />
                  <span>Campaign plan state</span>
                </div>

                <h2 className="mt-2 text-[28px] font-bold leading-[1.02] tracking-[-0.02em] text-gray-900 2xl:text-[38px]">
                  Basic campaign
                </h2>

                <p className="mt-2.5 max-w-[44ch] text-xs 2xl:text-[14.5px] leading-[1.6] text-gray-600 [text-wrap:pretty]">
                  {description}
                </p>

                {isMainOwner ? (
                  <div className="mt-4">
                    <CampaignStatePills
                      input={props.campaign}
                      ownershipType={props.campaign?.ownership?.type}
                      billingMode={billingMode}
                      showBillingMode={false}
                    />
                  </div>
                ) : null}
              </div>

              {/* Setup progress */}
              {/* <div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    Setup progress
                  </div>
                  <div className="text-[12px] text-gray-500 tabular-nums">
                    <span className="font-semibold text-gray-900">0</span>
                    <span>&nbsp;/&nbsp;4 steps</span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  <div className="h-1.5 rounded-full bg-gray-100" />
                  <div className="h-1.5 rounded-full bg-gray-100" />
                  <div className="h-1.5 rounded-full bg-gray-100" />
                  <div className="h-1.5 rounded-full bg-gray-100" />
                </div>
                <p className="mt-2 text-[12px] text-gray-500">
                  Complete each step on the right to go live.
                </p>
              </div> */}

              {/* Upgrade mini-card */}
              {isMainOwner ? (
                <div
                  className="relative overflow-hidden rounded-xl p-4 ring-1 ring-teal-100/70"
                  style={{
                    background:
                      "linear-gradient(135deg, #ECFEFA 0%, #FFFFFF 55%, #F6FFFD 100%)",
                  }}
                >
                  <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full bg-teal-200/40 blur-2xl" />

                  <div className="relative flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-teal-100 shadow-[0_1px_2px_rgba(13,148,136,0.1)]">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3 L13.5 9.5 L20 11 L13.5 12.5 L12 19 L10.5 12.5 L4 11 L10.5 9.5 Z" />
                        <path
                          d="M19.5 3 L20.2 5.2 L22.5 6 L20.2 6.8 L19.5 9 L18.8 6.8 L16.5 6 L18.8 5.2 Z"
                          opacity=".55"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold text-gray-900">
                          Unlock Pro
                        </span>
                        <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                          NEW
                        </span>
                      </div>
                      <p className="mt-0.5 2xl:text-[12.5px] text-xs leading-[1.45] text-gray-600 [text-wrap:pretty]">
                        Full paid discovery, petitions, QR, and paid billing rails.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setShowUpgradePlans((current) => !current)
                        }
                        className={cn(
                          "group mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2",
                          "bg-teal-600 text-xs 2xl:text-[13px] font-semibold text-white hover:bg-teal-700",
                          "shadow-[0_8px_22px_-10px_rgba(13,148,136,0.6),0_1px_0_rgba(255,255,255,0.2)_inset]",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                          "transition-[transform,background-color,box-shadow] duration-200",
                          "active:scale-[0.96]",
                        )}
                      >
                        Upgrade now
                        <span
                          aria-hidden
                          className="transition-transform duration-200 group-hover:translate-x-[2px]"
                        >
                          →
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* RIGHT PANEL: 2×2 banners */}
            <div className="grid grid-cols-1 content-start gap-2 bg-gray-50/40 p-4 sm:grid-cols-2 xl:gap-3 xl:p-8 xl:pl-0">
              <BasicStepCard
                step={1}
                title="Add Info"
                description="Complete your campaign details"
                imgSrc={addInfoImg}
                onClick={() =>
                  navigate(`/campaigns/edit/${props.campaignId}/add-info`)
                }
              />
              <BasicStepCard
                step={2}
                title="Add Trails"
                description="A sequence of polls for your audience"
                imgSrc={addTrailsImg}
                onClick={() =>
                  navigate(`/campaigns/edit/${props.campaignId}/trails/create`)
                }
              />
              <BasicStepCard
                step={3}
                title="Add Blogs"
                description="Share your opinion. Link your trails."
                imgSrc={addBlogsImg}
                onClick={() =>
                  navigate(`/campaigns/edit/${props.campaignId}/blog/create`)
                }
              />
              <BasicStepCard
                step={4}
                title="Launch"
                description="Go live from the overview page."
                imgSrc={launchImg}
                onClick={() =>
                  scrollClosestScrollableToBottom(sectionRef.current)
                }
              />
            </div>
          </div>

          {paymentRequiredNotice || upgradePlansContainer ? (
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              {paymentRequiredNotice}
              {upgradePlansContainer}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mb-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#132238]">
                {ownerAccessState === "payment_required" ? (
                  <LockKeyhole className="h-4 w-4 text-[#B91C1C]" />
                ) : (
                  <Wallet className="h-4 w-4 text-[#117C7C]" />
                )}
                <span>Paid campaign state</span>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-[#111]">
                  Paid campaign
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5B5B5B]">
                  {description}
                </p>
              </div>

              <CampaignStatePills
                input={props.campaign}
                ownershipType={props.campaign?.ownership?.type}
                billingMode={billingMode}
                showBillingMode={!isBasic}
              />
            </div>
          </div>

          {paymentRequiredNotice}
        </section>
      )}

      <CampaignPlanCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        mode="upgrade"
        campaignId={props.campaignId}
        campaignName={props.campaign?.name ?? "Campaign"}
        campaignGoal={props.campaign?.goal ?? ""}
        campaignIsPolitical={Boolean((props.campaign as any)?.isPolitical)}
        selectedPlan={selectedUpgradePlan}
      />
    </>
  );
}
