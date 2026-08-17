import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { isBasicCampaign } from "@/lib/campaign";
import type {
  ActiveModal,
  BasicCampaignCreateInput,
  CampaignPlan,
  CampaignStatus,
  FormValues,
} from "@/types/campaigns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import CampaignModals from "@/components/modals/campaign-modals";
import { CampaignPlanCheckoutModal } from "@/components/payment/campaign-plan-checkout";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCampaignFormZ } from "@/schema/campaign.schemas";
import { formatMoneyFromMinor } from "@/utils/currency-plans";
import { hardResetCreateCampaignStore } from "@/stores/create-campaign.store";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
  getEnabledCryptoPrice,
  getEnabledFiatPrice,
  getEnabledSubscriptionCryptoPrice,
} from "@/lib/payments/buy-config";
import { useNavigate } from "react-router-dom";
import { appToast } from "@/utils/toast";
import heroOctopus from "@/assets/campaigns/hero-octopus.png";

function pickDisplayPrice(
  plan: CampaignPlan | undefined,
  preferredCurrency = "USD",
) {
  return getEnabledFiatPrice(plan?.buyConfig, preferredCurrency);
}

type MainOwnedCampaign = {
  _id: string;
  name?: string;
  status?: CampaignStatus | string;
  tier?: "basic" | "paid";
  ownership?: {
    type?: "main-owner" | "co-owner" | string;
  } | null;
};

const ACTIVE_BASIC_SLOT_STATUSES = new Set<CampaignStatus>([
  "draft",
  "live",
  "paused",
]);

const BASIC_SLOT_MESSAGE =
  "You already have a Basic campaign. End it or upgrade it to create another Basic campaign.";

function getMyCampaignEntries(input: any): MainOwnedCampaign[] {
  const root = input?.data?.data ?? input?.data ?? input ?? {};
  if (Array.isArray(root?.entries)) return root.entries as MainOwnedCampaign[];
  if (Array.isArray(root)) return root as MainOwnedCampaign[];
  return [];
}

function buildMainOwnedCampaignsRoute() {
  const search = new URLSearchParams({
    page: "1",
    pageSize: "200",
    excludeCoOwned: "true",
  });
  return `${endpoints.campaigns.myCampaigns}?${search.toString()}`;
}

const SERIF_FONT_FAMILY = '"Instrument Serif", Georgia, "Times New Roman", serif';

export default function CreateCampaignsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    hardResetCreateCampaignStore();
  }, []);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<FormValues | null>(
    null,
  );
  const mainOwnedCampaignsRoute = useMemo(() => buildMainOwnedCampaignsRoute(), []);

  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    resolver: zodResolver(createCampaignFormZ),
    defaultValues: {
      campaignName: "",
      goal: "",
      getDataAccess: false,
      campaignType: "non_political",
      duration: "",
      agree: false,
    },
  });

  const agree = watch("agree");

  const campaignName = watch("campaignName") ?? "";
  const goal = watch("goal") ?? "";
  const getDataAccess = watch("getDataAccess");
  const campaignType = watch("campaignType");
  const duration = watch("duration");

  const isPolitical = campaignType === "political";

  const {
    data: plansRes,
    isLoading: plansLoading,
    error: plansError,
  } = useApiQuery(endpoints.campaigns.plans);
  const { data: myCampaignsResp } = useApiQuery(mainOwnedCampaignsRoute, {
    enabled: true,
  } as any);

  const { mutateAsync: createBasicCampaignAsync, isPending: isCreatingBasic } =
    useApiMutation<BasicCampaignCreateInput, any>({
      route: endpoints.campaigns.basic.create,
      method: "POST",
    });

  const allPlans = useMemo<CampaignPlan[]>(() => {
    return Array.isArray(plansRes?.data?.data)
      ? (plansRes.data.data as CampaignPlan[])
      : [];
  }, [plansRes]);
  const mainOwnedCampaigns = useMemo(
    () => getMyCampaignEntries(myCampaignsResp),
    [myCampaignsResp],
  );
  const occupiedBasicCampaign = useMemo(() => {
    return (
      mainOwnedCampaigns.find((campaign) => {
        const ownershipType = String(
          campaign?.ownership?.type ?? "main-owner",
        ).trim().toLowerCase();
        const normalizedStatus = String(campaign?.status ?? "")
          .trim()
          .toLowerCase() as CampaignStatus;

        return (
          ownershipType !== "co-owner" &&
          isBasicCampaign(campaign) &&
          ACTIVE_BASIC_SLOT_STATUSES.has(normalizedStatus)
        );
      }) ?? null
    );
  }, [mainOwnedCampaigns]);

  const filteredPlans = useMemo(() => {
    return (
      allPlans
        .filter((plan) => plan.isActive)
        .filter((plan) => plan.archivedAt == null)
        .filter((plan) => plan.isPolitical === isPolitical)
        .filter((plan) => plan.donationSupported === getDataAccess)
        .filter(
          (plan) =>
            isBasicCampaign(plan) ||
            pickDisplayPrice(plan, "USD") !== null ||
            getEnabledCryptoPrice(
              plan.buyConfig,
              BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
            ) !== null ||
            getEnabledSubscriptionCryptoPrice(
              plan.buyConfig,
              BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
            ) !== null,
        )
    );
  }, [allPlans, isPolitical, getDataAccess]);
  const selectablePlans = useMemo(() => {
    return filteredPlans.filter(
      (plan) => !(isBasicCampaign(plan) && occupiedBasicCampaign),
    );
  }, [filteredPlans, occupiedBasicCampaign]);

  useEffect(() => {
    if (!filteredPlans.length) return;

    const selectedCurrentPlan = filteredPlans.find((plan) => plan._id === duration);
    const selectedPlanBlocked =
      !!selectedCurrentPlan &&
      isBasicCampaign(selectedCurrentPlan) &&
      !!occupiedBasicCampaign;
    const stillValid = !!selectedCurrentPlan && !selectedPlanBlocked;

    if (stillValid) return;

    const nextSelectablePlan = selectablePlans[0];
    if (nextSelectablePlan) {
      setValue("duration", nextSelectablePlan._id, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (duration) {
      setValue("duration", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [filteredPlans, selectablePlans, occupiedBasicCampaign, duration, setValue]);

  const selectedPlan = useMemo(() => {
    return filteredPlans.find((plan) => plan._id === duration);
  }, [filteredPlans, duration]);
  const submittedPlan = useMemo(() => {
    if (!submittedSnapshot?.duration) return null;
    return (
      allPlans.find((plan) => plan._id === submittedSnapshot.duration) ?? null
    );
  }, [allPlans, submittedSnapshot]);

  const submittedRecurringCryptoPriceObj = useMemo(() => {
    return getEnabledSubscriptionCryptoPrice(
      submittedPlan?.buyConfig,
      BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
    );
  }, [submittedPlan]);
  const submittedPriceObj = useMemo(() => {
    return pickDisplayPrice(submittedPlan ?? undefined, "USD");
  }, [submittedPlan]);
  const submittedCryptoPriceObj = useMemo(() => {
    return getEnabledCryptoPrice(
      submittedPlan?.buyConfig,
      BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
    );
  }, [submittedPlan]);
  const selectedPlanIsBasic = useMemo(
    () => isBasicCampaign(selectedPlan),
    [selectedPlan],
  );
  const submittedPlanIsBasic = useMemo(
    () => isBasicCampaign(submittedPlan),
    [submittedPlan],
  );

  const submittedPriceDisplay = useMemo(() => {
    if (!submittedPriceObj) return "";
    return formatMoneyFromMinor(
      submittedPriceObj.entry.rateInMinor,
      submittedPriceObj.key,
    );
  }, [submittedPriceObj]);
  const submittedCryptoPriceLabel = useMemo(() => {
    if (!submittedCryptoPriceObj) return null;
    return `Pay ${formatTokenAmountFromMinor(
      submittedCryptoPriceObj.entry.rateInMinor,
      BUY_CONFIG_CRYPTO_DECIMALS.USDC,
    )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
  }, [submittedCryptoPriceObj]);
  const submittedPlanDisplayPrice = useMemo(() => {
    if (submittedPlanIsBasic) return "Free";
    if (submittedPriceDisplay) return submittedPriceDisplay;
    return submittedCryptoPriceLabel
      ? submittedCryptoPriceLabel.replace(/^Pay\s+/, "")
      : "";
  }, [
    submittedCryptoPriceLabel,
    submittedPlanIsBasic,
    submittedPriceDisplay,
  ]);
  const confirmActionLabel = submittedPlanIsBasic
    ? "Create campaign"
    : "Continue to checkout";

  const selectedPlanPriceLabel = useMemo(() => {
    if (!selectedPlan) return "—";
    if (isBasicCampaign(selectedPlan)) return "Free";
    const fiat = pickDisplayPrice(selectedPlan, "USD");
    if (fiat) {
      return formatMoneyFromMinor(fiat.entry.rateInMinor, fiat.key);
    }
    const crypto = getEnabledCryptoPrice(
      selectedPlan.buyConfig,
      BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
    );
    if (crypto) {
      return `${formatTokenAmountFromMinor(
        crypto.entry.rateInMinor,
        BUY_CONFIG_CRYPTO_DECIMALS.USDC,
      )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
    }
    return "—";
  }, [selectedPlan]);

  const openConfirm = async () => {
    const ok = await trigger([
      "campaignName",
      "goal",
      "campaignType",
      "duration",
    ]);
    if (!ok) return;
    if (selectedPlanIsBasic && occupiedBasicCampaign) {
      appToast.error(BASIC_SLOT_MESSAGE);
      return;
    }

    setSubmittedSnapshot({
      ...watch(),
      agree: false,
    });

    setActiveModal("confirm");
  };

  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (campaignType === "political") {
      setActiveModal("political");
    }
  }, [campaignType]);

  const handleConfirmAction = async () => {
    if (!submittedSnapshot || !submittedPlan) return;

    if (!isBasicCampaign(submittedPlan)) {
      setValue("agree", false, { shouldDirty: true });
      setActiveModal(null);
      setIsCheckoutOpen(true);
      return;
    }

    if (occupiedBasicCampaign) {
      appToast.error(BASIC_SLOT_MESSAGE);
      return;
    }

    try {
      const response = await createBasicCampaignAsync({
        name: submittedSnapshot.campaignName.trim(),
        goal: submittedSnapshot.goal.trim(),
        isPolitical: submittedSnapshot.campaignType === "political",
        initialPlanId: submittedPlan._id,
      });
      const createdCampaign = response?.data ?? null;
      const createdCampaignId = String(createdCampaign?._id ?? "").trim();

      if (!createdCampaignId) {
        throw new Error("Basic campaign was created but no campaign id was returned.");
      }

      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[0] === "string" &&
          queryKey[0].startsWith(endpoints.campaigns.myCampaigns),
      });

      setValue("agree", false, { shouldDirty: true });
      setActiveModal(null);
      hardResetCreateCampaignStore();
      appToast.success("Basic campaign created.");
      navigate(`/campaigns/edit/${createdCampaignId}/overview`, {
        replace: true,
      });
    } catch (error: any) {
      const errorCode = String(error?.response?.data?.code ?? "").trim();
      const message =
        errorCode === "BASIC_CAMPAIGN_SLOT_UNAVAILABLE"
          ? BASIC_SLOT_MESSAGE
          : error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Unable to create Basic campaign.";
      appToast.error(message);
    }
  };

  const handleSelectCategory = (next: "political" | "non_political") => {
    setValue("campaignType", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleToggleDataAccess = async () => {
    const next = !getDataAccess;
    setValue("getDataAccess", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    await trigger("duration");
    if (next) setActiveModal("dataAccess");
  };

  const continueDisabled = isSubmitting || !isValid;

  return (
    <div className="min-h-screen w-full bg-[#F2F4F7] pb-[140px] text-[#0a1220]">
      {/* HERO BAND */}
      <section className="relative isolate mx-3 mt-4 flex min-h-[300px] flex-col overflow-hidden rounded-[28px] bg-[#061826] text-white shadow-[0_30px_60px_-25px_rgba(11,42,107,0.35),0_8px_22px_rgba(10,18,32,0.08)] sm:mx-5 md:mx-8 md:min-h-[360px]">
        {/* Dedicated clip layer: transformed bg can flicker at rounded corners without this in some browsers */}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div
            className="cc-hero-bg absolute inset-0 bg-cover bg-[center_35%] bg-no-repeat"
            style={{ backgroundImage: `url(${heroOctopus})` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 80% at 25% 50%, rgba(6,18,30,0.85) 0%, rgba(6,18,30,0.3) 60%, transparent 100%), linear-gradient(180deg, rgba(6,18,30,0.4) 0%, transparent 30%, transparent 70%, rgba(6,18,30,0.6) 100%), radial-gradient(60% 60% at 80% 20%, rgba(0,212,255,0.18), transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 grid w-full grid-cols-1 items-end gap-10 px-6 py-10 sm:px-10 md:grid-cols-[minmax(0,1fr)_auto] md:px-14 md:pb-12 md:pt-14">
          <div>
            <span className="mb-4 inline-flex items-center gap-2.5 text-[13px] font-medium tracking-tight text-white/75">
              <span className="cc-pulse-ring h-1.5 w-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_0_4px_rgba(0,212,255,0.25)]" />
              New campaign
            </span>
            <h1 className="m-0 max-w-[18ch] text-[clamp(40px,5.5vw,84px)] font-bold leading-[0.96] tracking-[-0.04em] text-white">
              This is{" "}
              <span
                className="font-normal italic tracking-[-0.012em] text-[#00D4FF]"
                style={{ fontFamily: SERIF_FONT_FAMILY }}
              >
                next.
              </span>
            </h1>
            <p className="mt-4 max-w-[460px] text-[16px] font-normal leading-[1.55] text-white/75 md:text-[18px]">
              Launch your first campaign in minutes. Build intelligent campaigns
              with polls, trails, blogs, agents, and public engagement — all in
              one place.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="space-y-6"
      >
        {/* FORM PANEL */}
        <section className="mx-3 mt-6 rounded-3xl border border-[#ECF1F6] bg-white p-6 shadow-[0_6px_22px_-10px_rgba(10,18,32,0.06),0_2px_6px_rgba(10,18,32,0.03)] sm:mx-5 sm:p-8 md:mx-8 md:p-12 lg:p-14">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-[#ECF1F6] pb-6 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold leading-[1.15] tracking-[-0.025em] text-[#0a1220] md:text-[28px]">
                Tell us what your{" "}
                <span
                  className="font-normal italic text-[#0B2A6B]"
                  style={{ fontFamily: SERIF_FONT_FAMILY }}
                >
                  campaign
                </span>{" "}
                is about.
              </h2>
              <p className="mt-1.5 max-w-[460px] text-sm leading-[1.55] text-[#5b6573]">
                Give it a name people will remember and a clear objective. You
                can refine everything before launch.
              </p>
            </div>
            <div className="shrink-0 text-xs font-medium tracking-wide text-[#a0a8b5]">
              Step{" "}
              <strong className="text-sm font-bold text-[#0a1220]">01</strong> /
              04
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-9 gap-y-7 lg:grid-cols-2">
            {/* Campaign title */}
            <div className="flex flex-col gap-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="cc-title"
                  className="text-sm font-semibold tracking-tight text-[#0a1220]"
                >
                  Campaign title
                </label>
                <span className="text-xs tabular-nums text-[#a0a8b5]">
                  <strong className="font-medium text-[#1a2230]">
                    {campaignName.length}
                  </strong>{" "}
                  / 150
                </span>
              </div>
              <input
                id="cc-title"
                type="text"
                maxLength={150}
                placeholder="Give your campaign a name people remember"
                {...register("campaignName")}
                className={cn(
                  "w-full rounded-xl border bg-white px-4 py-3 text-[15px] leading-[1.5] text-[#0a1220] outline-none transition placeholder:text-[#a0a8b5] hover:border-[#C8D4E0] focus:border-[#00D4FF] focus:shadow-[0_0_0_4px_rgba(0,212,255,0.15)]",
                  errors.campaignName
                    ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
                    : "border-[#DCE5EE]",
                )}
              />
              {errors.campaignName && (
                <p className="text-xs text-red-600">
                  {errors.campaignName.message}
                </p>
              )}
            </div>

            {/* Campaign objective */}
            <div className="flex flex-col gap-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="cc-goal"
                  className="text-sm font-semibold tracking-tight text-[#0a1220]"
                >
                  Campaign objective
                </label>
                <span className="text-xs tabular-nums text-[#a0a8b5]">
                  <strong className="font-medium text-[#1a2230]">
                    {goal.length}
                  </strong>{" "}
                  / 150
                </span>
              </div>
              <textarea
                id="cc-goal"
                maxLength={150}
                placeholder="What conversation, outcome, or insight is this campaign built for?"
                {...register("goal")}
                className={cn(
                  "min-h-[110px] w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] leading-[1.5] text-[#0a1220] outline-none transition placeholder:text-[#a0a8b5] hover:border-[#C8D4E0] focus:border-[#00D4FF] focus:shadow-[0_0_0_4px_rgba(0,212,255,0.15)]",
                  errors.goal
                    ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
                    : "border-[#DCE5EE]",
                )}
              />
              {errors.goal && (
                <p className="text-xs text-red-600">{errors.goal.message}</p>
              )}
            </div>

            {/* Audience insights toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold tracking-tight text-[#0a1220]">
                Audience insights
              </label>
              <button
                type="button"
                onClick={handleToggleDataAccess}
                aria-pressed={!!getDataAccess}
                className={cn(
                  "flex min-h-[50px] select-none items-center justify-between gap-3.5 rounded-xl border bg-white px-4 py-3 text-left transition hover:border-[#C8D4E0]",
                  getDataAccess
                    ? "border-[#00D4FF]/40 bg-[#00D4FF]/5"
                    : "border-[#DCE5EE]",
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    getDataAccess
                      ? "font-semibold text-[#0B2A6B]"
                      : "font-medium text-[#1a2230]",
                  )}
                >
                  {getDataAccess ? "Yes" : "No"}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "relative h-6 w-[42px] shrink-0 rounded-full transition",
                    getDataAccess
                      ? "bg-gradient-to-br from-[#0CECDA] to-[#00D4FF]"
                      : "bg-[#DCE5EE]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(10,18,32,0.18)] transition",
                      getDataAccess ? "left-[21px]" : "left-[3px]",
                    )}
                  />
                </span>
              </button>
            </div>

            {/* Campaign category — segmented */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold tracking-tight text-[#0a1220]">
                Campaign category
              </label>
              <div
                role="radiogroup"
                aria-label="Campaign category"
                className="inline-flex w-full gap-1 rounded-xl border border-[#DCE5EE] bg-[#F2F4F7] p-1"
              >
                {(
                  [
                    { value: "political", label: "Political" },
                    { value: "non_political", label: "Non-Political" },
                  ] as const
                ).map((opt) => {
                  const active = campaignType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleSelectCategory(opt.value)}
                      className={cn(
                        "flex-1 rounded-lg px-3.5 py-2.5 text-center text-sm transition",
                        active
                          ? "bg-white font-semibold text-[#0a1220] shadow-[0_1px_3px_rgba(10,18,32,0.08),0_0_0_1px_#ECF1F6]"
                          : "font-medium text-[#5b6573] hover:text-[#1a2230]",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {errors.campaignType && (
                <p className="text-xs text-red-600">
                  {errors.campaignType.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* PRICING RAIL */}
        <section className="mx-3 sm:mx-5 md:mx-8">
          <div className="mb-4 flex flex-col items-start justify-between gap-2 px-1 md:flex-row md:items-end">
            <div>
              <h3 className="text-[22px] font-semibold tracking-[-0.022em] text-[#0a1220]">
                Pick your{" "}
                <span
                  className="font-normal italic text-[#0B2A6B]"
                  style={{ fontFamily: SERIF_FONT_FAMILY }}
                >
                  plan.
                </span>
              </h3>
              <p className="mt-1 text-sm text-[#5b6573]">
                Start free in your selected country, or extend your reach
                worldwide.
              </p>
            </div>
          </div>

          {plansLoading && (
            <div className="rounded-2xl border border-[#ECF1F6] bg-white p-7 text-sm text-[#5b6573]">
              Loading plans…
            </div>
          )}

          {plansError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-7 text-sm text-red-700">
              Failed to load plans.
            </div>
          )}

          {!plansLoading && !plansError && filteredPlans.length === 0 && (
            <div className="rounded-2xl border border-[#ECF1F6] bg-white p-7 text-sm text-[#5b6573]">
              No plans available for this selection.
            </div>
          )}

          {!plansLoading && !plansError && filteredPlans.length > 0 && (
            <div
              role="radiogroup"
              aria-label="Plan"
              className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {filteredPlans.map((plan) => {
                const active = duration === plan._id;
                const isBasicPlan = isBasicCampaign(plan);
                const isBasicPlanDisabled =
                  isBasicPlan && !!occupiedBasicCampaign;
                const priceObj = pickDisplayPrice(plan, "USD");
                const cryptoPriceObj = getEnabledCryptoPrice(
                  plan.buyConfig,
                  BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
                );
                const priceLabel = isBasicPlan
                  ? "Free"
                  : priceObj
                    ? formatMoneyFromMinor(
                        priceObj.entry.rateInMinor,
                        priceObj.key,
                      )
                    : cryptoPriceObj
                      ? `${formatTokenAmountFromMinor(
                          cryptoPriceObj.entry.rateInMinor,
                          BUY_CONFIG_CRYPTO_DECIMALS.USDC,
                        )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`
                      : "--";

                return (
                  <button
                    key={plan._id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={isBasicPlanDisabled}
                    onClick={() =>
                      setValue("duration", plan._id, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className={cn(
                      "group relative flex flex-col gap-3.5 rounded-[18px] border-[1.5px] p-5 text-left transition active:scale-[0.99]",
                      isBasicPlan
                        ? "bg-gradient-to-b from-[#E8F8F3] to-[#F4FBF8]"
                        : "bg-white",
                      active && isBasicPlan
                        ? "border-[#18B89E] shadow-[0_8px_24px_-8px_rgba(24,184,158,0.35),0_0_0_4px_rgba(24,184,158,0.12)]"
                        : active
                          ? "border-[#00D4FF] shadow-[0_8px_24px_-8px_rgba(0,212,255,0.35),0_0_0_4px_rgba(0,212,255,0.12)]"
                          : isBasicPlan
                            ? "border-[#B5DDD2] hover:border-[#18B89E]/60"
                            : "border-[#ECF1F6] hover:border-[#C8D4E0]",
                      isBasicPlanDisabled &&
                        "cursor-not-allowed opacity-60 hover:border-[#B5DDD2]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[16px] font-bold leading-[1.2] tracking-[-0.012em] text-[#0a1220]">
                          {plan.name}
                          {isBasicPlan && (
                            <span className="mt-0.5 block text-[13px] font-medium tracking-normal text-[#5b6573]">
                              Selected country
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition",
                          active && isBasicPlan
                            ? "border-[#18B89E] bg-[#18B89E]"
                            : active
                              ? "border-[#00D4FF] bg-[#00D4FF]"
                              : "border-[#C8D4E0] bg-white",
                        )}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={cn(
                            "h-3 w-3 text-white transition-transform",
                            active ? "scale-100" : "scale-0",
                          )}
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                    </div>

                    {isBasicPlan && (
                      <span className="inline-block w-fit rounded-full bg-[#C9EBDF] px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#0E6B57]">
                        Free
                      </span>
                    )}

                    <div
                      className={cn(
                        "text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums",
                        isBasicPlan ? "text-[#047857]" : "text-[#0a1220]",
                      )}
                    >
                      {priceLabel}
                    </div>

                    <p className="mt-auto text-[12px] leading-[1.5] text-[#5b6573]">
                      {isBasicPlanDisabled
                        ? BASIC_SLOT_MESSAGE
                        : isBasicPlan
                          ? "Starter campaign with direct-link sharing. Anyone with the link can view it."
                          : (plan as { description?: string }).description ??
                            "Worldwide reach with priority support."}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {errors.duration && (
            <p className="mt-2 text-xs text-red-600">
              {String(errors.duration.message ?? "")}
            </p>
          )}
        </section>
      </form>

      {/* STICKY ACTION BAR */}
      <div className="pointer-events-none sticky bottom-3 z-50 mx-3 mt-6 sm:mx-5 sm:bottom-4 md:mx-8">
        <div className="pointer-events-auto flex flex-col items-stretch gap-3 rounded-[18px] bg-[#0a1220] px-5 py-3.5 text-white shadow-[0_18px_40px_-10px_rgba(10,18,32,0.4),0_4px_16px_rgba(10,18,32,0.2)] backdrop-blur md:flex-row md:items-center md:justify-between md:gap-4 md:pl-6 md:pr-5">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-[11px] font-medium tracking-wide text-white/55">
                Plan
              </span>
              <span className="text-base font-bold tracking-[-0.012em] tabular-nums text-white">
                {selectedPlan?.name ?? "—"}
              </span>
            </div>
            <span className="hidden h-7 w-px bg-white/10 md:block" />
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-[11px] font-medium tracking-wide text-white/55">
                Total today
              </span>
              <span className="text-base font-bold tracking-[-0.012em] tabular-nums text-white">
                {selectedPlanPriceLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={openConfirm}
              disabled={continueDisabled}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl bg-[#00D4FF] px-5 py-3 text-[15px] font-bold tracking-tight text-[#0a1220] shadow-[0_4px_14px_rgba(0,212,255,0.5)] transition hover:bg-[#1de3ff] hover:shadow-[0_6px_20px_rgba(0,212,255,0.65)] active:scale-[0.98]",
                continueDisabled && "cursor-not-allowed opacity-60 hover:bg-[#00D4FF] hover:shadow-[0_4px_14px_rgba(0,212,255,0.5)]",
              )}
            >
              Continue
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="h-4 w-4"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <CampaignModals
        activeModal={activeModal}
        setActiveModal={(m) => {
          if (m === null) {
            setValue("agree", false, { shouldDirty: true });
          }
          setActiveModal(m);
        }}
        submittedSnapshot={submittedSnapshot}
        selectedPlanName={submittedPlan?.name ?? selectedPlan?.name}
        selectedPlanPriceLabel={submittedPlanDisplayPrice}
        selectedPlanIsBasic={submittedPlanIsBasic}
        actionEnabled={
          submittedPlanIsBasic
            ? !occupiedBasicCampaign
            : Boolean(
                submittedPriceObj ||
                  submittedCryptoPriceObj ||
                  submittedRecurringCryptoPriceObj,
              )
        }
        actionLabel={confirmActionLabel}
        actionLoading={isCreatingBasic}
        agree={agree}
        register={register}
        errors={errors}
        setValue={setValue}
        watch={watch}
        onConfirmAction={handleConfirmAction}
      />

      <CampaignPlanCheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        snapshot={submittedSnapshot}
        selectedPlan={submittedPlan}
      />
    </div>
  );
}
// DO NOT REMOVE THIS COMMENT
