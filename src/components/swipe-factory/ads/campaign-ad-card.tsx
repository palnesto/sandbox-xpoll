import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AdItem } from "@/components/swipe-factory/ads/types";
import { truncateText } from "@/utils/truncateWords";

export function CampaignAdCard({
  ad,
  className,
  onAdView,
  onAdClick,
}: {
  ad: AdItem;
  className?: string;
  onAdView?: (adId: string) => void;
  onAdClick?: (adId: string) => void;
}) {
  const href = ad.ctaUrl ?? null;

  // fire impression once when card is ~50% visible
  const rootRef = useRef<HTMLDivElement | null>(null);
  const didViewRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (didViewRef.current) return;

        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          didViewRef.current = true;
          onAdView?.(String(ad._id));
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ad._id, onAdView]);

  const open = useCallback(() => {
    const adId = String(ad._id);
    onAdClick?.(adId);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }, [ad._id, href, onAdClick]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "h-full relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md  px-2 md:px-4 py-2 lg:py-4 hover:cursor-pointer overflow-hidden ",
        href ? "cursor-pointer" : "",
        className,
      )}
      onClick={href ? open : undefined}
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") open();
            }
          : undefined
      }
    >
      {/* Horizontal layout */}
      <div className="flex flex-col md:flex-row items-center gap-4">
      <span className="md:hidden text-[13px] xl:text-sm font-bold tracking-widest text-black">
              SPONSORED
            </span>
        {ad.imageUrl ? (
          <div className="md:w-[150px] 2xl:w-[270px] h-[70px] md:h-[100px] 2xl:h-[170px] border border-black/10 bg-black/[0.02] rounded-lg overflow-hidden">
            <img
              src={ad.imageUrl}
              alt={ad.title ?? "Sponsored"}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div className="w-full md:w-[150px] 2xl:w-[270px] h-[100px] md:h-[100px] 2xl:h-[170px] border border-black/10 bg-black/[0.02] rounded-lg overflow-hidden grid place-items-center">
            <div className="text-[10px] uppercase tracking-widest text-black/35">
              Sponsored
            </div>
          </div>
        )}

        {/* RIGHT: content */}
        <div className="flex-1 text-center md:text-left">
          {/* top row */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <span className="hidden md:block text-[11px] xl:text-sm tracking-widest text-black/55">
              SPONSORED
            </span>

            {/* optional CTA as a small pill on the right (like compact cards) */}
            {href ? (
              <button
                type="button"
                className="hidden md:block shrink-0 w-fit rounded-full border border-black/15 bg-black/5 px-3 py-1 text-[12px] font-medium text-black hover:bg-black/10"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {ad.ctaLabel ?? "Visit"}
              </button>
            ) : null}
          </div>

          {/* title */}
          {ad.title ? (
            <div className="mt-2 truncate text-[15px] xl:text-lg font-semibold leading-snug text-black">
              {truncateText(ad.title, 20)}
            </div>
          ) : null}

          {/* description */}
          {ad.text ? (
            <div className="line-clamp-2 text-[12px] pb-2 md:py-2 text-[12px] xl:text-xs text-black/70">
              {truncateText(ad.text, 100)}
            </div>
          ) : null}
{href ? (
              <button
                type="button"
                className="md:hidden shrink-0 w-full rounded-full border border-black/15 bg-black/5 px-3 py-1 text-[12px] font-medium text-black hover:bg-black/10"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {ad.ctaLabel ?? "Visit"}
              </button>
            ) : null}
          <div className="mt-3 text-[11px] text-black/45">
            Continue scrolling to see more
          </div>
        </div>
      </div>
    </div>
  );
}
