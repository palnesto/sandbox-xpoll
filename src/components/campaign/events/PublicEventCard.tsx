import {
  Calendar,
  Coins,
  Lock,
  Sparkles,
  Ticket,
  Unlock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import "@/utils/time"; // ensures dayjs UTC plugin is extended

type CoinAmount = string | number | { $numberDecimal?: string } | null;

export type PublicEventCardItem = {
  _id: string;
  name: string;
  coverImageUrl?: string | null;
  visibility: "public" | "private";
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  capacity?: { maxTickets: number; ticketsSold: number };
  pricing: {
    mode: "free" | "paid";
    coins?: { assetId: string; amount: CoinAmount }[];
  };
};

type Props = {
  event: PublicEventCardItem;
  isInvited: boolean;
  hasTicket?: boolean;
  onClick: () => void;
};

function formatRange(startISO?: string, endISO?: string, tz?: string) {
  if (!startISO || !endISO) return "";
  const zone = tz || "UTC";
  const s = dayjs.utc(startISO).tz(zone);
  const e = dayjs.utc(endISO).tz(zone);
  if (!s.isValid() || !e.isValid()) return "";
  const sameDay = s.format("YYYY-MM-DD") === e.format("YYYY-MM-DD");
  const zoneLabel = zone === "UTC" ? "UTC" : zone;
  return sameDay
    ? `${s.format("MMM D")} · ${s.format("h:mm A")}–${e.format("h:mm A")} ${zoneLabel}`
    : `${s.format("MMM D")} – ${e.format("MMM D")} ${zoneLabel}`;
}

function coinAmountStr(amount: CoinAmount): string {
  if (amount == null) return "0";
  if (typeof amount === "string") return amount;
  if (typeof amount === "number") return String(amount);
  if (typeof amount === "object") {
    if (typeof amount.$numberDecimal === "string") return amount.$numberDecimal;
    const s = (amount as any).toString?.();
    if (typeof s === "string" && s !== "[object Object]") return s;
  }
  return "0";
}

export function PublicEventCard({
  event,
  isInvited,
  hasTicket,
  onClick,
}: Props) {
  const isPaid = event.pricing.mode === "paid";
  const isPrivate = event.visibility === "private";

  const PricingIcon = isPaid ? Coins : Ticket;
  const VisibilityIcon = isPrivate ? Lock : Unlock;

  const priceLabel = !isPaid
    ? "Free"
    : (event.pricing.coins ?? [])
        .map((c) => `${coinAmountStr(c.amount)} ${c.assetId}`)
        .join(" + ");

  const dateLabel = formatRange(event.startsAt, event.endsAt, event.timezone);
  const ticketsSold = event.capacity?.ticketsSold ?? 0;
  const maxTickets = event.capacity?.maxTickets ?? 0;
  const seatsLeft = Math.max(0, maxTickets - ticketsSold);
  const isSoldOut = maxTickets > 0 && seatsLeft === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative text-left w-full overflow-hidden rounded-2xl bg-white transition",
        "shadow-sm hover:shadow-xl hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A5]",
        isInvited
          ? "border-2 border-[#0EA5A5] animate-invite-glow"
          : "border border-black/10",
      )}
    >
      {/* Invited / attending ribbon */}
      {isInvited || hasTicket ? (
        <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#0EA5A5] to-[#0c9a9a] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 shadow-lg">
          <Sparkles className="w-3 h-3" />
          {hasTicket ? "You're going" : "Invited"}
        </span>
      ) : null}

      {/* Cover with gradient overlay */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {event.coverImageUrl ? (
          <>
            <img
              src={event.coverImageUrl}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5A5] via-[#1FB8B8] to-[#5BC9C9] flex items-center justify-center">
            <Ticket className="w-12 h-12 text-white/70" />
          </div>
        )}

        {/* Pricing pill — sits on top-right of cover. Caps width and
            truncates with ellipsis so 5 coin types don't overflow. */}
        <span
          className={cn(
            "absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-md max-w-[60%] truncate",
            isPaid
              ? "bg-white text-[#0c7777]"
              : "bg-white text-[#315326]",
          )}
          title={priceLabel}
        >
          <PricingIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{priceLabel}</span>
        </span>

        {/* Title overlay on cover bottom */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4">
          <h3 className="font-bold text-white line-clamp-2 leading-snug text-base drop-shadow-md">
            {event.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        {dateLabel ? (
          <div className="flex items-center gap-1.5 text-xs text-black/70 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#0EA5A5]" />
            <span>{dateLabel}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isPrivate
                ? "bg-[#F2EAD8] text-[#7A5A1A]"
                : "bg-black/5 text-black/70",
            )}
          >
            <VisibilityIcon className="w-3 h-3" />
            {isPrivate ? "Private" : "Public"}
          </span>

          {maxTickets > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium",
                isSoldOut ? "text-red-600" : "text-black/50",
              )}
            >
              <Users className="w-3 h-3" />
              {isSoldOut ? "Sold out" : `${seatsLeft} left`}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
