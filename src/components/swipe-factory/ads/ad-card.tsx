import React, { useCallback } from "react";
import { AdItem } from "./types";

export function AdCard({
  ad,
  ctx,
  onAdClick,
}: {
  ad: AdItem;
  ctx: { displayIndex: number; total: number };
  onAdClick?: (adId: string) => void;
}) {
  const href = ad.ctaUrl ?? null;

  const open = useCallback(() => {
    onAdClick?.(String(ad._id));
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }, [ad._id, href, onAdClick]);

  return (
    <div
      className={`absolute inset-0 max-w-[36rem] md:mx-auto overflow-auto rounded-2xl border border-black/10 bg-white text-black shadow-2xl m-2 ${
        href ? "cursor-pointer" : ""
      }`}
      onClick={href ? open : undefined}
    >
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-widest text-black/60">
            SPONSORED
          </span>
        </div>

        {ad.title && (
          <div className="mt-2 text-lg font-semibold leading-snug">
            {ad.title}
          </div>
        )}

        {ad.imageUrl ? (
          <div className="mt-3 h-44 md:h-60 w-full overflow-hidden rounded-xl border">
            <img
              src={ad.imageUrl}
              alt={ad.title ?? "Sponsored"}
              className="w-full h-full object-cover"
              draggable="false"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          <div
            // className="mt-3 h-44 md:h-60 w-full overflow-hidden rounded-xl border bg-black/[0.03] flex items-center justify-center"
            // ✅ keep same behavior as image: tapping this area won't open the link
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* <div className="text-xs text-black/50 px-4 text-center">
              No image provided
            </div> */}
          </div>
        )}

        <div className="mt-4 text-sm text-black/80 leading-relaxed">
          {ad.text}
        </div>

        {href && (
          <button
            type="button"
            className="mt-4 inline-flex w-fit rounded-xl border border-black/15 bg-black/5 px-4 py-2 text-[13px] font-medium hover:bg-black/10"
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
        )}

        <div className="mt-auto pt-6 text-[11px] text-black/50">
          Swipe to continue
        </div>
      </div>
    </div>
  );
}
