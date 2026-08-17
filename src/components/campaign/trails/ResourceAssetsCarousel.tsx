import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { extractYouTubeId } from "@/types/petition";

export type ResourceAsset = {
  type: "image" | "youtube" | "video";
  value: string;
};

export function ResourceAssetsCarousel({
  assets,
  title,
  className,
}: {
  assets: ResourceAsset[];
  title: string;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !assets.length) return;
    const width = el.clientWidth;
    const scrollLeft = el.scrollLeft;
    const index = Math.round(scrollLeft / width);
    setActiveIndex(Math.min(index, assets.length - 1));
  }, [assets.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateActiveIndex();
    el.addEventListener("scroll", updateActiveIndex);
    const ro = new ResizeObserver(updateActiveIndex);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateActiveIndex);
      ro.disconnect();
    };
  }, [updateActiveIndex]);

  const scrollBy = useCallback((delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth;
    el.scrollBy({ left: delta * step, behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: i * width, behavior: "smooth" });
  }, []);

  if (!assets.length) return null;

  return (
    <div className={cn("relative mt-3", className)}>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto overflow-y-hidden gap-0 snap-x snap-mandatory scroll-smooth touch-pan-x select-none scrollbar-hide"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {assets?.map((asset, i) => (
          <div
            key={`${asset.type}-${i}-${asset.value.slice(0, 30)}`}
            className="shrink-0 w-full min-w-full snap-center snap-always flex justify-center items-center"
          >
            {asset.type === "image" && (
              <img
                src={asset.value}
                alt={title}
                className="w-full max-h-72 object-cover rounded-xl bg-gray-100"
              />
            )}
            {asset.type === "youtube" && (() => {
              const videoId = extractYouTubeId(asset.value) ?? asset.value;
              return (
                <div className="w-full aspect-video max-h-72 rounded-xl overflow-hidden bg-black">
                  <iframe
                    title="YouTube video"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&rel=0&playsinline=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            })()}
            {asset.type === "video" && (
              <video
                src={asset.value}
                controls
                playsInline
                muted={false}
                className="w-full max-h-72 object-contain rounded-xl bg-black"
              />
            )}
          </div>
        ))}
      </div>

      {assets.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {assets.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "rounded-full transition-all duration-200",
                i === activeIndex
                  ? "w-2.5 h-2.5 bg-black/80"
                  : "w-2 h-2 bg-black/30 hover:bg-black/50",
              )}
            />
          ))}
        </div>
      )}

      {assets.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollBy(-1);
            }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center shadow"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollBy(1);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center shadow"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
