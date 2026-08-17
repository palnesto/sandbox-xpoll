import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePollsInfinite } from "@/hooks/usePollsInfinite";
import { useVotePoll } from "@/hooks/useVotePoll";
import { usePollMarkSeen } from "@/hooks/use-mark-seen";
import { endpoints } from "@/api/endpoints";
import {
  GenericSwippablePoll,
  type PollType,
} from "./swipe-factory/generic-poll";
import { pollButtonClass, SwipeHandle } from "./swipe-factory/base-swipe";
import {
  AlarmClockPlus,
  Copy,
  Check,
  Home,
  MessageCircle,
  Send,
} from "lucide-react";

import { CommentsBox } from "./swipe-factory/comments/comments-box";
import { useIsDesktop } from "@/pages/trial/[id]";
import { Sheet, SheetContent } from "./ui/sheet";
import { Drawer, DrawerContent } from "./ui/drawer";
import { cn } from "@/lib/utils";
import BackButton from "./commons/back-button";
import { dateTimeFormat, timeLeftOrExpired, userZone } from "@/utils/time";
import { truncateText } from "@/utils/truncateWords";
import { RewardsRow } from "./reward-row";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

import { useAuth } from "@/hooks/useAuth";
import { buildShareUrl } from "@/lib/referral/share-url";

import { createAdInjector } from "./swipe-factory/ads/injector";
import { AdItem, DeckItem, isAd } from "./swipe-factory/ads/types";
import { useAdsInfinite } from "@/hooks/useAdsInfinite";
import { useApiMutation } from "@/hooks/useApiMutation";

type PollDeckProps = {
  pageSize?: number;
  filters?: Record<string, unknown>;
  className?: string;
  prefetchThreshold?: number;
  enableAds?: boolean;
};

function useDerivedItems(data: any): PollType[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const out: PollType[] = [];

    for (const page of data?.pages ?? []) {
      for (const p of page.entries) {
        const id = String(p._id);
        if (seen.has(id)) continue;
        seen.add(id);

        out.push({
          _id: id,
          title: p.title,
          description: p.description,
          options: p.options.map((o: any) => ({
            _id: o._id,
            label: o.label,
            value: o.value,
          })),
          ownerUsername:
            p?.details?.externalAuthor?.profile?.apps?.xpoll?.username ?? null,
          myVote: p.myVote,
          details: {
            optionStats: p.details?.optionStats ?? [],
            resourceAssets: p.details?.resourceAssets ?? null,
            rewards: p.details?.rewards ?? null,
            targetGeo: p.details?.targetGeo ?? null,
            expireRewardAt: p.details?.expireRewardAt ?? null,
          },
        } as any);
      }
    }

    if (process.env.NODE_ENV !== "production" && out.length !== seen.size) {
      console.warn("[PollDeck] de-duplicated items in useDerivedItems");
    }

    return out;
  }, [data]);
}

function useDeckIndexWithUrl(
  items: ReadonlyArray<DeckItem<PollType>>,
  pathname: string,
  navType: ReturnType<typeof useNavigationType>,
  navigate: ReturnType<typeof useNavigate>,
) {
  const [idx, setIdx] = useState(0);

  // Clamp index when list length changes
  useEffect(() => {
    if (idx > items.length) setIdx(items.length);
  }, [items.length, idx]);

  const lastSyncedIdRef = useRef<string | null>(null);
  const hasPrimedHistoryRef = useRef(false);
  const idxOriginRef = useRef<
    "swipe" | "next" | "prev" | "url" | "programmatic" | undefined
  >(undefined);

  const lastHandledPathRef = useRef<string | null>(null);
  const pendingUrlIdRef = useRef<string | null>(null);

  // Find the nearest poll id at/after idx (skip ads)
  const topPollId = useMemo(() => {
    for (let i = idx; i < items.length; i++) {
      const it = items[i];
      if (!isAd(it)) return it._id;
    }
    return null;
  }, [items, idx]);

  // POP: align deck to pathname id (skip ads)
  useEffect(() => {
    if (navType !== "POP") return;

    if (lastHandledPathRef.current === pathname) return;
    lastHandledPathRef.current = pathname;

    const m = pathname.match(/^\/feed\/polls\/([^/]+)$/);
    const idFromPath = m?.[1];
    if (!idFromPath) return;

    const i = items.findIndex((p) => !isAd(p) && p._id === idFromPath);
    if (i >= 0) {
      idxOriginRef.current = "url";
      setIdx(i);
    } else {
      pendingUrlIdRef.current = idFromPath;
    }
  }, [pathname, navType, items]);

  useEffect(() => {
    if (!pendingUrlIdRef.current) return;
    const wanted = pendingUrlIdRef.current;
    const i = items.findIndex((p) => !isAd(p) && p._id === wanted);
    if (i >= 0) {
      idxOriginRef.current = "url";
      setIdx(i);
      pendingUrlIdRef.current = null;
    }
  }, [items]);

  // Sync URL based on current top poll id (skip ads)
  useEffect(() => {
    if (!topPollId) return;

    const target = `/feed/polls/${topPollId}`;
    if (pathname === target) {
      lastSyncedIdRef.current = topPollId;
      if (!hasPrimedHistoryRef.current) hasPrimedHistoryRef.current = true;
      if (idxOriginRef.current === "url") idxOriginRef.current = undefined;
      return;
    }

    if (lastSyncedIdRef.current === topPollId) {
      if (idxOriginRef.current === "url") idxOriginRef.current = undefined;
      return;
    }

    const isUserDriven =
      idxOriginRef.current === "swipe" ||
      idxOriginRef.current === "next" ||
      idxOriginRef.current === "prev";

    const shouldReplaceFirst =
      !hasPrimedHistoryRef.current && pathname === "/feed/polls";

    lastSyncedIdRef.current = topPollId;

    if (isUserDriven) {
      navigate(target, { replace: shouldReplaceFirst });
    }

    idxOriginRef.current = undefined;
    hasPrimedHistoryRef.current = true;
  }, [topPollId, pathname, navigate]);

  const onIndexChange = useCallback(
    (next: number, meta?: { reason: "swipe" | "next" | "prev" }) => {
      idxOriginRef.current = meta?.reason ?? "programmatic";
      setIdx(next);
    },
    [],
  );

  return { idx, onIndexChange };
}

function usePrefetchWhenNearEnd(
  totalPollsLen: number,
  pollIdx: number,
  prefetchThreshold: number,
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean,
  fetchNextPage: () => Promise<unknown>,
) {
  useEffect(() => {
    const remaining = totalPollsLen - pollIdx;
    if (remaining <= prefetchThreshold && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [
    pollIdx,
    totalPollsLen,
    prefetchThreshold,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);
}

function useMarkSeenOnce(
  items: ReadonlyArray<DeckItem<PollType>>,
  idx: number,
  data: any,
  filters: Record<string, unknown> | undefined,
) {
  const qc = useQueryClient();
  const markSeen = usePollMarkSeen();
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const page of data?.pages ?? []) {
      for (const e of page.entries) if (e.seenAt) markedRef.current.add(e._id);
    }
  }, [data]);

  useEffect(() => {
    const current = items[idx];
    if (!current || isAd(current)) return; // ✅ skip ads
    if (markedRef.current.has(current._id)) return;

    const alreadySeenInPages = (() => {
      for (const pg of data?.pages ?? []) {
        const hit = pg.entries.find((x: any) => x._id === current._id);
        if (hit?.seenAt) return true;
      }
      return false;
    })();

    if (alreadySeenInPages) {
      markedRef.current.add(current._id);
      return;
    }

    markedRef.current.add(current._id);
    markSeen.mutate(current._id, {
      onSuccess: (res: any) => {
        if (!res || res.status === "soft-error") {
          markedRef.current.delete(current._id);
          return;
        }
        qc.setQueryData(
          [endpoints.poll.getPolls, filters],
          (old: any) =>
            old && {
              ...old,
              pages: old.pages.map((pg: any) => ({
                ...pg,
                entries: pg.entries.map((e: any) =>
                  e._id === current._id
                    ? { ...e, seenAt: new Date().toISOString() }
                    : e,
                ),
              })),
            },
        );
      },
      onError: () => {
        markedRef.current.delete(current._id);
      },
    });
  }, [idx, items, data, markSeen, qc, filters]);
}

export default function PollDeck({
  pageSize = 8,
  filters,
  className,
  prefetchThreshold = 5,
  enableAds = true,
}: PollDeckProps) {
  const { user } = useAuth(); // who is sharing
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const isDesktop = useIsDesktop();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // =========================
  // ADS: static list for now
  // =========================
  // AD Code START
  const ADS_EVERY_N = 15;
  const ADS_PAGE_SIZE = 20;

  const adsFilters = useMemo(() => ({ status: "live", isGeneric: true }), []);

  const {
    data: adsData,
    fetchNextPage: fetchNextAdsPage,
    isFetchingNextPage: isFetchingNextAdsPage,
  } = useAdsInfinite(adsFilters, ADS_PAGE_SIZE, { enabled: enableAds });

  // total ads reported by API (0 => no ads system-wide)
  const adsTotal = useMemo(() => {
    // meta.total is repeated per page; pick first available
    const first = adsData?.pages?.[0];
    return first?.meta?.total ?? 0;
  }, [adsData]);

  const adsPool: AdItem[] = useMemo(() => {
    const apiEntries = (adsData?.pages ?? []).flatMap((p) => p.entries);

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
  useEffect(() => {
    console.log("[ADS]", {
      adsTotal,
      adsPoolLen: adsPool.length,
      sample: adsPool[0],
    });
  }, [adsTotal, adsPool.length]);

  const enableAdsRef = useRef(enableAds);
  useEffect(() => {
    enableAdsRef.current = enableAds;
  }, [enableAds]);

  const adsTotalRef = useRef(0);
  useEffect(() => {
    adsTotalRef.current = adsTotal;
  }, [adsTotal]);

  const adsRef = useRef<AdItem[]>([]);
  useEffect(() => {
    adsRef.current = adsPool;
  }, [adsPool]);

  const adCursorRef = useRef(0);

  const injectorRef = useRef(
    createAdInjector<PollType>({
      everyN: ADS_EVERY_N,
      getNextAd: () => {
        if (!enableAdsRef.current) return null;

        const total = adsTotalRef.current;
        if (!total) return null; // system has 0 ads

        const ads = adsRef.current;
        if (!ads.length) return null; // not loaded yet

        const ad = ads[adCursorRef.current % ads.length];
        adCursorRef.current++;
        return ad;
      },
    }),
  );
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePollsInfinite(filters, pageSize);

  const pollsOnly = useDerivedItems(data);

  const fetchedUniqueCount = useMemo(() => {
    const seen = new Set<string>();
    for (const p of adsData?.pages ?? []) {
      for (const a of p.entries ?? []) seen.add(String(a._id));
    }
    return seen.size;
  }, [adsData]);
  // ✅ Prefetch ads when needed, BUT don't loop-fetch forever
  useEffect(() => {
    if (!enableAds) return;
    if (!adsTotal) return; // total=0 => never fetch, never inject
    if (isFetchingNextAdsPage) return;

    // how many ad slots might be needed for current loaded polls?
    const neededAds = Math.floor(pollsOnly.length / ADS_EVERY_N);
    const buffer = 3;

    // If we already have all unique ads, stop fetching.
    // Reuse via cursor rotation.

    const haveAllAds = fetchedUniqueCount >= adsTotal;

    if (!haveAllAds && adsPool.length < neededAds + buffer) {
      void fetchNextAdsPage();
    }
  }, [
    enableAds,
    adsTotal,
    pollsOnly.length,
    adsPool.length,
    isFetchingNextAdsPage,
    fetchNextAdsPage,
  ]);

  const adsReady = enableAds && adsTotal > 0 && adsPool.length > 0;

  const deckItems: DeckItem<PollType>[] = useMemo(() => {
    if (!adsReady) return pollsOnly as unknown as DeckItem<PollType>[];
    return injectorRef.current.build(pollsOnly);
  }, [pollsOnly, adsReady, adsPool.length, adsTotal]);

  const { idx, onIndexChange } = useDeckIndexWithUrl(
    deckItems,
    pathname,
    navType,
    navigate,
  );

  // ✅ mutations AFTER idx exists
  const markAdVisit = useApiMutation<{ adId: string }, any>({
    route: endpoints.ad.ad.markVisit,
    method: "POST",
  });

  const markAdClick = useApiMutation<{ adId: string }, any>({
    route: endpoints.ad.ad.markClick,
    method: "POST",
  });

  // ✅ fire visit once per ad per deck session
  const viewedAdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const it = deckItems[idx];
    if (!it || !isAd(it)) return;

    const adId = String(it._id);
    if (!adId) return;

    if (viewedAdsRef.current.has(adId)) return;
    viewedAdsRef.current.add(adId);

    markAdVisit.mutate(
      { adId },
      {
        onError: () => {
          // optional retry if request failed
          viewedAdsRef.current.delete(adId);
        },
      },
    );
  }, [deckItems, idx, markAdVisit]);

  const onAdClick = useCallback(
    (adId: string) => {
      if (!adId) return;
      markAdClick.mutate({ adId });
    },
    [markAdClick],
  );

  // AD Code END

  // Optional: keep for future API-triggered injection
  // NOTE: if you want immediate injection without any other state change,
  // add a local "bump" state and bump it here.
  // const requestInjectAdBeforeNextPoll = useCallback(
  //   (ad: AdItem) => {
  //     if (!enableAds) return;
  //     injectorRef.current.requestInject(ad);
  //   },
  //   [enableAds],
  // );

  const vote = useVotePoll(filters);
  const currentItem = deckItems[idx];
  const currentPoll =
    currentItem && !isAd(currentItem) ? (currentItem as PollType) : null;

  const timeLeft = currentPoll?.details?.expireRewardAt || "";

  // Correct prefetch even with ads inserted: compute pollIdx
  const pollIdx = useMemo(() => {
    if (!enableAds) return idx + 1; // polls-only deck => idx matches poll index
    let count = 0;
    for (let i = 0; i <= idx && i < deckItems.length; i++) {
      if (!isAd(deckItems[i])) count++;
    }
    return count;
  }, [deckItems, idx, enableAds]);

  usePrefetchWhenNearEnd(
    pollsOnly.length,
    pollIdx,
    prefetchThreshold,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  );

  useMarkSeenOnce(deckItems, idx, data, filters);

  const swipeRef = useRef<SwipeHandle & { next: () => void; prev: () => void }>(
    null,
  );

  const onOptionClick = useCallback(
    (pollId: string, optionId: string) => {
      vote.mutate({ pollId, optionId });
    },
    [vote],
  );

  const currentId = currentPoll?._id ?? null;

  const currentUrl = currentId
    ? buildShareUrl("poll", {
        baseUrl: String(import.meta.env.VITE_CLIENT_URL),
        id: currentId,
        externalAccountId:
          (user as any)?._id ??
          (user as any)?.id ??
          (user as any)?.externalAccountId ??
          null,
      })
    : String(new URL("/feed/polls", String(import.meta.env.VITE_CLIENT_URL)));

  const comments = currentPoll?._id && (
    <CommentsBox
      entityType={"poll"}
      entityId={currentPoll._id}
      heightClass={cn("", {
        "h-full": isDesktop,
        "h-[420px]": !isDesktop,
      })}
      className={"h-full"}
      pageSize={10}
      repliesPageSize={3}
      showOptimisticUser
      onSubmitRoot={async () => {}}
      onSubmitReply={async () => {}}
      onToggleLike={async () => {}}
    />
  );

  return (
    <div className={`relative ${className ?? ""}`}>
      <header className="flex items-center justify-between py-4 px-1">
        <section className="flex items-center gap-2">
          <BackButton to="/home" Icon={Home} />
          {currentPoll ? (
            <h1 className="text-lg font-semibold">
              {truncateText(currentPoll?.ownerUsername || "Admin Poll", 15)}
            </h1>
          ) : (
            // Ad is showing → keep the space empty
            <div className="h-[28px]" />
          )}
        </section>

        {timeLeft && (
          <span className="text-[12px] flex items-center gap-1 tracking-widest bg-white px-2 py-[4px] rounded-full">
            <AlarmClockPlus className="w-4 h-4" />
            {timeLeftOrExpired(timeLeft, userZone, dateTimeFormat)}
          </span>
        )}
      </header>

      <section>
        <RewardsRow rewards={currentPoll?.details?.rewards ?? []} />
      </section>

      <GenericSwippablePoll
        baseRef={swipeRef}
        items={deckItems as any} // remove "as any" once GenericSwippablePoll types accept DeckItem<PollType>[]
        index={idx}
        onAdClick={(adId) => onAdClick(adId)}
        onIndexChange={onIndexChange}
        enablePrev
        enableNext
        subButtons={() => {
          const disabled = !currentPoll?._id;

          return [
            {
              node: (
                <Button
                  size={"lg"}
                  className={`px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100 ${
                    disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => {
                    if (disabled) return;
                    setCommentsOpen(true);
                  }}
                >
                  <MessageCircle className={pollButtonClass} />
                </Button>
              ),
            },
            {
              node: (
                <Button
                  size={"lg"}
                  className={`px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100 ${
                    disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => {
                    if (disabled) return;
                    setShareOpen(true);
                  }}
                >
                  <Send className={pollButtonClass} />
                </Button>
              ),
              onClick: () => {
                if (disabled) return;
                setShareOpen(true);
              },
            },
          ];
        }}
        onPrev={() => {}}
        onNext={() => {
          // Keep this as a backup fetch trigger when user taps next at the end
          if (
            idx >= deckItems.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            void fetchNextPage();
          }
        }}
        onOptionClick={onOptionClick}
        className="h-full rounded-3xl"
      />

      {isFetchingNextPage && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-black/50 rounded bg-black/5 px-2 py-1">
          Loading more…
        </div>
      )}

      <div className="h-28" />

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-xs rounded-md">
          <DialogHeader>
            <DialogTitle>Share link</DialogTitle>
            <DialogDescription>
              Anyone with this link will be able to view this poll.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input id="link" value={currentUrl} readOnly />
            <Button
              type="button"
              className="bg-[#0DACAD] hover:bg-[#0dacadcc]"
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

      {currentPoll?._id && (
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
    </div>
  );
}
