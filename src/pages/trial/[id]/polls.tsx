import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import BackButton from "@/components/commons/back-button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";

import {
  GenericTrialPoll,
  TrialPollType,
} from "@/components/swipe-factory/generic-trial-poll";

import { useAdsInfinite } from "@/hooks/useAdsInfinite";
import {
  DeckItem,
  isAd,
  type AdItem,
} from "@/components/swipe-factory/ads/types";

import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { ResponsiveModal } from "@/components/commons/responsiveModal";
import { useTrialCastStore } from "@/stores/trialCast.store";
import { CommentsBox } from "@/components/swipe-factory/comments/comments-box";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsDesktop } from ".";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { truncateText } from "@/utils/truncateWords";
import { Button } from "@/components/ui/button";
import { pollButtonClass } from "@/components/swipe-factory/base-swipe";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { buildInkDTrialShareUrl, buildTrialShareUrl } from "@/lib/referral/share-url";
import { useAuth } from "@/hooks/useAuth";
import TrialAccessBlocked from "@/components/trial/trial-access-blocked";
import { appToast } from "@/utils/toast";

function hasKeyWithValue(obj: any, key: any) {
  return (
    obj &&
    Object.prototype.hasOwnProperty.call(obj, key) &&
    obj[key] !== null &&
    obj[key] !== undefined
  );
}

export default function TrialPolls() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // IMPORTANT: index is now DECK index (polls + ads)
  const [index, setIndex] = useState(0);

  const isDesktop = useIsDesktop();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeModalAction, setActiveModalAction] = useState<
    "primary" | "secondary" | null
  >(null);
  const [postSubmitDestination, setPostSubmitDestination] = useState<
    "default" | "inkd-next" | "inkd-blog"
  >("default");

  const trialRoute = id ? endpoints.trial.getTrialById(id) : "";
  const me = endpoints.profile.me;
  const { data, isLoading, isError } = useApiQuery(trialRoute, {
    enabled: !!id,
  } as any);

  const filteredData = useMemo(() => data?.data?.data ?? null, [data]);
  const isAccessBlocked = filteredData?.accessible === false;
  const blockedMessage = data?.data?.message || "This trail is not available.";
  const trial = useMemo(() => data?.data?.data?.trial ?? null, [data]);

  const nextTrialId = useMemo(() => {
    return data?.data?.data?.campaign?.nextTrial?._id ?? null;
  }, [data]);

  const belongsToCampaignId = trial?.belongsToCampaignId;
  const belongsToInkDBlogId = trial?.belongsToInkDBlogId;
  const shouldGoNextTrial = Boolean(trial?.belongsToCampaignId && nextTrialId);

  const inkdTrailsRoute = belongsToInkDBlogId
    ? endpoints.inkd.getInkdBlogsTrails(belongsToInkDBlogId)
    : "";
  const inkdBlogRoute = belongsToInkDBlogId
    ? endpoints.inkd.getInkdBlogsByIdNew(belongsToInkDBlogId)
    : "";
  const { data: inkdTrailsResp } = useApiQuery(inkdTrailsRoute, {
    enabled: !!inkdTrailsRoute,
  } as any);
  const { data: inkdBlogResp } = useApiQuery(inkdBlogRoute, {
    enabled: !!inkdBlogRoute,
  } as any);

  const nextInkdTrialId = useMemo(() => {
    const trialsRaw = inkdTrailsResp?.data?.data ?? inkdTrailsResp?.data ?? {};
    const list = Array.isArray(trialsRaw?.activeTrials) ? trialsRaw.activeTrials : [];
    const blogRaw = inkdBlogResp?.data?.data ?? inkdBlogResp?.data ?? {};
    const trialSequence = Array.isArray(blogRaw?.trialSequence) ? blogRaw.trialSequence : [];
    const currentTrialId = String(trial?._id ?? "");

    if (!currentTrialId || !trialSequence.length || !list.length) return null;

    const currentIndex = trialSequence.findIndex(
      (sequenceId: any) => String(sequenceId ?? "") === currentTrialId,
    );
    if (currentIndex < 0) return null;

    const castStatusById = new Map<string, boolean>();
    for (const item of list) {
      const itemId = String(item?._id ?? "");
      if (!itemId) continue;
      castStatusById.set(itemId, Boolean(item?.alreadyCasted));
    }

    for (let index = currentIndex + 1; index < trialSequence.length; index++) {
      const nextId = String(trialSequence[index] ?? "");
      if (!nextId) continue;
      if (castStatusById.get(nextId) === false) {
        return nextId;
      }
    }

    return null;
  }, [inkdBlogResp, inkdTrailsResp, trial?._id]);

  const shouldGoNextInkdTrial = Boolean(belongsToInkDBlogId && nextInkdTrialId);
  const inkdBlogPath = belongsToInkDBlogId
    ? `/inkd/inkd-blog/${belongsToInkDBlogId}`
    : "/inkd";

  const pollsRaw = useMemo(
    () => (data?.data?.data?.polls ?? []) as any[],
    [data],
  );
  const alreadyCasted = Boolean(data?.data?.data?.alreadyCasted);

  const [castedLocal, setCastedLocal] = useState(false);

  const { trialId, setTrial, setVote, votes } = useTrialCastStore();

  useEffect(() => {
    if (!id) return;
    if (trialId !== id) setTrial(id);

    if (alreadyCasted || castedLocal) {
      for (const p of pollsRaw) {
        const s = p?.selectedOption?._id;
        if (s) setVote(p._id, s);
      }
    }
  }, [id, trialId, setTrial, alreadyCasted, castedLocal, pollsRaw, setVote]);

  const items: TrialPollType[] = useMemo(() => {
    return (pollsRaw ?? []).map((p) => ({
      _id: p._id,
      title: p.title,
      description: p.description,
      imageUrl:
        (p.resourceAssets || []).find((r: any) => r.type === "image")?.value ??
        null,
      videoId:
        (p.resourceAssets || []).find((r: any) => r.type === "youtube")
          ?.value ?? null,
      resourceAssets: (p.resourceAssets || []).filter(
        (r: any) => r?.type && r?.value,
      ) as TrialPollType["resourceAssets"],
      totalVotes: p.totalVotes,
      selectedOptionId: p?.selectedOption?._id ?? null,
      options: (p.options || []).map((o: any) => ({
        _id: o._id,
        label: o.text,
        numVotes: o.numVotes,
        percentage: o.percentage,
      })),
    }));
  }, [pollsRaw]);

  const totalPolls = items.length;

  const lockedNow = alreadyCasted || castedLocal;

  // =========================
  // ADS (Trial Deck Injection)
  // =========================
  const ENABLE_ADS = true;
  const ADS_EVERY_N = 5;
  const ADS_PAGE_SIZE = 20;

  const adsFilters = useMemo(
    () => ({
      status: "live",
      ...(belongsToCampaignId
        ? { campaignIds: belongsToCampaignId }
        : { isGeneric: true }),
    }),
    [],
  );

  const {
    data: adsData,
    fetchNextPage: fetchNextAdsPage,
    isFetchingNextPage: isFetchingNextAdsPage,
  } = useAdsInfinite(adsFilters, ADS_PAGE_SIZE, { enabled: ENABLE_ADS });

  // total ads reported by API (0 => no ads system-wide)
  const adsTotal = useMemo(() => {
    const first = adsData?.pages?.[0];
    return first?.meta?.total ?? 0;
  }, [adsData]);

  const adsPool: AdItem[] = useMemo(() => {
    const apiEntries = (adsData?.pages ?? []).flatMap((p) => p.entries ?? []);

    const seen = new Set<string>();
    const out: AdItem[] = [];

    for (const a of apiEntries) {
      const id = String(a._id);
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const imageUrl = a.uploadedImageLinks?.[0] ?? null;
      const ctaUrl = a.hyperlink ?? null;

      out.push({
        _id: id,
        kind: "ad",
        title: a.title ?? "Sponsored",
        text: a.description ?? "",
        imageUrl, // ✅ can be null
        ctaUrl: ctaUrl ?? undefined,
        ctaLabel: ctaUrl ? a.buttonText?.trim() || "Visit" : undefined,
      });
    }

    return out;
  }, [adsData]);

  const fetchedUniqueCount = useMemo(() => {
    const seen = new Set<string>();
    for (const p of adsData?.pages ?? []) {
      for (const a of p.entries ?? []) seen.add(String(a._id));
    }
    return seen.size;
  }, [adsData]);

  // Prefetch only enough ads for this finite deck
  useEffect(() => {
    if (!ENABLE_ADS) return;
    if (!adsTotal) return;
    if (isFetchingNextAdsPage) return;

    const pollsCount = items.length;
    if (pollsCount < 2) return;

    // insertion slots between polls, never after last poll
    const slots = Math.floor((pollsCount - 1) / ADS_EVERY_N);
    const buffer = 2;
    const CAP = 20;

    const target = Math.min(CAP, slots + buffer);
    const haveAllAds = fetchedUniqueCount >= adsTotal;

    if (!haveAllAds && adsPool.length < target) {
      void fetchNextAdsPage();
    }
  }, [
    ENABLE_ADS,
    adsTotal,
    items.length,
    adsPool.length,
    fetchedUniqueCount,
    isFetchingNextAdsPage,
    fetchNextAdsPage,
  ]);

  const adsReady = ENABLE_ADS && adsTotal > 0 && adsPool.length > 0;

  // stable session seed so ads don't reshuffle
  const adSeedRef = useRef(Math.floor(Math.random() * 1_000_000));

  const deckItems: DeckItem<TrialPollType>[] = useMemo(() => {
    if (!adsReady) return items as unknown as DeckItem<TrialPollType>[];

    const out: DeckItem<TrialPollType>[] = [];
    const P = items.length;
    const start = adSeedRef.current % adsPool.length;

    let slot = 0;

    for (let i = 0; i < P; i++) {
      out.push(items[i] as any);

      const isLastPoll = i === P - 1;
      const shouldInsertHere = !isLastPoll && (i + 1) % ADS_EVERY_N === 0;

      // ✅ never at start (inserts only AFTER a poll)
      // ✅ never at end (skip after last poll)
      if (shouldInsertHere) {
        const ad = adsPool[(start + slot) % adsPool.length];
        slot++;
        out.push(ad);
      }
    }

    return out;
  }, [items, adsReady, adsPool]);

  const deckLen = deckItems.length;
  const isLastDeck = index >= deckLen - 1;

  const currentItem = deckItems[index];
  const currentPoll =
    currentItem && !isAd(currentItem) ? (currentItem as TrialPollType) : null;
  const currentPollId = currentPoll?._id ?? null;

  // how many polls have we passed up to this deck index (skip ads)
  const pollPos = useMemo(() => {
    let count = 0;
    for (let i = 0; i <= index && i < deckItems.length; i++) {
      if (!isAd(deckItems[i])) count++;
    }
    return Math.max(1, count);
  }, [deckItems, index]);

  const step = Math.min(totalPolls || 1, pollPos);
  const progressPct = totalPolls > 0 ? (step / totalPolls) * 100 : 0;

  const answeredCurrent = lockedNow
    ? true
    : isAd(currentItem)
      ? true
      : Boolean(currentPollId && votes[currentPollId]);

  const allAnswered =
    lockedNow || (totalPolls > 0 && items.every((p) => Boolean(votes[p._id])));

  const isOnLastPoll = Boolean(currentPollId) && step === totalPolls;

  // pollIndex -> deckIndex mapping
  const pollIndexToDeckIndex = useMemo(() => {
    const map: number[] = [];
    let pi = 0;
    for (let di = 0; di < deckItems.length; di++) {
      if (!isAd(deckItems[di])) {
        map[pi] = di;
        pi++;
      }
    }
    return map;
  }, [deckItems]);

  // bootstrap to first unanswered poll (as DECK index)
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!items.length || bootstrappedRef.current) return;

    if (!lockedNow) {
      const firstUnansweredPollIdx = items.findIndex((p) => !votes[p._id]);
      const deckIdx =
        firstUnansweredPollIdx === -1
          ? 0
          : (pollIndexToDeckIndex[firstUnansweredPollIdx] ?? 0);
      setIndex(deckIdx);
    } else {
      setIndex(0);
    }

    bootstrappedRef.current = true;
  }, [items, votes, lockedNow, pollIndexToDeckIndex]);

  // Keep trial behavior: if vote map has an invalid selection, snap back to earliest unanswered (deck idx)
  useEffect(() => {
    if (alreadyCasted) return;

    const i = items.findIndex((item) => {
      const _id = item?._id;
      const optionIds = item?.options?.map((option) => option._id);
      const doesKeyAndValueExist = hasKeyWithValue(votes, _id);

      if (doesKeyAndValueExist) {
        const value = votes[_id];
        const ok = optionIds?.includes(value);
        if (ok) return false;
      }
      return true;
    });

    if (i < 0) return;

    const deckI = pollIndexToDeckIndex[i] ?? 0;
    if (index > deckI) setIndex(deckI);
  }, [index, items, votes, alreadyCasted, pollIndexToDeckIndex]);

  // =========================
  // Ad tracking (visit/click)
  // =========================
  const markAdVisit = useApiMutation<{ adId: string }, any>({
    route: endpoints.ad.ad.markVisit,
    method: "POST",
  });

  const markAdClick = useApiMutation<{ adId: string }, any>({
    route: endpoints.ad.ad.markClick,
    method: "POST",
  });

  const viewedAdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const it = deckItems[index];
    if (!it || !isAd(it)) return;

    const adId = String(it._id);
    if (!adId) return;

    if (viewedAdsRef.current.has(adId)) return;
    viewedAdsRef.current.add(adId);

    markAdVisit.mutate(
      { adId },
      {
        onError: () => viewedAdsRef.current.delete(adId),
      },
    );
  }, [deckItems, index, markAdVisit]);

  const onAdClick = useCallback(
    (adId: string) => {
      if (!adId) return;
      markAdClick.mutate({ adId });
    },
    [markAdClick],
  );

  // =========================
  // Submit trial
  // =========================
  const { mutate: castTrial, isPending: submitting } = useApiMutation({
    route: endpoints.trial.trialCast,
    method: "POST",
    onSuccess: async () => {
      setActiveModalAction(null);
      setCastedLocal(true);

      qc.setQueryData([trialRoute], (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: {
              ...old.data.data,
              alreadyCasted: true,
            },
          },
        };
      });

      await qc.invalidateQueries({ queryKey: [trialRoute, me] });

      if (postSubmitDestination === "inkd-next" && nextInkdTrialId) {
        navigate(`/trial/${nextInkdTrialId}`);
      } else if (postSubmitDestination === "inkd-blog") {
        navigate(inkdBlogPath);
      } else if (shouldGoNextTrial && nextTrialId) {
        navigate(`/trial/${nextTrialId}`);
      } else if (shouldGoNextInkdTrial && nextInkdTrialId) {
        navigate(`/trial/${nextInkdTrialId}`);
      } else if (belongsToCampaignId) {
        navigate(`/campaigns/all-campaigns/${belongsToCampaignId}`);
      } else if (belongsToInkDBlogId) {
        navigate(inkdBlogPath);
      } else {
        navigate("/");
      }
    },
    onError: (error: any) => {
      setActiveModalAction(null);
      const message =
        error?.response?.data?.message || "Unable to submit this trial right now";
      setShowModal(false);
      appToast.error(message);

      if (error?.response?.status === 403 && id) {
        void qc.invalidateQueries({ queryKey: [trialRoute] });
        navigate(`/trial/${id}`);
      }
    },
  });

  // share URL
  const baseUrl = String(import.meta.env.VITE_CLIENT_URL);
  const externalAccountId =
    (user as any)?._id ??
    (user as any)?.id ??
    (user as any)?.externalAccountId ??
    null;

  const currentId = trial?._id;
  const currentUrl = currentId
    ? belongsToInkDBlogId
      ? buildInkDTrialShareUrl({
          baseUrl,
          trialId: currentId,
          externalAccountId,
        })
      : buildTrialShareUrl({
          baseUrl,
          trialId: currentId,
          externalAccountId,
        })
    : String(new URL("/trial", baseUrl));

  const comments = trial?._id && (
    <CommentsBox
      entityType="trial"
      entityId={trial._id}
      heightClass={cn("", {
        "h-full": isDesktop,
        "h-[420px]": !isDesktop,
      })}
      className={"h-full"}
      pageSize={10}
      repliesPageSize={3}
      showOptimisticUser
      onSubmitRoot={async (payload) => console.log("create root", payload)}
      onSubmitReply={async (rootId, payload) =>
        console.log("create reply", { rootId, ...payload })
      }
      onToggleLike={async (commentId, like) =>
        console.log("toggle like", { commentId, like })
      }
    />
  );

  const submitClickRef = useRef<HTMLAudioElement | null>(null);
  const claimRewardRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const s1 = new Audio("/poll.mp3");
    s1.preload = "auto";
    s1.volume = 0.5;
    submitClickRef.current = s1;

    const s2 = new Audio("/finishingtrail.mp3s");
    s2.preload = "auto";
    s2.volume = 0.5;
    claimRewardRef.current = s2;

    return () => {
      s1.pause();
      s2.pause();
      submitClickRef.current = null;
      claimRewardRef.current = null;
    };
  }, []);

  function playSubmitClick() {
    const a = submitClickRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      void a.play();
    } catch {}
  }

  function playClaimReward() {
    const a = claimRewardRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      void a.play();
    } catch {}
  }

  const handleSubmitClick = () => {
    if (!allAnswered || lockedNow) return;
    setActiveModalAction(null);
    setShowModal(true);
  };

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin" />;
  }
  if (isAccessBlocked) {
    return (
      <TrialAccessBlocked
        message={blockedMessage}
        onBackToTrials={() => navigate("/trial")}
        onGoHome={() => navigate("/")}
      />
    );
  }
  if (isError || !trial) {
    return (
      <div className="py-10 text-center text-red-500">
        Failed to load trial.
      </div>
    );
  }

  const modalButtonLabel = submitting && activeModalAction === "primary"
    ? "Submitting..."
    : shouldGoNextInkdTrial
      ? "CONTINUE TO NEXT TRAIL"
    : shouldGoNextTrial
      ? "SUBMIT AND GO TO NEXT TRAIL"
      : "SUBMIT TO CLAIM REWARDS";

  const modalSecondaryButtonLabel =
    submitting && activeModalAction === "secondary"
      ? "Submitting..."
      : shouldGoNextInkdTrial
        ? "SUBMIT TO CLAIM REWARDS"
        : undefined;

  return (
    <main className="mx-auto w-full max-w-[600px] px-3 py-3 space-y-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to={`/trial/${trialId}`} />
          <h1 className="text-xl font-semibold uppercase tracking-wide">
            {truncateText(trial.title, 15)}
          </h1>
        </div>

        {/* step/total is POLL progress (ads ignored) */}
        <div className="rounded-full bg-white px-4 py-2 text-[11px]">
          {step} / {totalPolls || 1}
        </div>
      </header>

      <div className="h-1.5 rounded-full bg-black/[0.08]">
        <div
          className="h-full rounded-full"
          style={{ width: `${progressPct}%`, background: "#25FBEC" }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto py-2 px-1">
        {(trial.rewards ?? []).map(
          (r: { assetId: AssetType; computedReward: number }, idx: number) => {
            const spec = assetSpecs[r.assetId];
            const displayAmt = unwrapString(
              amount({
                op: "toParent",
                assetId: r.assetId,
                value: r.computedReward,
                output: "string",
                trim: true,
                group: false,
              }),
            );

            return (
              <span
                key={`${r.assetId}-${idx}`}
                className="flex items-center gap-2 shrink-0 rounded-lg bg-white px-3 py-1"
                title={spec.name}
              >
                <img src={spec.img} alt={spec.name} className="h-5" />
                <span>{displayAmt}</span>
                <span>{spec.parent}</span>
              </span>
            );
          },
        )}
      </div>

      <section className="relative w-full overflow-y-scroll">
        <GenericTrialPoll
          items={deckItems}
          index={index}
          onIndexChange={(next) => setIndex(next)}
          selectedByPoll={votes}
          onOptionClick={(pollId, optionId) => {
            if (!lockedNow) {
              useTrialCastStore.getState().setVote(pollId, optionId);
            }
          }}
          enableNext={answeredCurrent && !isLastDeck}
          enablePrev
          locked={lockedNow}
          showResults={lockedNow}
          onAdClick={onAdClick}
          className="rounded-3xl h-[100dvh]"
          subButtons={() => {
            const canNext = answeredCurrent && !isLastDeck;

            const config = [
              {
                node: (
                  <Button
                    size={"lg"}
                    className="px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100"
                    onClick={() => setCommentsOpen(true)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                ),
              },
              {
                node: (
                  <Button
                    size={"lg"}
                    className="px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100"
                    onClick={() => setShareOpen(true)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                ),
              },
              {
                node: (
                  <Button
                    type="button"
                    size={"lg"}
                    className="px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100 z-50 border-black/20 text-sm font-medium hover:bg-black/[0.04] disabled:bg-white/50"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index <= 0}
                  >
                    <ArrowLeft className={pollButtonClass} />
                  </Button>
                ),
              },

              // If not on last poll -> next button
              ...(!isOnLastPoll
                ? [
                    {
                      node: (
                        <Button
                          type="button"
                          className="px-3 py-2 rounded-lg border z-50 bg-teal-600 border-black/20 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                          onClick={() =>
                            setIndex((i) => Math.min(deckLen - 1, i + 1))
                          }
                          disabled={!canNext}
                        >
                          <ArrowRight className={pollButtonClass} />
                        </Button>
                      ),
                    },
                  ]
                : [
                    // last poll -> submit button
                    {
                      node: (
                        <Button
                          type="button"
                          className="px-3 py-2 rounded-lg border z-50 bg-teal-600 border-black/20 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                          onClick={() => {
                            playSubmitClick();
                            handleSubmitClick();
                          }}
                          disabled={!allAnswered || lockedNow}
                          title={
                            lockedNow
                              ? "You already submitted this trial"
                              : allAnswered
                                ? "Submit your votes"
                                : "Answer all questions to submit"
                          }
                        >
                          <ArrowRight className={pollButtonClass} />
                        </Button>
                      ),
                    },
                  ]),
            ];

            return config;
          }}
        />
      </section>

      {!allAnswered && !lockedNow && (
        <p className="text-center text-xs text-rose-600">
          Please answer all questions before submitting.
        </p>
      )}
      {lockedNow && (
        <p className="text-center text-xs text-emerald-700">
          You already submitted this trial.
        </p>
      )}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-xs rounded-md">
          <AlertDialogHeader>
            <DialogTitle>Share link</DialogTitle>
            <DialogDescription />
          </AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Input id="link" value={currentUrl} readOnly />
            <Button
              className="bg-[#0DACAD] hover:bg-[#0dacadcc]"
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(currentUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {trial?._id && (
        <>
          {isDesktop ? (
            <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
              <SheetContent
                side="right"
                className="p-0 w-[480px] sm:w-[560px] rounded-tl-3xl rounded-bl-3xl"
              >
                <div className="h-full">{comments}</div>
              </SheetContent>
            </Sheet>
          ) : (
            <Drawer open={commentsOpen} onOpenChange={setCommentsOpen}>
              <DrawerContent className="mx-1 [&>div:first-child]:hidden rounded-t-2xl rounded-b-[35px]">
                <div className="w-full">{comments}</div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* Confirmation / Rewards Modal */}
      <ResponsiveModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            setActiveModalAction(null);
          }
        }}
        title=" "
        description=" "
        showBackButton={false}
        actionLabel={modalButtonLabel}
        secondaryActionLabel={modalSecondaryButtonLabel}
        onAction={() => {
          if (!id || !allAnswered || lockedNow || submitting) return;
          setActiveModalAction("primary");
          setPostSubmitDestination(
            shouldGoNextInkdTrial ? "inkd-next" : "default",
          );
          playClaimReward();
          (castTrial as any)({ trialId: id, votes });
        }}
        onSecondaryAction={
          shouldGoNextInkdTrial
            ? () => {
                if (!id || !allAnswered || lockedNow || submitting) return;
                setActiveModalAction("secondary");
                setPostSubmitDestination("inkd-blog");
                playClaimReward();
                (castTrial as any)({ trialId: id, votes });
              }
            : undefined
        }
      >
        <div className="grid place-items-center pb-2 -mt-4">
          <span role="img" aria-label="trophy" className="text-[48px]">
            🏆
          </span>
          <h1 className="text-2xl font-bold">Trail Completed!</h1>
          <h2>Your Rewards</h2>
        </div>

        <ul className="mt-2 space-y-3">
          {(trial.rewards ?? []).map(
            (
              r: { assetId: AssetType; computedReward: number },
              idx: number,
            ) => {
              const spec = assetSpecs[r.assetId];

              const displayAmt = unwrapString(
                amount({
                  op: "toParent",
                  assetId: r.assetId,
                  value: r.computedReward,
                  output: "string",
                  trim: true,
                  group: false,
                }),
              );

              return (
                <li
                  key={`${r.assetId}-${idx}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={spec.img}
                      alt={spec.name}
                      className="h-5 w-5 rounded object-contain"
                    />
                    <span className="font-semibold">{spec.parent}</span>
                  </div>
                  <span className="text-sm font-semibold">{displayAmt}</span>
                </li>
              );
            },
          )}
        </ul>
      </ResponsiveModal>
    </main>
  );
}
