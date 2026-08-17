import { useMemo } from "react";
import { useApiInfinitePagedQuery } from "@/hooks/useApiInfinitePagedQuery";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { endpoints } from "@/api/endpoints";
import { CampaignCard } from "../commons/campaign-card-variants";
import {
  ApiCampaign,
  CampaignCardModel,
  mapApiCampaignToNewCard,
} from "@/types/campaigns";

export function NewForYouCampaignsBlock({
  title = "New for you",
  pageSize = 20,
  filters,
  onItemClick,
  onToggleSave,
  isSavedFor,
}: {
  title?: string;
  pageSize?: number;
  filters?: Record<string, string>;
  onItemClick?: (c: CampaignCardModel) => void;
  onToggleSave?: (id: string, next: boolean) => void;
  isSavedFor?: (id: string) => boolean;
}) {
  const queryFilters = useMemo(
    () => ({ ...(filters ?? {}), variant: "new" }),
    [filters],
  );

  const {
    items,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useApiInfinitePagedQuery<ApiCampaign, Record<string, string>>({
    route: endpoints.campaigns.all,
    filters: queryFilters,
    pageSize,
  });

  const cards = useMemo(() => {
    return items.map((api) => {
      const c = mapApiCampaignToNewCard(api);
      return { ...c, isSaved: isSavedFor?.(c._id) ?? false };
    });
  }, [items, isSavedFor]);

  const sentinelRef = useIntersectionObserver({
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onIntersect: fetchNextPage,
    rootMargin: "500px",
  });

  if (isLoading) {
    return (
      <section className="py-4">
        <h2 className="lg:text-xl font-medium">{title}</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-black/5 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="py-4">
        <h2 className="text-lg xl:text-xl font-medium text-black/80">
          {title}
        </h2>
        <div className="mt-3 text-sm text-red-600">
          Failed to load campaigns
          {(error as any)?.message ? `: ${(error as any).message}` : ""}
        </div>
      </section>
    );
  }

  if (!cards.length) return null;

  return (
    <section className="py-4">
      <h2 className="text-lg xl:text-xl font-medium text-black/90">{title}</h2>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards?.map((c) => (
          <CampaignCard
            key={c._id}
            campaign={c}
            variant="lg"
            onClick={() => onItemClick?.(c)}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-10" />

      {isFetchingNextPage && (
        <div className="mt-3 text-center text-sm text-black/60">
          Loading more…
        </div>
      )}
    </section>
  );
}
