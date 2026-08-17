import React from "react";
import { Base, SwipeDir, SwipeHandle } from "./base-swipe";
import { PollCard } from "./poll-card-ui";

import { AdCard } from "./ads/ad-card";
import { DeckItem, isAd } from "./ads/types";

export type Option = { _id: string; value: string; label: string };

export type PollType = {
  _id: string;
  title: string;
  description: string;

  options: Option[];
  myVote?: { optionId: string | null };
  details?: {
    resourceAssets?: {
      type: "image" | "youtube" | string;
      value: string;
    }[];
    optionStats?: {
      _id: string;
      numVotes: number;
      archivedAt?: string | null;
    }[];
    expireRewardAt?: string | null;
    externalAuthor?: string | null;
  };
};

export interface GenericSwippablePollProps {
  items: ReadonlyArray<DeckItem<PollType>>;
  /** Controlled index */
  index: number;
  onIndexChange?: (
    next: number,
    meta?: { reason: "swipe" | "next" | "prev" },
  ) => void;

  /** Optional UI + behavior knobs */
  onOptionClick?: (
    pollId: string,
    optionId: Option["_id"],
    option: Option,
  ) => void;
  onSwiped?: (e: { dir: SwipeDir; poll: PollType; index: number }) => void;
  subButtons?: (e: { poll: PollType }) => void;

  enableNext?: boolean;
  enablePrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;

  className?: string; // control height via CSS, e.g. h-[440px]

  /** Arc/physics pass-through (optional) */
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

export function GenericSwippablePoll({
  items,
  index,
  onIndexChange,
  onOptionClick,
  onSwiped,
  enableNext,
  enablePrev,
  onNext,
  onPrev,
  onAdClick,
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
}: GenericSwippablePollProps) {
  return (
    <Base<PollType>
      baseRef={baseRef}
      items={items as DeckItem<PollType>[]}
      index={index}
      onIndexChange={(next, meta) => onIndexChange?.(next, meta)}
      getKey={(item) => item._id}
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
        if (isAd(item)) return [];
        return subButtons?.({ poll: item }) ?? [];
      }}
      renderCard={(item, ctx) => {
        if (isAd(item)) {
          return <AdCard ad={item} ctx={ctx} onAdClick={onAdClick} />;
        }
        return <PollCard poll={item} ctx={ctx} onOptionClick={onOptionClick} />;
      }}
    />
  );
}

/* ===========================================================
   PURE DISPLAY MODEL (read-only) — DO NOT EDIT
   -----------------------------------------------------------
   Computes counts/percentages deterministically from PollType.
   This is the only place the results math lives.
   =========================================================== */
