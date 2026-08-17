import { cn } from "@/lib/utils";
import LockedYouTube from "../youtube-locked-preview/locked-yt";
import { Base, SwipeDir, SwipeHandle } from "./base-swipe";
import { RichTextPreview } from "../commons/editor/preview";

import { DeckItem, isAd, type AdItem } from "./ads/types";
import { TrialAdCard } from "./ads/trial-ad-card";
import {
  ResourceAssetsCarousel,
  type ResourceAsset,
} from "@/components/campaign/trails/ResourceAssetsCarousel";

export type Option = {
  _id: string;
  label: string;
  numVotes?: number;
  percentage?: number;
};

export type { ResourceAsset };

export type TrialPollType = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  videoId?: string | null; 
  resourceAssets?: ResourceAsset[];
  totalVotes?: number;
  selectedOptionId?: string | null;
  options: Option[];
};

export interface GenericTrialPollProps {
  items: ReadonlyArray<DeckItem<TrialPollType>>;
  index: number;

  onIndexChange?: (
    next: number,
    meta?: { reason: "swipe" | "next" | "prev" },
  ) => void;

  selectedByPoll?: Record<string, string | undefined>;
  onOptionClick?: (
    pollId: string,
    optionId: Option["_id"],
    option: Option,
  ) => void;

  locked?: boolean;
  showResults?: boolean;

  onSwiped?: (e: { dir: SwipeDir; poll: TrialPollType; index: number }) => void;

  // allow caller to render controls even on ads
  subButtons?: (e: { poll?: TrialPollType; ad?: AdItem }) => {
    node: React.ReactNode;
  }[];

  enableNext?: boolean;
  enablePrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  className?: string;

  arcLift?: number;
  rotateMax?: number;
  swipeThresholdFraction?: number;
  flingStiffness?: number;
  flingDamping?: number;
  snapStiffness?: number;
  snapDamping?: number;

  baseRef?: React.Ref<SwipeHandle & { next: () => void; prev: () => void }>;

  onAdClick?: (adId: string) => void;
}

export function extractYouTubeId(input?: string | null): string | null {
  if (!input) return null;
  const m =
    input.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/,
    ) ||
    input.match(
      /src=["']https?:\/\/.*?(?:youtu\.be|youtube\.com)\/.*?([A-Za-z0-9_-]{6,})/,
    );
  return m?.[1] ?? null;
}

export function GenericTrialPoll({
  items,
  index,
  onIndexChange,
  selectedByPoll,
  onOptionClick,
  locked,
  showResults,
  onSwiped,
  enableNext,
  enablePrev,
  onNext,
  onPrev,
  className,
  arcLift,
  rotateMax,
  swipeThresholdFraction,
  flingStiffness,
  flingDamping,
  snapStiffness,
  snapDamping,
  baseRef,
  subButtons,
  onAdClick,
}: GenericTrialPollProps) {
  return (
    <Base<DeckItem<TrialPollType>>
      baseRef={baseRef}
      items={items as DeckItem<TrialPollType>[]}
      index={index}
      onIndexChange={(next, meta) => onIndexChange?.(next, meta)}
      getKey={(it) => it._id}
      className={className}
      onSwipe={({ dir, item, index: i }) => {
        if (!isAd(item)) onSwiped?.({ dir, poll: item, index: i });
      }}
      enableNext={enableNext}
      enablePrev={enablePrev}
      onNext={onNext}
      onPrev={onPrev}
      arcLift={arcLift}
      rotateMax={rotateMax}
      swipeThresholdFraction={swipeThresholdFraction}
      flingStiffness={flingStiffness}
      flingDamping={flingDamping}
      snapStiffness={snapStiffness}
      snapDamping={snapDamping}
      subButtons={(item) => {
        return subButtons?.(isAd(item) ? { ad: item } : { poll: item }) ?? [];
      }}
      renderCard={(item, ctx) => {
        if (isAd(item)) {
          return <TrialAdCard ad={item} ctx={ctx} onAdClick={onAdClick} />;
        }

        const poll = item as TrialPollType;
        const sel = selectedByPoll?.[poll._id] ?? poll.selectedOptionId ?? "";
        const resolvedVideoId =
          extractYouTubeId(poll.videoId ?? null) ?? poll.videoId ?? null;
        const hasResourceAssets = Array.isArray(poll.resourceAssets) && poll.resourceAssets.length > 0;

        return (
          <div
            className={cn(
              "absolute inset-0 max-w-[36rem] mb-10 mx-auto overflow-y-scroll rounded-2xl border border-black/10 bg-white text-black shadow-2xl",
            )}
          >
            <div className="flex h-full flex-col p-5 overflow-y-scroll">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-widest text-black/55">
                  Trail Poll {ctx.displayIndex} / {ctx.total}
                </span>
                {typeof poll.totalVotes === "number" && showResults && (
                  <span className="text-[11px] text-black/60">
                    Total votes: <b>{poll.totalVotes}</b>
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">
                {poll.title}
              </h2>

              {poll.description && (
                <p className="text-black/70 w-full max-w-full text-wrap -mt-2 -ml-3.5">
                  <RichTextPreview content={poll.description ?? ""} />
                </p>
              )}

              {hasResourceAssets ? (
                <ResourceAssetsCarousel
                  assets={poll.resourceAssets!}
                  title={poll.title}
                />
              ) : (
                <>
                  {poll.imageUrl && (
                    <img
                      src={poll.imageUrl}
                      alt={poll.title}
                      className="mt-3 w-full h-56 rounded-xl object-cover"
                    />
                  )}
                  {resolvedVideoId && (
                    <LockedYouTube
                      videoId={resolvedVideoId}
                      className="mt-3 aspect-video w-full"
                    />
                  )}
                </>
              )}

              <div className="mt-5 grid gap-2">
                {poll.options.map((opt) => {
                  const isSelected = sel === opt._id;
                  const pct = Math.max(
                    0,
                    Math.min(100, Number(opt.percentage ?? 0)),
                  );

                  return (
                    <button
                      key={opt._id}
                      disabled={!!locked}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!locked) onOptionClick?.(poll._id, opt._id, opt);
                      }}
                      className={[
                        "relative w-full rounded-xl border py-3 px-4 text-left transition",
                        "border-black/15",
                        locked
                          ? isSelected
                            ? "ring-2 ring-[#25FBEC] bg-[#25fbec1a]"
                            : "bg-black/[0.04]"
                          : isSelected
                            ? "bg-black/40 hover:bg-black/40 active:bg-black/40"
                            : "bg-black/5 hover:bg-black/10 active:bg-black/20",
                        locked ? "cursor-default" : "",
                      ].join(" ")}
                    >
                      {showResults ? (
                        <>
                          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                            <div className="absolute inset-0 bg-black/[0.03]" />
                            <div
                              className="absolute inset-y-0 left-0 rounded-xl"
                              style={{
                                width: `${pct}%`,
                                background: isSelected
                                  ? "#25FBEC"
                                  : "rgba(37,251,236,0.35)",
                              }}
                            />
                          </div>
                          <div className="relative flex items-center justify-between">
                            <div className="text-[13px] font-medium">
                              {opt.label}
                            </div>
                            <div className="text-[11px] font-semibold text-black/70">
                              {Math.round(pct)}% • {opt.numVotes ?? 0} votes
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative text-[13px] font-medium">
                          {opt.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-6 text-[11px] text-black/50">
                {locked
                  ? "Results are locked for this trial."
                  : "Swipe along the arc • Tap an option to vote"}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
