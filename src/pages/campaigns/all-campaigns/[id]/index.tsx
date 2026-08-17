import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Instagram,
  Send,
  Mail,
  Globe,
  MoveRight,
  CopyCheck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import x from "@/assets/x.svg";
import { useAuth } from "@/hooks/useAuth";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import {
  ApiCampaignById,
  CampaignDetailModel,
  EarnToken,
  mapApiTrialToRowModel,
  pickDataRoot,
  TrailRowModel,
} from "@/types/campaigns";
import { useApiMutation } from "@/hooks/useApiMutation";
import CampaignDonateModal, {
  MAX_TOKENS_PER_DONATION,
} from "@/components/modals/campaign-donate-modal";
import {
  TokenChipsRow,
  TrailRewardChips,
} from "@/components/campaign/trails/trails-manage-shared";
import { Separator } from "@/components/ui/separator";
import { truncateText } from "@/utils/truncateWords";
import { appToast } from "@/utils/toast";
import { queryClient } from "@/api/queryClient";
import { formatShortDate } from "@/utils/time";
import { openSystemMailClient } from "@/utils/email";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { buildCampaignShareUrl } from "@/lib/referral/share-url";
import {
  BlogCard,
  type ApiBlogEntry,
} from "@/components/campaign/blog/BlogCard";
import BackButton from "@/components/commons/back-button";
import {
  PublicEventCard,
  type PublicEventCardItem,
} from "@/components/campaign/events/PublicEventCard";

// ==============================
// ADS (Campaign Trails)
// ==============================
import { useAdsInfinite } from "@/hooks/useAdsInfinite";
import type { AdItem } from "@/components/swipe-factory/ads/types";
import { CampaignAdCard } from "@/components/swipe-factory/ads/campaign-ad-card";
import {
  CampaignTrailsItem,
  countAdSlots,
  injectCampaignAds,
} from "@/components/campaign/ads/inject-campaign-ads";

function mapCampaignByIdToDetail(api: ApiCampaignById): CampaignDetailModel {
  const imgs = api.imageLinks ?? [];
  const img1 = imgs[0] ?? null;
  const img2 = imgs[1] ?? imgs[0] ?? null;
  const img3 = imgs[2] ?? imgs[1] ?? imgs[0] ?? null;

  const earningPotential: EarnToken[] =
    api.rewardSums?.activeTrials?.computedByAsset?.map((r) => ({
      assetId: r.assetId,
      amount: Number(r.total ?? "0"),
    })) ?? [];

  return {
    _id: api._id,
    organizerName: api.externalAuthor?.username || "Unknown",
    title: api.name,
    subtitle: api.goal || "",
    description: api.description ?? api.goal ?? "",
    images: [img1, img2, img3],
    earningPotential,
    usersContributed: Number((api as any)?.usersContributed ?? 0),
    coinsContributed: Number((api as any)?.coinsContributed ?? 0),
    trails: [],
  };
}

function ImgBlock({
  src,
  className,
}: {
  src?: string | null;
  className: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-[#EDEDED]", className)}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
          No image
        </div>
      )}
    </div>
  );
}

function pickUploadedVideoUrlFromCampaign(apiCampaign: any) {
  const arr = (apiCampaign as any)?.uploadedVideoLinks;
  if (Array.isArray(arr) && arr[0]) return String(arr[0]);

  const single = (apiCampaign as any)?.uploadedVideoLink;
  if (single) return String(single);
  return null;
}

function TrailRow({
  t,
  onClick,
}: {
  t: TrailRowModel;
  onClick?: (id: string) => void;
}) {
  const isCompleted = Boolean(t?.alreadyCasted ?? (t as any)?.alreadyCasted);

  return (
    <div
      className="flex w-full md:items-center justify-between px-2 md:px-4 py-2 lg:py-4 hover:cursor-pointer overflow-hidden relative border rounded-xl shadow-inner hover:shadow-xl bg-white"
      onClick={() => onClick?.(t?.id)}
    >
      <section className="flex md:items-center gap-2">
        <figure className="w-[120px] md:w-[150px] 2xl:w-[270px] h-[70px] md:h-[100px] 2xl:h-[170px] relative rounded-lg overflow-hidden bg-[#EDEDED]">
          {t.coverImageUrl ? (
            t.coverMediaType === "video" ? (
              <video
                src={t.coverImageUrl}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={t.coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
              No image
            </div>
          )}

          {isCompleted ? (
            <div className="absolute left-2 top-2 rounded-full bg-black/75 px-3 py-1 text-[10px] md:text-xs font-semibold text-white">
              Completed
            </div>
          ) : null}
        </figure>

        <div className="md:p-2 flex-1">
          <div className="font-semibold text-[#111] line-clamp-1 text-[15px] xl:text-lg">
            {truncateText(t.title, 20)}
          </div>
          <div className="-mt-4 -ml-3 text-[#7A7A7A] md:leading-4 line-clamp-3 text-[12px] xl:text-xs">
            <RichTextPreview content={truncateText(t.description, 40)} />
          </div>
          <div className="text-[10px] xl:text-[14px] font-semibold text-black/70">
            REWARDS
          </div>
          <TrailRewardChips rewards={t.rewards} />
        </div>
      </section>

      <MoveRight className="w-8 xl:h-7 xl:w-11 text-black border border-[#C0C0C099] rounded-xl px-2 bg-[#EEEFF1] hover:bg-black/5 absolute right-2 top-2" />
    </div>
  );
}

function buildMailto(raw?: string | null) {
  const v = String(raw ?? "").trim();
  if (!v) return null;

  if (v.toLowerCase().startsWith("mailto:")) return v;

  const cleaned = v.replace(/^email:\s*/i, "").trim();
  if (!cleaned) return null;

  const subject = encodeURIComponent("");
  const body = encodeURIComponent("");

  return `mailto:${encodeURIComponent(cleaned)}?subject=${subject}&body=${body}`;
}

function safeOpen(url?: string | null) {
  const u = String(url ?? "").trim();
  if (!u) return;

  if (u.toLowerCase().startsWith("mailto:")) {
    window.location.assign(u);
    return;
  }

  window.open(u, "_blank", "noreferrer");
}

export default function CampaignDetailsPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const qrId = searchParams.get("qr");
  const campaignId = routeId ?? "";
  const [donateOpen, setDonateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaSlide, setMediaSlide] = useState<0 | 1>(0);
  const [petitionsGateOpen, setPetitionsGateOpen] = useState(false);

  const getByIdRoute = endpoints.campaigns.getCampaignByIdUser(campaignId);

  const {
    data: apiResp,
    isLoading,
    isError,
  } = useApiQuery(getByIdRoute, {
    enabled: Boolean(campaignId),
  } as any);

  const { data: campaignQrIdData, isLoading: isCampaignQrIdLoading } =
    useApiQuery(endpoints.campaigns.campaignQr.getCampaignQrById(qrId), {
      enabled: Boolean(qrId),
    });
  const filteredCampaignQrIdData = useMemo(
    () => pickDataRoot(campaignQrIdData),
    [campaignQrIdData],
  );
  const trialsRoute = endpoints.campaigns.getTrialsListings(campaignId);

  const {
    data: trialsResp,
    isLoading: trialsLoading,
    isError: trialsError,
  } = useApiQuery(trialsRoute, {
    enabled: Boolean(campaignId),
  } as any);

  const blogsRoute = `${endpoints.campaigns.blogsAdvancedListing}?enforceUserView=true&belongsToCampaignId=${encodeURIComponent(
    campaignId,
  )}&page=1&pageSize=3`;

  const { data: blogsResp } = useApiQuery(blogsRoute, {
    enabled: Boolean(campaignId),
  } as any);

  const recentBlogs: ApiBlogEntry[] = useMemo(() => {
    const root = blogsResp?.data?.data ?? blogsResp?.data ?? {};
    const list = root?.entries ?? [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e: any) => e && String(e.belongsToCampaignId) === String(campaignId),
    );
  }, [blogsResp, campaignId]);

  const apiCampaign: ApiCampaignById | null = useMemo(() => {
    const data = pickDataRoot<any>(apiResp);
    if (!data || typeof data !== "object") return null;

    const campaign = data?._id ? data : (data?.campaign ?? data?.data ?? null);
    if (!campaign?._id) return null;

    return campaign as ApiCampaignById;
  }, [apiResp]);

  const activeTrials: any[] = useMemo(() => {
    const data = pickDataRoot<any>(trialsResp);
    const list = data?.activeTrials ?? [];
    return Array.isArray(list) ? list : [];
  }, [trialsResp]);

  const trailRows: TrailRowModel[] = useMemo(() => {
    return activeTrials.map(mapApiTrialToRowModel);
  }, [activeTrials]);

 
  const ENABLE_CAMPAIGN_ADS = true;
  const AD_FIRST_INSERT_AFTER = 1;
  const AD_GAP_LENGTH = 10;
  const ADS_PAGE_SIZE = 10;
 
  const adsFilters = useMemo(
    () => ({ status: "live", campaignIds: campaignId }),
    [campaignId],
  );

  const {
    data: adsData,
    fetchNextPage: fetchNextAdsPage,
    isFetchingNextPage: isFetchingNextAdsPage,
  } = useAdsInfinite(adsFilters, ADS_PAGE_SIZE, {
    enabled: ENABLE_CAMPAIGN_ADS,
  });

  const adsTotal = useMemo(() => {
    const first = adsData?.pages?.[0];
    return first?.meta?.total ?? 0;
  }, [adsData]);

  // Stable pool (doesn't shrink)
  const adsPoolRef = useRef<AdItem[]>([]);
  const adsPoolIdsRef = useRef<Set<string>>(new Set());
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  const [adsPool, setAdsPool] = useState<AdItem[]>([]);
  const [fetchedUniqueCount, setFetchedUniqueCount] = useState(0);

  useEffect(() => {
    // reset on campaign change (keeps behavior predictable)
    adsPoolRef.current = [];
    adsPoolIdsRef.current = new Set();
    fetchedIdsRef.current = new Set();
    setAdsPool([]);
    setFetchedUniqueCount(0);
  }, [campaignId]);

  useEffect(() => {
    const pages = adsData?.pages ?? [];
    if (!pages.length) return;

    const pool = adsPoolRef.current;
    const poolIds = adsPoolIdsRef.current;
    const fetched = fetchedIdsRef.current;

    let poolChanged = false;

    for (const pg of pages) {
      for (const a of pg.entries ?? []) {
        const id = String((a as any)?._id ?? "");
        if (!id) continue;

        if (!fetched.has(id)) fetched.add(id);

        if (poolIds.has(id)) continue;

        const imageUrl = (a as any)?.uploadedImageLinks?.[0] ?? null;
        const ctaUrl = (a as any)?.hyperlink ?? null;

        poolIds.add(id);
        pool.push({
          _id: id,
          kind: "ad",
          title: (a as any)?.title ?? "Sponsored",
          text: (a as any)?.description ?? "",
          imageUrl, // ✅ can be null
          ctaUrl: ctaUrl ?? undefined,
          ctaLabel: ctaUrl
            ? (a as any)?.buttonText?.trim() || "Visit"
            : undefined,
        } as any);

        poolChanged = true;
      }
    }

    if (poolChanged) setAdsPool([...pool]);

    const nextFetchedCount = fetched.size;
    setFetchedUniqueCount((prev) =>
      prev === nextFetchedCount ? prev : nextFetchedCount,
    );
  }, [adsData]);

  const neededAdSlots = useMemo(
    () => countAdSlots(trailRows.length, AD_FIRST_INSERT_AFTER, AD_GAP_LENGTH),
    [trailRows.length],
  );

  useEffect(() => {
    if (!ENABLE_CAMPAIGN_ADS) return;

    // IMPORTANT: if total is 0, do nothing (no empty ad slot consumption)
    if (!adsTotal) return;

    if (isFetchingNextAdsPage) return;

    const haveAllAds = fetchedUniqueCount >= adsTotal;

    const buffer = 2;
    const needPoolSize = Math.min(adsTotal, neededAdSlots + buffer);

    if (!haveAllAds && adsPool.length < needPoolSize) {
      void fetchNextAdsPage();
    }
  }, [
    ENABLE_CAMPAIGN_ADS,
    adsTotal,
    fetchedUniqueCount,
    neededAdSlots,
    adsPool.length,
    isFetchingNextAdsPage,
    fetchNextAdsPage,
  ]);

  const adsReady = ENABLE_CAMPAIGN_ADS && adsTotal > 0 && adsPool.length > 0;

  // ---- Published events for this campaign (public discovery) ----
  const eventsRoute = campaignId
    ? `${endpoints.events.discover}?campaignId=${encodeURIComponent(campaignId)}&pageSize=20`
    : "";
  const { data: eventsResp } = useApiQuery(eventsRoute, {
    enabled: !!campaignId,
    queryKey: [endpoints.events.discover, { campaignId }],
  } as any);

  const publishedEvents = useMemo(() => {
    const root: any = eventsResp?.data?.data ?? eventsResp?.data ?? null;
    const entries: any[] = Array.isArray(root?.entries) ? root.entries : [];
    return entries
      .map((e: any) => {
        const ev = e?.event;
        if (!ev?._id) return null;
        const card: PublicEventCardItem = {
          _id: String(ev._id),
          name: String(ev.name ?? ""),
          coverImageUrl: ev.coverImageUrl ?? null,
          visibility: (ev.visibility ?? "public") as "public" | "private",
          startsAt: ev.startsAt,
          timezone: ev.timezone,
          endsAt: ev.endsAt,
          capacity: ev.capacity ?? undefined,
          pricing: {
            mode: (ev?.pricing?.mode ?? "free") as "free" | "paid",
            coins: Array.isArray(ev?.pricing?.coins) ? ev.pricing.coins : [],
          },
        };
        const isInvited = Boolean(e?.viewerContext?.isInvited);
        const hasTicket = Boolean(e?.viewerContext?.hasTicket);
        return { card, isInvited, hasTicket };
      })
      .filter(Boolean) as {
      card: PublicEventCardItem;
      isInvited: boolean;
      hasTicket: boolean;
    }[];
  }, [eventsResp]);

  const trailsWithAds: CampaignTrailsItem[] = useMemo(() => {
    if (!adsReady) return trailRows.map((t) => ({ kind: "trial", trial: t }));
    return injectCampaignAds(trailRows, adsPool, {
      firstInsertAfter: AD_FIRST_INSERT_AFTER,
      gap: AD_GAP_LENGTH,
    });
  }, [trailRows, adsPool, adsReady]);

  // Ad tracking (visit/click)
  const { mutate: markAdVisit } = useApiMutation({
    route: endpoints.ad.ad.markVisit,
    method: "POST",
  });

  const { mutate: markAdClick } = useApiMutation({
    route: endpoints.ad.ad.markClick,
    method: "POST",
  });

  const viewedAdsRef = useRef<Set<string>>(new Set());

  const handleAdView = useCallback(
    (adId: string) => {
      if (!adId) return;
      if (viewedAdsRef.current.has(adId)) return;
      viewedAdsRef.current.add(adId);

      markAdVisit(
        { adId },
        {
          onError: () => {
            viewedAdsRef.current.delete(adId);
          },
        },
      );
    },
    [markAdVisit],
  );

  const handleAdClick = useCallback(
    (adId: string) => {
      if (!adId) return;
      markAdClick({ adId });
    },
    [markAdClick],
  );

  const uiCampaign: CampaignDetailModel | null = useMemo(() => {
    if (!apiCampaign) return null;
    const base = mapCampaignByIdToDetail(apiCampaign);
    return { ...base, trails: trailRows };
  }, [apiCampaign, trailRows]);

  const [img1, img2, img3] = uiCampaign?.images ?? [null, null, null];

  const uploadedVideoUrl = useMemo(() => {
    return pickUploadedVideoUrlFromCampaign(apiCampaign);
  }, [apiCampaign]);

  const hasUploadedVideo = !!uploadedVideoUrl;

  const canShowPetitions =
    apiCampaign?.isPetitionEnabled && apiCampaign?.latestPetition;
  useEffect(() => {
    if (!canShowPetitions) setPetitionsGateOpen(false);
  }, [canShowPetitions]);

  useEffect(() => {
    setMediaSlide(hasUploadedVideo ? 0 : 1);
  }, [campaignId, hasUploadedVideo]);

  const { user } = useAuth();
  const meId = (user as any)?._id || (user as any)?.id;
  const isOwner = Boolean((apiCampaign as any)?.isOwner);

  const donationSupported = Boolean(
    apiCampaign?.currentPlan?.donation?.supported,
  );
  const donationEnabled = Boolean(apiCampaign?.currentPlan?.donation?.enabled);

  const showDataAccessButton =
    donationSupported && (isOwner || donationEnabled);

  const GIVES_PER_TOKEN = 100n;
  const DONATION_ASSET_ID = "xGive";
  const analyticsRoute = endpoints.campaigns.getAnalytics(campaignId);

  const { mutate: donate, isPending: donating } = useApiMutation({
    route: endpoints.campaigns.donate(campaignId),
    method: "POST",
    onSuccess: async () => {
      setDonateOpen(false);
      appToast.success("Donation successful");
      await queryClient.invalidateQueries({
        queryKey: (analyticsRoute as any).queryKey,
      });
    },
    onError: (e) => {
      console.error("Donate failed:", e);
    },
  });

  const emailHref = useMemo(() => {
    const raw =
      (apiCampaign as any)?.emailLink ??
      (apiCampaign as any)?.links?.email ??
      (apiCampaign as any)?.email ??
      "";

    return buildMailto(raw);
  }, [apiCampaign]);

  const handleDonateContinue = (tokens: bigint) => {
    if (tokens <= 0n) return;
    if (tokens > MAX_TOKENS_PER_DONATION) return;
    const amountMinor = (tokens * GIVES_PER_TOKEN).toString();
    donate({
      donationLegs: [
        {
          assetId: DONATION_ASSET_ID,
          amountMinor,
        },
      ],
    });
  };
  const petitionId = apiCampaign?.latestPetition ?? null;

  const petitionGateKey = useMemo(() => {
    const uid = String(meId ?? "anon");
    const pid = String(petitionId ?? "none");
    // Per-user + per-petition (enough). Add campaignId if you want.
    return `xpoll:petition_gate_accepted:v1:${uid}:${pid}`;
  }, [meId, petitionId]);

  const handleShare = () => {
    const baseUrl = String(import.meta.env.VITE_CLIENT_URL);
    const externalAccountId =
      (user as any)?._id ??
      (user as any)?.id ??
      (user as any)?.externalAccountId ??
      null;

    if (baseUrl && externalAccountId && campaignId) {
      const currentUrl = buildCampaignShareUrl({
        baseUrl,
        campaignId,
        externalAccountId,
      });
      navigator.clipboard.writeText(currentUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (qrId) {
    if (isCampaignQrIdLoading) {
      return <div>Loading...</div>;
    }
    if (!filteredCampaignQrIdData?.isActive) {
      return <div>QR not active</div>;
    }
  }
  return (
    <section className="min-h-screen overflow-y-auto">
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-white/70 backdrop-blur border-b">
        <header className="flex md:items-center justify-between p-3 md:h-20">
          <section className="flex items-center gap-1 md:gap-3">
            <BackButton
              Icon={ArrowLeft}
              className="px-2 h-6"
              onClick={() => navigate("/campaigns/all-campaigns")}
            />
            <h1 className="md:text-xl font-semibold text-[#111]">Campaigns</h1>
          </section>

          <section className="flex items-center md:gap-4 text-[#111]">
            <button
              type="button"
              onClick={() => safeOpen(apiCampaign?.twitterLink)}
              disabled={!apiCampaign?.twitterLink}
              className={cn(
                "bg-gray-100 rounded-full p-2 hover:opacity-100",
                apiCampaign?.twitterLink
                  ? "opacity-80"
                  : "opacity-40 cursor-not-allowed",
              )}
              aria-label="twitter"
            >
              <img src={x} className="h-4 w-4 md:h-6 md:w-6" alt="x" />
            </button>

            <button
              type="button"
              onClick={() => safeOpen(apiCampaign?.instagramLink)}
              disabled={!apiCampaign?.instagramLink}
              className={cn(
                "bg-gray-100 rounded-full p-2 hover:opacity-100",
                apiCampaign?.instagramLink
                  ? "opacity-80"
                  : "opacity-40 cursor-not-allowed",
              )}
              aria-label="instagram"
            >
              <Instagram className="h-4 w-4 md:h-6 md:w-6" />
            </button>

            <button
              type="button"
              onClick={() => safeOpen(apiCampaign?.telegramLink)}
              disabled={!apiCampaign?.telegramLink}
              className={cn(
                "bg-gray-100 rounded-full p-2 hover:opacity-100",
                apiCampaign?.telegramLink
                  ? "opacity-80"
                  : "opacity-40 cursor-not-allowed",
              )}
              aria-label="telegram"
            >
              <Send className="h-4 w-4 md:h-6 md:w-6" />
            </button>

            <button
              type="button"
              onClick={() => safeOpen(apiCampaign?.websiteLink)}
              disabled={!apiCampaign?.websiteLink}
              className={cn(
                "bg-gray-100 rounded-full p-2 hover:opacity-100",
                apiCampaign?.websiteLink
                  ? "opacity-80"
                  : "opacity-40 cursor-not-allowed",
              )}
              aria-label="website"
            >
              <Globe className="h-4 w-4 md:h-6 md:w-6" />
            </button>

            <button
              type="button"
              onClick={() => {
                openSystemMailClient({
                  to: emailHref,
                  subject: "",
                  body: "",
                });
              }}
              disabled={!emailHref}
              className={cn(
                "bg-gray-100 rounded-full p-2 hover:opacity-100",
                emailHref ? "opacity-80" : "opacity-40 cursor-not-allowed",
              )}
              aria-label="email"
              title={!emailHref ? "No email available" : undefined}
            >
              <Mail className="h-4 w-4 md:h-6 md:w-6" />
            </button>
          </section>
        </header>
      </div>

      {isLoading ? (
        <div className="px-6 py-10 text-sm text-black/60">Loading...</div>
      ) : null}

      {!isLoading && (isError || !uiCampaign) ? (
        <div className="px-6 py-10 text-sm text-black/60">
          Failed to load campaign.
        </div>
      ) : null}

      {!isLoading && uiCampaign ? (
        <div>
          <div
            className="grid grid-cols-1 md:grid-cols-[320px_1fr] xl:grid-cols-[500px_1fr] 2xl:grid-cols-[650px_1fr] gap-10 items-start p-4 md:p-6"
            style={{
              background: "linear-gradient(90deg, #FFFFFF 0%, #F2F3F5 89.7%)",
            }}
          >
            <div className="w-full">
              <div className="relative rounded-2xl overflow-hidden w-full">
                {hasUploadedVideo && mediaSlide === 0 ? (
                  <button
                    type="button"
                    onClick={() => setMediaSlide(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white backdrop-blur-3xl p-2 shadow-inner border broder-gray-500 hover:bg-white/80"
                    aria-label="Show video"
                    title="Show video"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                ) : null}

                {hasUploadedVideo && mediaSlide === 1 ? (
                  <button
                    type="button"
                    onClick={() => setMediaSlide(0)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white backdrop-blur-3xl p-2 shadow-inner border broder-gray-500 hover:bg-white/80"
                    aria-label="Back to images"
                    title="Back to images"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : null}

                {mediaSlide === 0 ? (
                  <div className="bg-[#EDEDED] w-full h-[200px] xl:h-[320px]">
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
                  <div className="grid grid-cols-[1fr_100px] xl:grid-cols-[1fr_120px] 2xl:grid-cols-[1fr_160px] w-full">
                    <ImgBlock
                      src={img1}
                      className="h-[200px] xl:h-[320px] border-r border-white"
                    />
                    <div className="grid grid-cols-1">
                      <ImgBlock src={img2} className="h-[100px] xl:h-[160px]" />
                      <Separator className="bg-white" />
                      <ImgBlock src={img3} className="h-[100px] xl:h-[160px]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col items-start gap-3">
                <div className="font-semibold tracking-wide text-[#111]">
                  COMPLETE EARNING POTENTIAL
                </div>
                <TokenChipsRow tokens={uiCampaign.earningPotential} isBase />
              </div>
            </div>

            <section className="flex flex-col justify-between h-full">
              <section>
                <header className="flex flex-col lg:flex-row justify-between">
                  <h1 className="text-sm xl:text-base text-[#8A8A8A]">
                    Campaign by{" "}
                    <span className="font-bold uppercase text-[#111]">
                      {uiCampaign.organizerName}
                    </span>
                  </h1>
                  <span className="font-medium text-gray-500 text-sm xl:text-base">
                    End at : {formatShortDate(apiCampaign?.currentPlan?.endsAt)}
                  </span>
                </header>
                <h2 className="text-2xl xl:text-5xl font-semibold text-[#111] py-2">
                  {uiCampaign.title}
                </h2>
                <section className="bg-[#F2F3F5] rounded-lg p-4 space-y-4 text-sm xl:text-base">
                  <p className="italic font-semibold text-[#6E6E6E] max-w-[640px]">
                    {uiCampaign.subtitle}
                  </p>
                  <p className="text-[#6E6E6E] font-medium max-w-[720px]">
                    <RichTextPreview content={uiCampaign.description} />
                  </p>
                </section>
              </section>

              <div className="flex flex-col 2xl:items-end gap-3 pt-2 text-sm xl:text-base">
                <section className="flex items-center gap-2 w-full">
                  {canShowPetitions ? (
                    <button
                      style={{
                        background:
                          "linear-gradient(100.48deg, #655AFC -14.12%, #09D5E3 95.99%)",
                      }}
                      className="text-white font-bold uppercase rounded-full w-full px-6 py-2"
                      onClick={() => {
                        if (!canShowPetitions) return;
                        const petitionId = apiCampaign?.latestPetition;
                        if (!petitionId) return;

                        navigate(
                          `/campaigns/all-campaigns/${campaignId}/petitions/${petitionId}`,
                        );
                      }}
                    >
                      Petitions
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      const rdr = `/campaigns/all-campaigns/${campaignId}/blogs`;
                      navigate(rdr);
                    }}
                    type="button"
                    className="w-full rounded-full border border-[#0EA5A5] bg-white text-[#0EA5A5] px-5 lg:px-6 py-2 font-semibold tracking-wide inline-flex items-center justify-center"
                  >
                    Blogs
                  </button>
                  <button
                    onClick={() => handleShare()}
                    type="button"
                    className="w-full rounded-full border border-[#0EA5A5] bg-white text-[#0EA5A5] px-5 lg:px-6 py-2 font-semibold tracking-wide hidden md:inline-flex items-center justify-center"
                  >
                    {copied ? (
                      <>
                        <CopyCheck className="h-5 w-5 pr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 pr-1" />
                        Share
                      </>
                    )}
                  </button>
                </section>

                {showDataAccessButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isOwner) {
                        navigate(
                          `/campaigns/my-campaigns/${campaignId}/all-campaign-donations`,
                        );
                        return;
                      }
                      setDonateOpen(true);
                    }}
                    className={cn(
                      "w-full rounded-full px-6 py-3 font-semibold",
                      isOwner
                        ? "bg-white border border-[#0EA5A5] text-[#0EA5A5]"
                        : "bg-[#0EA5A5] text-white",
                    )}
                  >
                    {isOwner ? "VIEW DONATION" : "GET DATA ACCESS"}
                  </button>
                ) : null}

                <button
                  onClick={() => handleShare()}
                  type="button"
                  className="w-full rounded-full border border-[#0EA5A5] bg-white text-[#0EA5A5] px-6 py-3 font-semibold tracking-wide md:hidden inline-flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CopyCheck className="h-5 w-5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Share
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>

          <div className="px-2 py-6 md:px-6 md:py-10 overflow-x-hidden">
            {recentBlogs.length > 0 ? (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Blogs</h2>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/campaigns/all-campaigns/${encodeURIComponent(
                          campaignId,
                        )}/blogs`,
                      )
                    }
                    className="text-sm font-medium hover:text-zinc-600 flex items-center gap-2 p-2 bg-white rounded-lg"
                  >
                    View all blogs <MoveRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-2 2xl:grid-cols-3">
                  {recentBlogs.map((entry) => (
                    <BlogCard
                      key={entry._id}
                      entry={entry}
                      onView={(blogId) =>
                        navigate(
                          `/campaigns/all-campaigns/${encodeURIComponent(
                            campaignId,
                          )}/blogs/${encodeURIComponent(blogId)}`,
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {publishedEvents.length > 0 ? (
              <section className="mb-10 relative">
                {/* Decorative accent backdrop */}
                <div
                  className="absolute -inset-x-2 -inset-y-3 bg-gradient-to-br from-[#E8FBFB] via-white to-[#F5FCFC] rounded-3xl -z-10"
                  aria-hidden
                />
                <div className="flex items-center justify-between mb-5 pt-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
                      <span className="inline-block w-1.5 h-7 rounded-full bg-gradient-to-b from-[#0EA5A5] to-[#5BC9C9]" />
                      Live & Upcoming Events
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-[#0EA5A5] text-white text-[11px] font-semibold px-2.5 py-0.5">
                      {publishedEvents.length}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {publishedEvents.map(({ card, isInvited, hasTicket }) => (
                    <PublicEventCard
                      key={card._id}
                      event={card}
                      isInvited={isInvited}
                      hasTicket={hasTicket}
                      onClick={() =>
                        navigate(
                          `/campaigns/all-campaigns/${encodeURIComponent(
                            campaignId,
                          )}/events/${encodeURIComponent(card._id)}`,
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <h2 className="text-2xl font-semibold">Trails</h2>
            {trialsLoading && (
              <div className="mt-4 text-sm text-black/50">
                Loading trails...
              </div>
            )}
            {!trialsLoading && trialsError && (
              <div className="mt-4 text-sm text-black/50">
                Failed to load trails.
              </div>
            )}

            {/* TRAILS + ADS */}
            <div className="mt-4 grid md:grid-cols-2 place-items-center gap-6">
              {trailsWithAds.map((it) => {
                if (it.kind === "ad") {
                  return (
                    <CampaignAdCard
                      key={`ad-${String(it.ad._id)}-${it.slot}`}
                      ad={it.ad}
                      onAdView={handleAdView}
                      onAdClick={handleAdClick}
                    />
                  );
                }

                return (
                  <TrailRow
                    key={it.trial.id}
                    t={it.trial}
                    onClick={(trailId) =>
                      navigate(`/trial/${encodeURIComponent(trailId)}`)
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <CampaignDonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        onContinue={handleDonateContinue}
        loading={Boolean(donating)}
        assetLabel="campaign"
      />
    </section>
  );
}
