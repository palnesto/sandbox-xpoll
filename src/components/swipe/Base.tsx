import React, { useCallback, useEffect, useRef, useState } from "react";

/*************************************************
 * LEVEL 1 — BASE (generic, UI-agnostic swiper)
 *************************************************/

/**
 * Minimal, reusable, and UI-agnostic swiper foundation.
 *
 * Responsibilities:
 *  - Hold current index
 *  - Next/Prev navigation (with enable flags)
 *  - Simple keyboard (←/→) and touch/drag swipe handling
 *  - Render items via a pure `ui(item)` function (typed by T)
 *
 * Out of scope:
 *  - Any domain-specific UI (polls/bumble/etc.)
 *  - Side effects beyond calling provided callbacks
 */
export interface BaseProps<T> {
  /** Items to swipe through */
  arr: T[];
  /** Allow going forward */
  enableNext?: boolean;
  /** Allow going backward */
  enablePrev?: boolean;
  /** Notify parent when the user navigates forward */
  onNext?: (nextIndex: number, prevIndex: number) => void;
  /** Notify parent when the user navigates backward */
  onPrev?: (nextIndex: number, prevIndex: number) => void;
  /**
   * Render function for a single item. The parameter type is strictly `T`.
   * Example usage when using Base directly:
   *   <Base arr={things} ui={(item) => <Card {...item} />} />
   */
  ui: (item: T) => React.ReactNode;
}

export function Base<T>({
  arr,
  enableNext = true,
  enablePrev = true,
  onNext,
  onPrev,
  ui,
}: BaseProps<T>) {
  const [index, setIndex] = useState(0);

  const count = arr.length;
  const canGoPrev = enablePrev && index > 0;
  const canGoNext = enableNext && index < count - 1;

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setIndex((prev) => {
      const next = prev + 1;
      onNext?.(next, prev);
      return next;
    });
  }, [canGoNext, onNext]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setIndex((prev) => {
      const next = prev - 1;
      onPrev?.(next, prev);
      return next;
    });
  }, [canGoPrev, onPrev]);

  // Keyboard support (Left/Right arrows)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Simple touch/drag handling
  const startX = useRef<number | null>(null);
  const THRESHOLD = 40; // px

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (dx <= -THRESHOLD) {
      goNext();
    } else if (dx >= THRESHOLD) {
      goPrev();
    }
    startX.current = null;
  };

  // When items change, clamp index
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  return (
    <div
      className="w-full select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={goPrev}
          className="px-3 py-1 rounded-xl border disabled:opacity-40"
          aria-label="Previous"
        >
          prev
        </button>

        <div className="text-sm opacity-70">
          {count ? index + 1 : 0} / {count}
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={goNext}
          className="px-3 py-1 rounded-xl border disabled:opacity-40"
          aria-label="Next"
        >
          next
        </button>
      </div>

      {/* Render all items but only show the active one. */}
      <div className="relative">
        {arr.map((item, idx) => (
          <div
            key={idx}
            data-active={idx === index}
            className={
              idx === index ? "block transition-opacity duration-200" : "hidden"
            }
          >
            {ui(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
