import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/********************\
 *  Base (Controlled)
\********************/

const EndOfDeck: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  return (
    <div className="relative h-full w-full grid place-items-center overflow-hidden rounded-xl border border-dashed">
      {/* Ghost card stack that floats upward + fades out, looping */}
      <div className="absolute inset-0 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2"
            initial={{ y: 24 + i * 12, opacity: 0, scale: 0.98 }}
            animate={{
              y: -80,
              opacity: [0, 1, 1, 0],
              scale: [0.98, 1, 1, 0.96],
            }}
            transition={{
              duration: 2.2,
              delay: i * 0.35,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeInOut",
            }}
            style={{ width: 320 - i * 20, height: 180 - i * 12 }}
          >
            <div className="h-full w-full rounded-2xl bg-black/[0.06] border border-black/10 shadow-lg" />
            {/* Inner “lines” to suggest a poll card */}
            <div className="absolute inset-0 p-4">
              <div className="h-3 w-40 rounded bg-black/[0.12]" />
              <div className="mt-2 h-2 w-56 rounded bg-black/[0.08]" />
              <div className="mt-3 space-y-2">
                <div className="h-8 w-full rounded-xl bg-black/[0.07]" />
                <div className="h-8 w-full rounded-xl bg-black/[0.07]" />
                <div className="h-8 w-full rounded-xl bg-black/[0.07]" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 py-8 text-center">
        {/* <motion.div
          className="text-xl font-semibold"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Polls finished
        </motion.div> */}

        {/* Subline with pulsing dots */}
        <div className="text-xl font-semibold flex items-center gap-1">
          <span>Refresh to load more</span>
          <motion.span
            className="inline-block"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            •
          </motion.span>
          <motion.span
            className="inline-block"
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          >
            •
          </motion.span>
          <motion.span
            className="inline-block"
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          >
            •
          </motion.span>
        </div>

        {/* Refresh button with rotating icon */}
        <Button
          size="lg"
          className="mt-2 rounded-full bg-teal-600 text-white hover:bg-teal-700"
          onClick={() => onRefresh?.()}
        >
          <motion.span
            className="mr-2 inline-flex"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <RotateCcw className="h-5 w-5" />
          </motion.span>
          Refresh
        </Button>
      </div>
    </div>
  );
};

/** Directions + Handle exposed to parent */
export type SwipeDir = "left" | "right";
export type SwipeHandle = { swipe: (dir: SwipeDir) => void };

/** Context passed to renderCard */
export type RenderCtx = {
  indexFromTop: number; // 0 = top
  displayIndex: number; // 1-based visible position
  total: number; // total items
  isTop: boolean;
};

/** Utility */
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Base Props — Controlled index */
export interface BaseProps<T> {
  items: T[];
  index: number;
  onIndexChange?: (
    nextIndex: number,
    meta?: { reason: "swipe" | "next" | "prev"; dir?: SwipeDir }
  ) => void;

  renderCard: (item: T, ctx: RenderCtx) => React.ReactNode;
  getKey?: (item: T, index: number) => React.Key;

  stackDepth?: number;
  disabled?: boolean;
  className?: string;

  onSwipe?: (e: { dir: SwipeDir; item: T; index: number }) => void;

  enableNext?: boolean;
  enablePrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;

  subButtons?: (item: T) => {
    node: React.ReactNode;
  }[];

  baseRef?: React.Ref<SwipeHandle & { next: () => void; prev: () => void }>;

  /** Arc + physics config */
  arcLift?: number; // default 80
  rotateMax?: number; // default 18
  swipeThresholdFraction?: number; // default 0.28
  flingStiffness?: number; // default 320
  flingDamping?: number; // default 28
  snapStiffness?: number; // default 540
  snapDamping?: number; // default 36
}

/**
 * Leaving card overlay that finishes its own exit.
 * Renders ABOVE the stack, with pointer events disabled so the new top is usable immediately.
 */
function LeavingCard<T>({
  item,
  renderCard,
  ctx,
  startX,
  vw,
  arcLift,
  rotateMax,
  targetX,
  stiffness,
  damping,
  onDone,
}: {
  item: T;
  renderCard: BaseProps<T>["renderCard"];
  ctx: Omit<RenderCtx, "isTop"> & { isTop?: boolean };
  startX: number;
  vw: number;
  arcLift: number;
  rotateMax: number;
  targetX: number;
  stiffness: number;
  damping: number;
  onDone: () => void;
}) {
  const x = useMotionValue(startX);
  const opacity = useMotionValue(1); // optional tiny fade near the very end
  const y = useTransform(x, (vx) => {
    const t = clamp(vx / (vw || 360), -1, 0);
    return t * t * arcLift; // positive y as it exits left
  });
  const rotateZ = useTransform(x, (vx) => (vx / (vw || 360)) * rotateMax);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Animate X to offscreen; keep fully visible for most of the path
      await animate(x, targetX, {
        type: "spring",
        stiffness,
        damping,
      });

      // Optional: a tiny fade as it leaves (purely aesthetic)
      await animate(opacity, 0.92, { duration: 0.08 });

      if (!cancelled) onDone();
    })();

    return () => {
      cancelled = true;
    };
  }, [x, targetX, stiffness, damping, onDone, opacity]);

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-[60]" // ABOVE the stack, no interactions
      style={{ x, y, rotateZ, opacity }}
    >
      <div className="absolute inset-0">
        {renderCard(item, {
          ...ctx,
          isTop: true, // draw with top styling if your card changes visuals for top
        })}
      </div>
    </motion.div>
  );
}

/**
 * Base — controlled deck implemented with Framer Motion.
 * - Left-swipe only; right swipe does nothing (no visual reaction).
 * - New top card becomes immediately draggable (we advance index instantly).
 * - Outgoing card exits in an overlay above the stack (non-interactive but visible to completion).
 */
export function Base<T>({
  items,
  index,
  onIndexChange,
  renderCard,
  getKey,
  stackDepth = 3,
  disabled,
  className,
  onSwipe,
  enableNext = true,
  enablePrev = true,
  onNext,
  onPrev,
  subButtons,
  baseRef,
  // Arc/physics
  arcLift = 80,
  rotateMax = 18,
  swipeThresholdFraction = 0.28,
  flingStiffness = 320,
  flingDamping = 28,
  snapStiffness = 540,
  snapDamping = 36,
}: BaseProps<T>) {
  const total = items.length;

  // --- Viewport helpers for thresholds/targets ---
  const vwRef = useRef<number>(
    typeof window !== "undefined" ? window.innerWidth : 360
  );
  useLayoutEffect(() => {
    const update = () => (vwRef.current = window.innerWidth || 360);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const vw = vwRef.current;
  const thresholdPx = useMemo(
    () => Math.min(140, Math.round(vw * swipeThresholdFraction)),
    [vw, swipeThresholdFraction]
  );
  const offscreenXLeft = useCallback(() => -vwRef.current * 1.2, []);

  // Visible window for performance + visuals
  const visible = useMemo(
    () => items.slice(index, Math.min(total, index + stackDepth)),
    [items, index, total, stackDepth]
  );

  // Motion value for the current top card
  const x = useMotionValue(0);

  // Leaving cards overlay
  const [leavers, setLeavers] = useState<
    Array<{ id: number; item: T; globalIdx: number; startX: number }>
  >([]);
  const leaverIdRef = useRef(1);

  // Commit a left swipe immediately; leaving card finishes independently
  const commitSwipeLeft = useCallback(() => {
    if (disabled || !enableNext || index >= total - 1) return;

    const startX = x.get(); // negative at commit
    const id = leaverIdRef.current++;
    const leavingItem = items[index];

    // Track leaving card for overlay
    setLeavers((ls) => [
      ...ls,
      { id, item: leavingItem, globalIdx: index, startX },
    ]);

    // Fire callbacks right away -> new top becomes active on next render
    onSwipe?.({ dir: "left", item: leavingItem, index });
    if (enableNext) {
      onIndexChange?.(Math.min(total, index + 1), {
        reason: "swipe",
        dir: "left",
      });
    }
    onNext?.();

    // Reset x so the next top is centered & draggable instantly
    x.set(0);
  }, [
    disabled,
    enableNext,
    index,
    total,
    x,
    items,
    onIndexChange,
    onSwipe,
    onNext,
  ]);

  useImperativeHandle(
    baseRef,
    () => ({
      swipe: (dir: SwipeDir) => {
        if (dir !== "left") return; // right is disabled
        commitSwipeLeft();
      },
      next: () => {
        const next = Math.min(total, index + 1);
        if (next !== index) onIndexChange?.(next, { reason: "next" });
        onNext?.();
      },
      prev: () => {
        const prev = Math.max(0, index - 1);
        if (prev !== index) onIndexChange?.(prev, { reason: "prev" });
        onPrev?.();
      },
    }),
    [commitSwipeLeft, index, total, onIndexChange, onNext, onPrev]
  );

  // Arc/tilt for current top
  const y = useTransform(x, (vx) => {
    const edge = vwRef.current || 360;
    const t = clamp(vx / edge, -1, 0); // [-1, 0]
    return t * t * arcLift;
  });
  const rotateZ = useTransform(x, (vx) => {
    const edge = vwRef.current || 360;
    return (vx / edge) * rotateMax;
  });

  // Drag end -> commit or snap back
  const handleDragEnd = async () => {
    if (disabled || !enableNext || index >= total - 1) return;
    const current = x.get(); // <= 0
    const passed = Math.abs(current) > thresholdPx;
    if (passed) {
      commitSwipeLeft(); // do NOT await; new top becomes active now
    } else {
      await animate(x, 0, {
        type: "spring",
        stiffness: snapStiffness,
        damping: snapDamping,
      });
    }
  };

  // Keyboard: only Left Arrow commits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "ArrowLeft") commitSwipeLeft();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, commitSwipeLeft]);

  // Build cards bottom → top so top renders last
  const cards: React.ReactNode[] = [];
  for (let localIdx = visible.length - 1; localIdx >= 0; localIdx--) {
    const item = visible[localIdx];
    const globalIdx = index + localIdx;
    const isTop = localIdx === 0;
    const indexFromTop = localIdx;
    const displayIndex = globalIdx + 1;

    const scale = 1 - Math.min(0.04 * indexFromTop, 0.12);
    const translateY = 6 * indexFromTop;

    const content = (
      <div className="absolute inset-0">
        {renderCard(item, { indexFromTop, displayIndex, total, isTop })}
      </div>
    );

    cards.push(
      <div
        key={(getKey ? getKey(item, globalIdx) : globalIdx) as React.Key}
        className="absolute inset-0 mb-[50px]"
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          transition: isTop ? "none" : "transform 120ms ease",
          willChange: isTop ? "auto" : "transform",
        }}
      >
        {isTop ? (
          <motion.div
            className="w-full h-full"
            style={{
              x,
              y,
              rotateZ,
              touchAction: "pan-y",
            }}
            // Tiny settle to make handoff feel intentional (still instant)
            initial={{ opacity: 0.965, scale: 0.998 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: -vwRef.current, right: 0 }} // right disabled
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            dragListener={!(disabled || !enableNext || index >= total - 1)}
          >
            {content}
          </motion.div>
        ) : (
          <div className="pointer-events-none">{content}</div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(`relative select-none`, className)}>
      {/* Base stacked cards (new top is already active) */}
      {cards}

      {/* Leaving cards overlay ABOVE the stack; non-interactive but visible to completion */}
      {leavers.length > 0 && (
        <div className="absolute inset-0 z-[60] pointer-events-none">
          {leavers.map((lv) => (
            <LeavingCard<T>
              key={lv.id}
              item={lv.item}
              renderCard={renderCard}
              ctx={{
                indexFromTop: 0,
                displayIndex: lv.globalIdx + 1,
                total,
              }}
              startX={lv.startX}
              vw={vw}
              arcLift={arcLift}
              rotateMax={rotateMax}
              targetX={offscreenXLeft()}
              stiffness={flingStiffness}
              damping={flingDamping}
              onDone={() =>
                setLeavers((ls) => ls.filter((x) => x.id !== lv.id))
              }
            />
          ))}
        </div>
      )}

      {/* Optional controls */}
      {(onPrev || onNext || subButtons) && index < total && (
        <div className="flex justify-between gap-8 z-50 fixed bg-[#28f9ec] bottom-10 left-[50%] translate-x-[-50%] w-auto md:w-96 py-4 items-center px-2 rounded-xl">
          {subButtons?.(items[index])?.map((btn) => {
            return btn?.node;
          })}
          {onPrev && (
            <Button
              size={"lg"}
              className={`px-3 py-5 rounded-lg border ${
                enablePrev && index > 0
                  ? "bg-white text-black hover:bg-slate-100"
                  : "bg-slate-300 hover:bg-slate-300  cursor-not-allowed text-black"
              }`}
              onClick={
                enablePrev && index > 0
                  ? () => {
                      const prev = Math.max(0, index - 1);
                      if (prev !== index)
                        onIndexChange?.(prev, { reason: "prev" });
                      onPrev?.();
                    }
                  : undefined
              }
            >
              <ArrowLeft className={pollButtonClass} />
            </Button>
          )}
          {onNext && (
            <Button
              size={"lg"}
              className={`px-3 py-2 rounded-lg border bg-white text-black hover:bg-slate-100`}
              onClick={
                enableNext && index < total
                  ? () => {
                      const next = Math.min(total, index + 1);
                      if (next !== index)
                        onIndexChange?.(next, { reason: "next" });
                      onNext?.();
                    }
                  : undefined
              }
            >
              <ArrowRight className={pollButtonClass} />
            </Button>
          )}
        </div>
      )}

      {/* Empty state spacer when exhausted */}
      {index >= total && (
        <EndOfDeck onRefresh={() => window.location.reload()} />
      )}
    </div>
  );
}

export const pollButtonClass = "h-20 aspect-square";
