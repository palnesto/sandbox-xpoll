import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ViewAllButton } from "@/utils/view-all-button";
import { extractYouTubeId } from "@/types/petition";

export type TrialCardItem = {
  id: string;
  title: string;
  imageUrl: string;
};

export default function TrialsCarousel({
  items,
  heading = "Trails",
}: // className = "",
{
  items?: TrialCardItem[];
  heading?: string;
  // className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const listUrl = `${endpoints.trial.topRecommendations}`;
  const { data, isLoading, isError } = useApiQuery(listUrl);
  const entries = useMemo(() => data?.data?.data, [data]);

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
    <section className="relative">
      <header className="pb-4 pt-2 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
        <ViewAllButton onClick={() => navigate("/trial")}>
          view all
        </ViewAllButton>
      </header>

      {/* Track */}
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

        {/* Cards */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 pb-1"
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          onWheel={(e) => {
            const el = trackRef.current;
            if (!el) return;
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
              el.scrollLeft += e.deltaY;
              // e.preventDefault();
            }
          }}
        >
          {(!items || !items.length) &&
            !isLoading &&
            (isError || entries.length === 0) && (
              <div className="py-10 pl-1 text-sm text-black/60">
                No trails to show.
              </div>
            )}

          {entries?.map((it: any) => {
            const assets = it?.resourceAssets ?? [];
            const firstImage = assets.find(
              (a: any) => a?.type === "image",
            )?.value;
            const firstVideo = assets.find(
              (a: any) => a?.type === "video",
            )?.value;
            const firstYoutube = assets.find(
              (a: any) => a?.type === "youtube",
            )?.value;
            const youtubeId = firstYoutube
              ? (extractYouTubeId(String(firstYoutube)) ?? String(firstYoutube))
              : null;
            const placeholder = "/images/placeholder.png";

            const renderMedia = () => {
              if (firstImage) {
                return (
                  <img
                    src={firstImage}
                    alt={it?.title ?? ""}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                );
              }
              if (firstVideo) {
                return (
                  <video
                    src={firstVideo}
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] bg-black"
                  />
                );
              }
              if (youtubeId) {
                return (
                  <iframe
                    title={it?.title ?? "Trail video"}
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1&modestbranding=1&rel=0&playsinline=1`}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04] bg-black"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              }
              return (
                <img
                  src={placeholder}
                  alt={it?.title ?? ""}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              );
            };

            return (
              <article
                key={it._id}
                className="group relative w-[260px] flex-shrink-0 snap-start rounded-3xl border-4 border-[#ED0C1D] overflow-hidden"
              >
                <button
                  onClick={() => navigate(`/trial/${it._id}`)}
                  className="relative block h-[160px] w-full overflow-hidden rounded-[18px]"
                  aria-label={it.title}
                  title={it.title}
                >
                  {renderMedia()}
                </button>

                <h2 className="absolute -top-1 -right-1 rounded-tr-2xl rounded-bl-2xl bg-[#ED0C1D] px-3 py-1.5 text-white shadow-md max-w-[200px] truncate font-semibold">
                  {it?.externalAuthor ? "User trail" : "Admin trail"}
                </h2>
                <h2 className="absolute -bottom-1 -left-1 rounded-tr-2xl rounded-bl-2xl bg-[#ED0C1D] px-3 py-1.5 text-white shadow-md max-w-[200px] truncate font-semibold">
                  {it?.title}
                </h2>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
