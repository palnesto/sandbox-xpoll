import { cn } from "@/lib/utils";
import {
  CampaignCardModel,
  CampaignCardVariant,
  EarningToken,
} from "@/types/campaigns";
import { Bookmark } from "lucide-react";

export const TopIndicator = ({
  label,
  textClass,
  bgClass,
  variant = "lg",
}: {
  label: string;
  textClass?: string;
  bgClass?: string;
  variant?: "sm" | "lg";
}) => {
  const container =
    variant === "sm"
      ? "absolute z-10 top-2 left-2 flex w-fit rounded-full px-2 py-[2px] items-center text-[10px] font-semibold"
      : "absolute z-10 top-2 left-2 flex w-fit rounded-full px-3 py-1 items-center text-xs font-semibold";

  return (
    <div className={cn(container, bgClass, textClass)}>
      <span className="uppercase tracking-wide">{label}</span>
    </div>
  );
};

function Avatar({
  src,
  alt,
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn("h-8 w-8 rounded-full bg-black/10 shrink-0", className)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? "avatar"}
      className={cn(
        "h-8 w-8 rounded-full object-cover object-top shrink-0",
        className,
      )}
      loading="lazy"
    />
  );
}

export function EarningPotentialStrip({ tokens }: { tokens?: EarningToken[] }) {
  if (!tokens?.length) return null;

  return (
    <div className="absolute left-0 right-0 bottom-0 z-10 bg-white px-3 py-2">
      <div className="text-sm font-semibold uppercase tracking-wide text-black/60">
        Complete earning potential
      </div>
      <div className="mt-1 flex gap-2 overflow-x-scroll">
        {tokens.map((t) => (
          <span
            key={`${t.symbol}-${t.amount}`}
            className="inline-flex items-center gap-1 rounded-sm bg-[#F2F3F5] px-2 py-1 text-sm"
          >
            <span className="font-semibold">{t.amount.toFixed(3)}</span>
            <span className="text-black/60">{t.symbol}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===================== Bookmark Button (Reusable) ===================== */

function BookmarkButton({
  isSaved,
  onClick,
}: {
  isSaved?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={isSaved ? "Unsave" : "Save"}
      onClick={onClick}
      className={cn(
        "absolute z-10 top-2 right-2 grid place-items-center rounded-full backdrop-blur-3xl px-2 py-2 shadow-sm",
        "bg-black/60",
      )}
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition",
          isSaved ? "fill-[#25FBEC] text-[#25FBEC]" : "text-white",
        )}
      />
    </button>
  );
}

/* ===================== SMALL CARD ===================== */

function CampaignCardSm({
  campaign,
  onClick,
  onToggleSave,
}: {
  campaign: CampaignCardModel;
  onClick?: (c: CampaignCardModel) => void;
  onToggleSave?: (id: string, next: boolean) => void;
}) {
  const trailsText =
    campaign.trailsCompleted != null && campaign.trailsTotal != null
      ? `Trails completed: ${campaign.trailsCompleted} / ${campaign.trailsTotal}`
      : null;

  return (
    <div
      className="cursor-pointer"
      onClick={() => onClick?.(campaign)}
      role="button"
      tabIndex={0}
    >
      <div className="relative h-32 lg:h-40 w-[200px] lg:w-[250px] 2xl:w-[300px] overflow-hidden rounded-xl">
        {campaign.status === "live" &&
          typeof campaign.isSaved === "boolean" && (
            <button
              type="button"
              aria-label={campaign.isSaved ? "Unsave" : "Save"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave?.(campaign._id, !campaign.isSaved);
              }}
              className={cn(
                "absolute z-10 top-2 right-2 grid place-items-center rounded-full backdrop-blur-3xl px-2 py-2 shadow-sm",
                "bg-black/60",
              )}
            >
              <Bookmark
                className={cn(
                  "h-4 w-4 transition",
                  campaign.isSaved
                    ? "fill-[#25FBEC] text-[#25FBEC]"
                    : "text-white",
                )}
              />
            </button>
          )}

        <img
          src={campaign.imageLinks?.[0] ?? ""}
          alt={campaign.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="pt-2 w-[220px]">
        <div className="flex items-start gap-2">
          <Avatar
            src={campaign.avatarUrl}
            alt={campaign.username}
            className="h-9 w-9"
          />
          <div className="min-w-0">
            <div className="font-semibold text-sm line-clamp-2">
              {campaign.name}
            </div>
            <div className="text-xs text-black/60 mt-0.5">
              {campaign.username && <div>{campaign.username}</div>}
              {trailsText && <div className="text-black/50">{trailsText}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== LARGE CARD ===================== */

function CampaignCardLg({
  campaign,
  onClick,
  onToggleSave,
}: {
  campaign: CampaignCardModel;
  onClick?: (c: CampaignCardModel) => void;
  onToggleSave?: (id: string, next: boolean) => void;
}) {
  const canBookmark = campaign.status === "live" && !!onToggleSave;

  return (
    <div
      className="cursor-pointer overflow-hidden"
      onClick={() => onClick?.(campaign)}
      role="button"
      tabIndex={0}
    >
      <section className="relative h-60 2xl:h-72 overflow-hidden rounded-2xl">
        <figure className="relative h-full w-full">
          {canBookmark && (
            <BookmarkButton
              isSaved={campaign.isSaved}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave?.(campaign._id, !campaign.isSaved);
              }}
            />
          )}

          <img
            src={campaign.imageLinks?.[0] ?? ""}
            alt={campaign.name}
            className="h-full w-full object-cover"
          />
        </figure>
        <EarningPotentialStrip tokens={campaign.earningPotential} />
      </section>

      <div className="pt-3 overflow-hidden flex gap-2">
        <Avatar
          src={campaign.avatarUrl}
          alt={campaign.username}
          className="h-11 w-11"
        />
        <div>
          <div className="font-semibold line-clamp-1 text-lg">
            {campaign.name}
          </div>
          {campaign.username && (
            <div className="text-black/60 py-1.5">{campaign.username}</div>
          )}
          {campaign.goal && (
            <p className="text-black/45 line-clamp-3">{campaign.goal}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CampaignCard({
  campaign,
  variant,
  onClick,
  onToggleSave,
}: {
  campaign: CampaignCardModel;
  variant: CampaignCardVariant;
  onClick?: (c: CampaignCardModel) => void;
  onToggleSave?: (id: string, next: boolean) => void;
}) {
  return variant === "sm" ? (
    <CampaignCardSm
      campaign={campaign}
      onClick={onClick}
      onToggleSave={onToggleSave}
    />
  ) : (
    <CampaignCardLg
      campaign={campaign}
      onClick={onClick}
      onToggleSave={onToggleSave}
    />
  );
}
