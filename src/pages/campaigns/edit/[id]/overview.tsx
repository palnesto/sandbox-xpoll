import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useParams, useSearchParams } from "react-router-dom";
import CampaignLayout, { CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Info, Plus, Trash2 } from "lucide-react";
import {
  LaunchSuccessModal,
  ResumeSuccessModal,
} from "@/components/modals/launch-campaign-modals";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { endpoints } from "@/api/endpoints";
import { CAMPAIGN_STATUS, type CampaignStatus } from "@/utils/campaign-status";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import SortableTrialList, {
  SortableTrialItem,
} from "@/components/campaign/trails/drag-drop-trial";
import { queryClient } from "@/api/queryClient";
import { Button } from "@/components/ui/button";
import TopUpTrailRewardsModal from "@/components/modals/top-up-trail-modal";
import { DisabledActionTooltip } from "@/components/commons/disabled-action-tooltip";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { truncateText } from "@/utils/truncateWords";
import { getYouTubeThumbnailUrl } from "@/types/petition";
import { CampaignPlanStatePanel } from "@/components/campaign/campaign-plan-state-panel";
import { CampaignSocialOverviewCard } from "@/components/campaign/social/campaign-social-overview-card";
import { SHOW_CAMPAIGN_SOCIAL_UI } from "@/config/features";

export function ImgBlock({
  src,
  index,
  className,
}: {
  src?: string | null;
  index: number;
  className: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-[#EDEDED]", className)}>
      {src ? (
        <img
          src={src}
          alt={`Campaign image ${index}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
          No image
        </div>
      )}
    </div>
  );
}

function pickUploadedVideoUrl(apiCampaign: any): string | null {
  const apiArr = (apiCampaign as any)?.uploadedVideoLinks;
  if (Array.isArray(apiArr) && apiArr[0]) return String(apiArr[0]);
  return null;
}

function pickThumbAndType(trial: any): {
  url: string | null;
  type?: "image" | "youtube" | "video";
} {
  const first = trial?.resourceAssets?.[0];
  if (!first?.value) return { url: null };
  if (first.type === "image") return { url: first.value, type: "image" };
  if (first.type === "youtube") {
    const thumb = getYouTubeThumbnailUrl(String(first.value));
    return { url: thumb, type: "youtube" };
  }
  if (first.type === "video") return { url: first.value, type: "video" };
  return { url: null };
}

function DeleteTrialIcon({
  trialId,
  campaignId,
  disabled,
}: {
  trialId: string;
  campaignId: string;
  disabled?: boolean;
}) {
  const trialsRoute = campaignId
    ? endpoints.campaigns.getTrialsListings(campaignId)
    : "";

  const { mutate: del, isPending } = useApiMutation<void, any>({
    route: endpoints.campaigns.deleteTrial(trialId),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === trialsRoute,
      });
      queryClient.refetchQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === trialsRoute,
      });
    },
    onError: (e) => {
      console.error("Delete trial failed", e);
    },
  });

  const blocked = !!disabled || isPending;

  return (
    <DisabledActionTooltip disabled={!!disabled}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          if (blocked) return;

          del(undefined as any);
        }}
        className={cn(
          "text-red-500 hover:text-red-600",
          blocked && "opacity-60 cursor-not-allowed",
        )}
        aria-label="delete trail"
        disabled={blocked}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </DisabledActionTooltip>
  );
}

function normalizeImages3(v: any): (string | null)[] {
  const arr = Array.isArray(v) ? v : [];
  return [arr?.[0] ?? null, arr?.[1] ?? null, arr?.[2] ?? null];
}

function toTargetGeoIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const o = item as { _id?: unknown; id?: unknown };
        if (typeof o._id === "string" && o._id.trim()) return o._id.trim();
        if (typeof o.id === "string" && o.id.trim()) return o.id.trim();
      }
      return null;
    })
    .filter((id): id is string => id != null);
}

function mapApiToAddInfo(api: any) {
  return {
    description: String(api?.description ?? ""),
    location: "",
    videoUrl: String(api?.videoLink ?? api?.videoUrl ?? ""),
    images: normalizeImages3(api?.imageLinks),
    links: {
      x: String(api?.twitterLink ?? ""),
      instagram: String(api?.instagramLink ?? ""),
      telegram: String(api?.telegramLink ?? ""),
      email: "",
      website: String(api?.websiteLink ?? ""),
    },
    targetGeo: api?.targetGeo ?? { countries: [], states: [], cities: [] },
  };
}

export default function EditCampaignOverview() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const id = String(params.id ?? "");
  const openUpgradeFromQuery = searchParams.get("upgrade") === "1";

  const [activeTab, setActiveTab] = useState<CampaignTabKey>("overview");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFooterAction, setPendingFooterAction] = useState<
    "MAKE_LIVE" | "PAUSE" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [resumeSuccessOpen, setResumeSuccessOpen] = useState(false);
  const [mediaSlide, setMediaSlide] = useState<0 | 1>(0);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpTrialId, setTopUpTrialId] = useState<string | null>(null);

  const openTopUp = (trialId: string) => {
    setTopUpTrialId(trialId);
    setTopUpOpen(true);
  };
  const closeTopUp = () => {
    setTopUpOpen(false);
    setTopUpTrialId(null);
  };

  const campaignRoute = id ? endpoints.campaigns.getCampaignByIdOwner(id) : "";
  const {
    campaignData: apiCampaign,
    permissions,
    refetch,
    isBasic,
  } = useCampaignByOwner(id);

  const apiStatus = String(
    apiCampaign?.status ?? "",
  ).toLowerCase() as CampaignStatus;

  const campaignName = String(apiCampaign?.name ?? "");
  const goal = String(apiCampaign?.goal ?? "");

  const addInfo = useMemo(
    () => (apiCampaign ? mapApiToAddInfo(apiCampaign) : null),
    [apiCampaign],
  );

  const uploadedVideoUrl = useMemo(
    () => pickUploadedVideoUrl(apiCampaign),
    [apiCampaign],
  );

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    navigateCampaignEditTab(navigate, id, tab);
  };

  const trialsRoute = id ? endpoints.campaigns.getTrialsListings(id) : "";
  const { data: listingData } = useApiQuery(trialsRoute, { enabled: !!id });

  const activeTrials = useMemo(() => {
    const d = listingData?.data?.data ?? listingData?.data ?? {};
    return Array.isArray(d?.activeTrials) ? d.activeTrials : [];
  }, [listingData]);

  const hasTrails = (activeTrials?.length ?? 0) > 0;

  const hasAddInfo =
    !!String(addInfo?.description ?? "").trim() &&
    (addInfo?.images ?? []).some(Boolean);

  const images = addInfo?.images ?? [null, null, null];
  const [img1, img2, img3] = images;
  const hasImages = !!(img1 || img2 || img3);
  const hasVideo = !!uploadedVideoUrl;

  useEffect(() => {
    if (hasVideo) setMediaSlide(0);
    else if (hasImages) setMediaSlide(1);
    else setMediaSlide(0);
  }, [id, hasVideo, hasImages]);

  const isLive = apiStatus === CAMPAIGN_STATUS.LIVE;
  const isDraft = apiStatus === CAMPAIGN_STATUS.DRAFT;
  const isPaused = apiStatus === CAMPAIGN_STATUS.PAUSED;

  const basicTargetCountryIds = useMemo(
    () => toTargetGeoIds(addInfo?.targetGeo?.countries),
    [addInfo?.targetGeo?.countries],
  );
  const hasBasicTargetCountry = !isBasic || basicTargetCountryIds.length === 1;
  const launchVerb = isPaused ? "resume" : "launch";
  const launchDisabledMessage = !hasAddInfo
    ? "Add campaign details and images to launch this campaign."
    : !hasTrails
      ? "Add at least one trail to launch this campaign."
      : !hasBasicTargetCountry
        ? `Select one target country in Add Info to ${launchVerb} this Basic campaign.`
        : "Add details and trails to launch this campaign.";
  const canLaunch = hasAddInfo && hasTrails && hasBasicTargetCountry;

  const canEditTrails = isDraft || isPaused;

  const showLaunch = isDraft || isPaused;
  const showPause = isLive;
  const overviewItems: SortableTrialItem[] = useMemo(() => {
    return (activeTrials ?? []).map((t: any) => {
      const topUpBlockedByStatus =
        !canEditTrails && permissions.campaignTrial.topUp;
      const topUpBlockedByPerm = !permissions.campaignTrial.topUp;

      const deleteBlockedByPerm = !permissions.campaignTrial.delete;

      const { url, type } = pickThumbAndType(t);
      return {
        id: t._id,
        title: t.title,
        thumb: url,
        thumbMediaType: type,
        right: (
          <span className="flex items-center gap-1">
            {topUpBlockedByPerm ? (
              <PermissionDisabledTooltip hasPermission={false}>
                <Button
                  type="button"
                  disabled
                  className="px-2 h-6 rounded-full text-white bg-gray-300 cursor-not-allowed"
                >
                  Top up
                </Button>
              </PermissionDisabledTooltip>
            ) : topUpBlockedByStatus ? (
              <DisabledActionTooltip disabled>
                <Button
                  type="button"
                  disabled
                  className="px-2 h-6 rounded-full text-white bg-gray-300 cursor-not-allowed"
                >
                  Top up
                </Button>
              </DisabledActionTooltip>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openTopUp(t._id);
                }}
                className="px-2 h-6 rounded-full text-white bg-blue hover:bg-blue/70"
              >
                Top up
              </Button>
            )}

            {deleteBlockedByPerm ? (
              <PermissionDisabledTooltip hasPermission={false}>
                <span className="inline-flex opacity-60 cursor-not-allowed">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </span>
              </PermissionDisabledTooltip>
            ) : (
              <DeleteTrialIcon
                trialId={t._id}
                campaignId={id}
                disabled={!canEditTrails}
              />
            )}
          </span>
        ),
      };
    });
  }, [
    activeTrials,
    canEditTrails,
    id,
    permissions.campaignTrial.topUp,
    permissions.campaignTrial.delete,
  ]);

  const { mutate: makeLive, isPending: makingLive } = useApiMutation<
    { campaignId: string },
    any
  >({
    route: endpoints.campaigns.makeLive,
    method: "POST",
    onSuccess: () => {
      setConfirmOpen(false);

      const wasPausedBefore = apiStatus === CAMPAIGN_STATUS.PAUSED;
      if (wasPausedBefore) setResumeSuccessOpen(true);
      else setSuccessOpen(true);

      if (campaignRoute) {
        queryClient.invalidateQueries({ queryKey: [campaignRoute] });
      }
      if (trialsRoute) {
        queryClient.invalidateQueries({ queryKey: [trialsRoute] });
      }
      refetch();
    },

    onError: (e) => {
      console.error("Make live failed", e);
      setActionError(
        (e as any)?.message ||
          (e as any)?.response?.data?.message ||
          "Server error",
      );
    },
  });

  const { mutate: pauseCampaign, isPending: pausing } = useApiMutation<
    { campaignId: string },
    any
  >({
    route: endpoints.campaigns.pause,
    method: "POST",
    onSuccess: () => {
      setConfirmOpen(false);

      if (campaignRoute) {
        queryClient.invalidateQueries({ queryKey: [campaignRoute] });
      }
      if (trialsRoute) {
        queryClient.invalidateQueries({ queryKey: [trialsRoute] });
      }
      refetch();
    },

    onError: (e) => {
      setActionError(e?.message || "Server error");
    },
  });

  const { mutate: updateSequence, isPending: savingOrder } = useApiMutation<
    { campaignId: string; trialIds: string[] },
    any
  >({
    route: endpoints.campaigns.updateTrialSequence,
    method: "PATCH",
    onSuccess: () => {
      if (!trialsRoute) return;
      queryClient.invalidateQueries({ queryKey: [trialsRoute] });
    },
  });

  const { debounced: debouncedUpdateSequence } = useDebouncedCallback(
    (trialIds: string[]) => {
      if (!id) return;
      updateSequence({ campaignId: id, trialIds });
    },
    600,
  );

  const doFooterAction = () => {
    setActionError(null);

    if (!id) {
      setActionError("Missing campaignId.");
      return;
    }
    if (!pendingFooterAction) return;

    if (pendingFooterAction === "MAKE_LIVE" && !canLaunch) {
      setActionError(launchDisabledMessage);
      return;
    }

    if (pendingFooterAction === "MAKE_LIVE") {
      makeLive({ campaignId: id });
      return;
    }

    if (pendingFooterAction === "PAUSE") {
      pauseCampaign({ campaignId: id });
      return;
    }
  };
  const busy = makingLive || pausing || savingOrder;

  const onOverviewReorder = (next: SortableTrialItem[]) => {
    if (!canEditTrails) return;
    debouncedUpdateSequence(next.map((x) => x.id));
  };

  return (
    <CampaignLayout
      campaignId={id}
      campaignName={campaignName}
      activeTab={activeTab}
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => console.log("Rewards")}
    >
      <div className="rounded-2xl font-poppins bg-[#F5F5F5] overflow-hidden hidden md:block">
        <div className="p-4 rounded-2xl ">
          <CampaignPlanStatePanel
            campaignId={id}
            campaign={apiCampaign}
            initialUpgradeOpen={openUpgradeFromQuery}
          />

          {SHOW_CAMPAIGN_SOCIAL_UI ? (
            <CampaignSocialOverviewCard campaignId={id} campaign={apiCampaign} />
          ) : null}

          {/* {isBasic && showLaunch ? (
            <section className="mb-4 rounded-[24px] border border-[#D7E9D0] bg-gradient-to-r from-[#F6FBF2] to-[#FCFEFA] px-6 py-5 shadow-[0_8px_24px_rgba(49,83,38,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="text-lg font-semibold text-[#1E2A1A]">
                    Launch your Basic Campaign in Minutes:
                  </h2>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-[#3F4B3A]">
                    <p>1. Go to Add Info and update your campaign details.</p>
                    <p>2. Go to Trails and add trails to your campaign.</p>
                    <p>3. Go to Blogs and link your blogs to your trails.</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 px-5 py-4 text-sm font-medium text-[#315326] shadow-[0_6px_18px_rgba(49,83,38,0.08)] lg:max-w-xs">
                  Click on <span className="font-semibold tracking-wide">LAUNCH</span> button below.
                </div>
              </div>
            </section>
          ) : null} */}

          <div className="grid grid-cols-2 gap-4">
            {!hasAddInfo ? (
              <section className="relative min-h-[420px]">
                <h1 className="2xl:text-xl leading-[1.05] font-semibold text-[#111]">
                  {campaignName}
                </h1>

                <p className="mt-3 text-sm leading-4 text-[#7A7A7A]">{goal}</p>

                <button
                  type="button"
                  onClick={() => goTab("add-info")}
                  className="absolute left-0 bottom-5 inline-flex items-center gap-2 rounded-full bg-[#E4F2DF] px-6 py-2 text-lg font-medium text-[#315326] hover:bg-[#D3EAC7]"
                >
                  + Add Info
                </button>
              </section>
            ) : (
              <section className="">
                <div className="relative">
                  {/* arrows only if BOTH exist */}
                  {hasVideo && hasImages && mediaSlide === 0 && (
                    <button
                      type="button"
                      onClick={() => setMediaSlide(1)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white p-2 shadow-inner border border-gray-300"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {hasVideo && hasImages && mediaSlide === 1 && (
                    <button
                      type="button"
                      onClick={() => setMediaSlide(0)}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white p-2 shadow-inner border border-gray-300"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* SLIDE CONTENT */}
                  {mediaSlide === 0 ? (
                    hasVideo ? (
                      <div className="rounded-2xl overflow-hidden bg-[#EDEDED] h-[300px]">
                        <video
                          src={uploadedVideoUrl ?? undefined}
                          loop
                          muted
                          playsInline
                          autoPlay
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : hasImages ? (
                      <div className="grid grid-cols-[1fr_150px]">
                        <ImgBlock
                          src={img1}
                          index={1}
                          className="rounded-l-2xl h-[300px]"
                        />
                        <div className="grid grid-rows-2">
                          <ImgBlock
                            src={img2}
                            index={2}
                            className="rounded-tr-2xl h-[150px]"
                          />
                          <ImgBlock
                            src={img3}
                            index={3}
                            className="rounded-br-2xl h-[150px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#EDEDED] h-[300px] flex items-center justify-center text-sm text-gray-500">
                        No media
                      </div>
                    )
                  ) : hasImages ? (
                    <div className="grid grid-cols-[1fr_150px]">
                      <ImgBlock
                        src={img1}
                        index={1}
                        className="rounded-l-2xl h-[300px]"
                      />
                      <div className="grid grid-rows-2">
                        <ImgBlock
                          src={img2}
                          index={2}
                          className="rounded-tr-2xl h-[150px]"
                        />
                        <ImgBlock
                          src={img3}
                          index={3}
                          className="rounded-br-2xl h-[150px]"
                        />
                      </div>
                    </div>
                  ) : hasVideo ? (
                    <div className="rounded-2xl overflow-hidden bg-[#EDEDED] h-[300px]">
                      <video
                        src={uploadedVideoUrl ?? undefined}
                        loop
                        muted
                        playsInline
                        autoPlay
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#EDEDED] h-[300px] flex items-center justify-center text-sm text-gray-500">
                      No media
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h1 className="text-4xl font-semibold text-[#111]">
                    {campaignName}
                  </h1>
                  <p className="mt-3 text-xs text-[#6E6E6E] italic">{goal}</p>

                  <div className="mt-4 space-y-3 text-sm text-[#525252] line-clamp-3">
                    <div className="mt-4 text-sm text-[#525252]">
                      <RichTextPreview
                        content={truncateText(addInfo?.description ?? "", 140)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-white border border-black/5 min-h-[420px] p-6">
              <section className="relative">
                <h2 className="text-[ 12px] text-[#7A7A7A]">Trails</h2>
                <DisabledActionTooltip disabled={!canEditTrails}>
                  <button
                    type="button"
                    onClick={() => navigate(`/campaigns/edit/${id}/trails`)}
                    className="absolute right-0 top-0 rounded-full bg-[#E9E9E9] px-4 py-2 text-sm font-medium text-[#3C3C3C]"
                  >
                    Manage Trails
                  </button>
                </DisabledActionTooltip>
              </section>

              <div className="py-7">
                {!hasTrails ? (
                  <div className="mt-10 text-center">
                    <div className="text-sm text-[#6B6B6B] leading-4">
                      <p className="font-medium text-[#2B2B2B]">No Trails</p>
                      <p>click button to add trails</p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/campaigns/edit/${id}/trails/create`)
                      }
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#E4F2DF] px-6 py-2 text-sm font-medium text-[#315326] hover:bg-[#D3EAC7]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Trail
                    </button>
                  </div>
                ) : (
                  <SortableTrialList
                    items={overviewItems}
                    onChange={onOverviewReorder}
                    dragEnabled={canEditTrails}
                  />
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="px-4 pt-3 flex items-center justify-between bg-white">
          {canLaunch ? (
            <div className="flex items-center gap-2 text-sm text-[#1E4FAF]">
              <Info className="h-4 w-4" />
              <span className="font-medium">
                Campaign will be live when you publish it
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#ED0C1D]">
              <Info className="h-4 w-4" />
              <span className="font-medium">{launchDisabledMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/campaigns/my-campaigns")}
              className={cn(
                "min-w-[190px] rounded-full px-6 py-2 font-semibold tracking-wide",
                "border border-blue text-[#24B3B3] bg-[#E8FBFB] hover:bg-[#DDF7F7]",
              )}
            >
              SAVE DRAFT
            </button>

            {showPause ? (
              <PermissionDisabledTooltip
                hasPermission={permissions.campaign.pause}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!permissions.campaign.pause) return;
                    setPendingFooterAction("PAUSE");
                    setActionError(null);
                    setConfirmOpen(true);
                  }}
                  className={cn(
                    "min-w-[160px] rounded-full px-6 py-2 font-semibold tracking-wide",
                    "bg-[#F2F2F2] border border-black/10 hover:bg-black/5 text-[#333]",
                  )}
                >
                  PAUSE
                </button>
              </PermissionDisabledTooltip>
            ) : null}

            {showLaunch ? (
              <PermissionDisabledTooltip
                hasPermission={permissions.campaign.live}
              >
                <DisabledActionTooltip
                  disabled={!canLaunch}
                  message={launchDisabledMessage}
                >
                  <button
                    type="button"
                    disabled={!canLaunch || !permissions.campaign.live}
                    onClick={() => {
                      if (!canLaunch || !permissions.campaign.live) return;
                      setPendingFooterAction("MAKE_LIVE");
                      setActionError(null);
                      setConfirmOpen(true);
                    }}
                    className={cn(
                      "min-w-[160px] rounded-full px-6 py-3 font-semibold tracking-wide text-white",
                      canLaunch && permissions.campaign.live
                        ? "bg-[#0EA5A5] hover:bg-[#0C9A9A]"
                        : "bg-[#BFBFBF] opacity-80 cursor-not-allowed",
                    )}
                  >
                    {apiStatus === CAMPAIGN_STATUS.PAUSED ? "RESUME" : "LAUNCH"}
                  </button>
                </DisabledActionTooltip>
              </PermissionDisabledTooltip>
            ) : null}
          </div>
        </div>
      </div>

      <CampaignActionConfirmModal
        open={confirmOpen}
        title={
          pendingFooterAction === "PAUSE"
            ? "Pause Campaign?"
            : "Ready to Launch Campaign?"
        }
        description={
          pendingFooterAction === "PAUSE"
            ? "Pausing this campaign will temporarily stop all activity. You can resume the campaign at any time."
            : "Once you confirm, the campaign will be launched immediately and will begin running right away."
        }
        confirmLabel={pendingFooterAction === "PAUSE" ? "PAUSE" : "LAUNCH"}
        tone={pendingFooterAction === "PAUSE" ? "secondary" : "primary"}
        loading={busy}
        error={actionError}
        onClose={() => {
          if (busy) return;
          setConfirmOpen(false);
          setPendingFooterAction(null);
          setActionError(null);
        }}
        onConfirm={doFooterAction}
      />

      <LaunchSuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        campaignId={id}
      />
      <ResumeSuccessModal
        open={resumeSuccessOpen}
        onClose={() => setResumeSuccessOpen(false)}
      />
      <TopUpTrailRewardsModal
        open={topUpOpen}
        trialId={topUpTrialId}
        onClose={closeTopUp}
      />
    </CampaignLayout>
  );
}
