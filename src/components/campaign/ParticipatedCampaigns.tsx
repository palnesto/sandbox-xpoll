import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignCard } from "../commons/campaign-card-variants";
import { CampaignCardModel } from "@/types/campaigns";

export function ParticipatedCampaignsBlock({
  title = "Campaign you’ve participated in…",
  items,
  onItemClick,
  onToggleSave,
}: {
  title?: string;
  items: CampaignCardModel[];
  onItemClick?: (c: CampaignCardModel) => void;
  onToggleSave?: (id: string, next: boolean) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollPrev = () => {
    scrollerRef.current?.scrollBy({ left: -320, behavior: "smooth" });
  };
  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="rounded-2xl bg-[#2C1E2114] p-4">
      <h2 className="text-lg xl:text-xl font-medium text-black/80">{title}</h2>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={scrollPrev}
          className="h-12 w-12 shrink-0 rounded-full bg-white/70 grid place-items-center hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div
          ref={scrollerRef}
          className="flex flex-1 min-w-0 gap-6 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
        >
          {items?.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              variant="sm"
              onClick={() => onItemClick?.(c)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
        <button
          onClick={scrollNext}
          className="h-12 w-12 shrink-0 rounded-full bg-white/70 grid place-items-center hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
