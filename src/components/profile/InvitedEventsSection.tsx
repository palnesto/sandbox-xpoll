import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Coins,
  Lock,
  Sparkles,
  Ticket,
  Unlock,
} from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import "@/utils/time"; // ensures dayjs UTC plugin is extended

type CoinAmount = string | number | { $numberDecimal?: string } | null;

type DiscoveryEvent = {
  _id: string;
  name: string;
  coverImageUrl?: string | null;
  visibility: "public" | "private";
  startsAt: string;
  timezone?: string;
  endsAt: string;
  campaignId: string;
  pricing: {
    mode: "free" | "paid";
    coins: { assetId: string; amount: CoinAmount }[];
  };
};

type DiscoveryEntry = {
  event: DiscoveryEvent;
  viewerContext: {
    isInvited: boolean;
    hasTicket: boolean;
  };
};

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

function formatRange(startISO: string, endISO: string, tz?: string) {
  if (!startISO || !endISO) return "";
  const zone = tz || "UTC";
  const s = dayjs.utc(startISO).tz(zone);
  const e = dayjs.utc(endISO).tz(zone);
  if (!s.isValid() || !e.isValid()) return "";
  const sameDay = s.format("YYYY-MM-DD") === e.format("YYYY-MM-DD");
  return sameDay
    ? `${s.format("MMM D")} · ${s.format("h:mm A")} – ${e.format("h:mm A")} ${zone}`
    : `${s.format("MMM D")} – ${e.format("MMM D")} ${zone}`;
}

export default function InvitedEventsSection() {
  const navigate = useNavigate();

  // Discover all published events, then keep ones where viewer is invited.
  // (Discover currently filters to events the viewer can SEE — for private
  //  events that's everyone, but isInvited is what we care about here.)
  const eventsRoute = `${endpoints.events.discover}?pageSize=50`;
  const { data: resp, isLoading } = useApiQuery(eventsRoute, {
    queryKey: [endpoints.events.discover, { invitedOnly: true }],
  } as any);

  const invited = useMemo(() => {
    const root: any = resp?.data?.data ?? resp?.data ?? null;
    const entries: DiscoveryEntry[] = Array.isArray(root?.entries)
      ? root.entries
      : [];
    return entries.filter((e) => !!e?.viewerContext?.isInvited);
  }, [resp]);

  if (isLoading) return null;
  if (invited.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0EA5A5]" />
          You're invited
        </h2>
        <span className="text-xs text-black/50">
          {invited.length} event{invited.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {invited.map(({ event, viewerContext }) => (
          <InvitedEventCard
            key={event._id}
            event={event}
            hasTicket={!!viewerContext.hasTicket}
            onClick={() =>
              navigate(
                `/campaigns/all-campaigns/${encodeURIComponent(
                  event.campaignId,
                )}/events/${encodeURIComponent(event._id)}`,
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function InvitedEventCard({
  event,
  hasTicket,
  onClick,
}: {
  event: DiscoveryEvent;
  hasTicket: boolean;
  onClick: () => void;
}) {
  const isPaid = event.pricing.mode === "paid";
  const isPrivate = event.visibility === "private";

  const PriceIcon = isPaid ? Coins : Ticket;
  const VisIcon = isPrivate ? Lock : Unlock;

  const priceLabel = !isPaid
    ? "Free"
    : (event.pricing.coins ?? [])
        .map((c) => `${coinAmountStr(c.amount)} ${c.assetId}`)
        .join(" + ");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative text-left w-full overflow-hidden rounded-2xl border bg-white transition",
        "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A5]",
        // The blinking glow is the whole point of this section
        "border-[#0EA5A5] animate-invite-glow",
      )}
    >
      {/* Top ribbon */}
      <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#0EA5A5] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow">
        <Sparkles className="w-3 h-3" />
        {hasTicket ? "You're going" : "Invited"}
      </span>

      {/* Cover */}
      <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-[#E8FBFB] to-[#CFEDED] overflow-hidden">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#0EA5A5]">
            <Ticket className="w-10 h-10 opacity-50" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="font-semibold text-[#111] line-clamp-1">
          {event.name}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-black/70">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatRange(event.startsAt, event.endsAt, event.timezone)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              isPaid
                ? "bg-[#CFEDED] text-[#0c7777]"
                : "bg-[#E4F2DF] text-[#315326]",
            )}
          >
            <PriceIcon className="w-3.5 h-3.5" />
            {priceLabel}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              isPrivate
                ? "bg-[#F2EAD8] text-[#7A5A1A]"
                : "bg-black/5 text-black/70",
            )}
          >
            <VisIcon className="w-3.5 h-3.5" />
            {isPrivate ? "Private" : "Public"}
          </span>
        </div>
      </div>
    </button>
  );
}
