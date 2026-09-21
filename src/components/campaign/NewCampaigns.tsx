import { CampaignCard } from "../commons/campaign-card-variants";
import { CampaignCardModel } from "@/types/campaigns";
import { dummyCampaignCards } from "@/lib/campaignDummyData";

export function NewForYouCampaignsBlock({
  title = "New for you",
  items = dummyCampaignCards,
  onItemClick,
  onToggleSave,
  isSavedFor,
}: {
  title?: string;
  pageSize?: number;
  filters?: Record<string, string>;
  items?: CampaignCardModel[];
  onItemClick?: (c: CampaignCardModel) => void;
  onToggleSave?: (id: string, next: boolean) => void;
  isSavedFor?: (id: string) => boolean;
}) {
  const cards = items.map((c) => ({
    ...c,
    isSaved: isSavedFor?.(c._id) ?? c.isSaved ?? false,
  }));

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

      <div className="h-10" />
    </section>
  );
}
