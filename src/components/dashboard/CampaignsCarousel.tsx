import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ViewAllButton } from "@/utils/view-all-button";
import { dummyCarouselCampaigns } from "@/lib/campaignDummyData";

export type CampaignsCardItem = {
  id: string;
  title: string;
  imageUrl: string;
};

export default function CampaignsCarousel({
  items,
  heading = "Campaigns",
  className = "",
}: {
  items?: CampaignsCardItem[];
  heading?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const cards = items ?? dummyCarouselCampaigns;

  const scrollBy = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className={`py-4 ${className}`}>
      <header className="pb-3 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
        <ViewAllButton onClick={() => navigate("/campaigns/all-campaigns")}>
          view all
        </ViewAllButton>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden items-center pl-1 md:flex">
          <button
            onClick={() => scrollBy("left")}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white shadow-md transition hover:bg-black"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden items-center pr-1 md:flex">
          <button
            onClick={() => scrollBy("right")}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white shadow-md transition hover:bg-black"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 pb-1"
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          onWheel={(e) => {
            const el = trackRef.current;
            if (!el) return;
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
              el.scrollLeft += e.deltaY;
            }
          }}
        >
          {cards.length === 0 && (
            <div className="py-10 pl-1 text-sm text-black/60">
              No campaigns to show.
            </div>
          )}

          {cards.map((it) => (
            <article
              key={it.id}
              className="w-[300px] md:w-[400px] p-2 flex-shrink-0 snap-start rounded-2xl bg-[#25FBEC] overflow-hidden"
            >
              <button
                onClick={() => navigate(`/campaigns/all-campaigns/${it.id}`)}
                className="h-48 w-full rounded-lg bg-black/5 overflow-hidden"
                aria-label={it.title}
                title={it.title}
              >
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs text-black/50">
                    No image
                  </div>
                )}
              </button>

              <h2 className="py-1 text-black truncate font-semibold">
                {it.title}
              </h2>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
