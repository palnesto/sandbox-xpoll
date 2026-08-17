import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  Sparkles,
  Ticket,
  Users,
  Video,
} from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { cn } from "@/lib/utils";
import { appToast } from "@/utils/toast";
import dayjs from "dayjs";
import "@/utils/time"; // ensures dayjs UTC plugin is extended

type CoinAmount = string | number | { $numberDecimal?: string } | null;

type EventDetail = {
  _id: string;
  name: string;
  description: string;
  coverImageUrl?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  visibility: "public" | "private";
  locationType: "in_person" | "virtual";
  status: "draft" | "published";
  venue?: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  virtualMeeting?: {
    provider: string;
    url: string;
    notes?: string | null;
  } | null;
  pricing: {
    mode: "free" | "paid";
    coins: { assetId: string; amount: CoinAmount }[];
  };
  capacity: { maxTickets: number; ticketsSold: number };
};

type ViewerContext = {
  isOwner: boolean;
  isInvited: boolean;
  hasTicket: boolean;
  canPurchase: boolean;
  canViewLocationDetails: boolean;
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

function formatInTz(iso: string, tz: string) {
  if (!iso) return "";
  // Render in the event's own timezone (the owner picked it) so every
  // viewer sees the same anchor wall-clock time.
  const d = dayjs.utc(iso).tz(tz || "UTC");
  return d.isValid()
    ? `${d.format("ddd, MMM D, YYYY h:mm A")} (${tz || "UTC"})`
    : "";
}

function durationLabel(startISO: string, endISO: string) {
  try {
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return "";
    }
    const minutes = Math.round((end - start) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  } catch {
    return "";
  }
}

export default function PublicEventDetailPage() {
  const navigate = useNavigate();
  const { id, eventId } = useParams();
  const campaignId = String(id ?? "");
  const activeEventId = String(eventId ?? "");

  const detailRoute = activeEventId
    ? endpoints.events.getByIdForViewer(activeEventId)
    : "";

  const {
    data: resp,
    isLoading,
    isError,
    error,
  } = useApiQuery(detailRoute, {
    enabled: !!detailRoute,
    queryKey: [detailRoute],
  } as any);

  const { event, viewer } = useMemo(() => {
    const root: any = resp?.data?.data ?? resp?.data ?? null;
    return {
      event: (root?.event ?? null) as EventDetail | null,
      viewer: (root?.viewerContext ?? null) as ViewerContext | null,
    };
  }, [resp]);

  const [buyConfirmOpen, setBuyConfirmOpen] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [ticketEmail, setTicketEmail] = useState<string>("");

  // Look up the buyer's account email so we can pre-fill the modal input.
  const { data: meResp } = useApiQuery(endpoints.profile.me, {
    queryKey: [endpoints.profile.me],
  } as any);
  const accountEmail = String(
    meResp?.data?.data?.email ?? meResp?.data?.email ?? "",
  ).trim();
  const hasAccountEmail = !!accountEmail;

  // Pre-fill the ticket email with the account email each time the modal opens.
  useEffect(() => {
    if (buyConfirmOpen) {
      setTicketEmail(accountEmail);
      setBuyError(null);
    }
  }, [buyConfirmOpen, accountEmail]);

  const { mutateAsync: buyTicket, isPending: buying } = useApiMutation<
    { attendeeEmail?: string },
    any
  >({
    route: activeEventId ? endpoints.events.buy(activeEventId) : "",
    method: "POST",
  });

  const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const handleBuy = async () => {
    if (!event) return;
    setBuyError(null);

    const trimmed = ticketEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setBuyError("Please enter a valid email address");
      return;
    }

    const body: { attendeeEmail?: string } = { attendeeEmail: trimmed };

    try {
      await buyTicket(body);
      appToast.success("Ticket purchased — check your email for the QR.");
      setBuyConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: [detailRoute] });
      queryClient.invalidateQueries({
        queryKey: [endpoints.events.myTickets],
      });
      queryClient.invalidateQueries({
        queryKey: [endpoints.events.myPurchasedEvents],
      });
      queryClient.invalidateQueries({
        queryKey: [endpoints.events.discover, { campaignId }],
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to purchase ticket";
      setBuyError(msg);
      appToast.error(msg);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading event…</div>;
  }
  if (isError || !event) {
    const msg =
      (error as any)?.response?.data?.message ||
      (error as any)?.message ||
      "Event not found";
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {msg}
        </div>
        <button
          onClick={() =>
            navigate(`/campaigns/all-campaigns/${encodeURIComponent(campaignId)}`)
          }
          className="mt-4 rounded-full bg-gray-100 px-4 py-2 text-sm"
        >
          Back to campaign
        </button>
      </div>
    );
  }

  const isPaid = event.pricing.mode === "paid";
  const isPrivate = event.visibility === "private";
  const ticketsSold = event.capacity.ticketsSold ?? 0;
  const maxTickets = event.capacity.maxTickets ?? 0;
  const seatsLeft = Math.max(0, maxTickets - ticketsSold);
  const fillPct =
    maxTickets > 0
      ? Math.min(100, Math.round((ticketsSold / maxTickets) * 100))
      : 0;
  const isInvited = !!viewer?.isInvited;
  const hasTicket = !!viewer?.hasTicket;
  const canPurchase = !!viewer?.canPurchase;
  const canViewLocation = !!viewer?.canViewLocationDetails;

  const priceLabel = !isPaid
    ? "Free"
    : (event.pricing.coins ?? [])
        .map((c) => `${coinAmountStr(c.amount)} ${c.assetId}`)
        .join(" + ");

  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl p-4">
        {/* Top bar */}
        <header className="flex items-center gap-3 pb-4">
          <button
            onClick={() =>
              navigate(
                `/campaigns/all-campaigns/${encodeURIComponent(campaignId)}`,
              )
            }
            className="px-2 py-2 rounded-xl bg-[#dbdcdf30] hover:bg-black/5"
          >
            <ArrowLeft className="w-4" />
          </button>
          <div className="text-sm text-black/60">Back to campaign</div>
        </header>

        {/* Cover */}
        <div
          className={cn(
            "relative aspect-[16/9] w-full rounded-3xl overflow-hidden border bg-gradient-to-br from-[#E8FBFB] to-[#CFEDED]",
            isInvited ? "border-[#0EA5A5] animate-invite-glow" : "border-black/10",
          )}
        >
          {event.coverImageUrl ? (
            <img
              src={event.coverImageUrl}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#0EA5A5]">
              <Ticket className="w-16 h-16 opacity-50" />
            </div>
          )}

          {isInvited ? (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-[#0EA5A5] text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              Invited
            </span>
          ) : null}
        </div>

        {/* Title & badges */}
        <div className="mt-6 flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-[#111]">{event.name}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isPaid ? "teal" : "green"} icon={isPaid ? Coins : Ticket}>
              {priceLabel}
            </Badge>
            <Badge
              tone={isPrivate ? "amber" : "neutral"}
              icon={isPrivate ? Lock : Globe}
            >
              {isPrivate ? "Private" : "Public"}
            </Badge>
            <Badge
              tone="neutral"
              icon={event.locationType === "virtual" ? Video : MapPin}
            >
              {event.locationType === "in_person" ? "In person" : "Virtual"}
            </Badge>
            {hasTicket ? (
              <Badge tone="green" icon={Ticket}>
                You're attending
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Layout */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-8">
            <Section title="About this event">
              <p className="whitespace-pre-line text-sm leading-7 text-black/80">
                {event.description}
              </p>
            </Section>

            <Section title="When">
              <div className="mb-2 text-[11px] text-black/50">
                Times shown in the event's timezone:{" "}
                <strong>{event.timezone}</strong>.
              </div>
              <Row icon={Calendar} label="Starts">
                {formatInTz(event.startsAt, event.timezone)}
              </Row>
              <Row icon={Calendar} label="Ends">
                {formatInTz(event.endsAt, event.timezone)}
              </Row>
              <Row icon={Clock} label="Duration">
                {durationLabel(event.startsAt, event.endsAt) || "—"}
              </Row>
            </Section>

            <Section title="Where">
              {event.locationType === "in_person" ? (
                event.venue ? (
                  canViewLocation ? (
                    <div className="text-sm text-black/80 leading-7">
                      {event.venue.addressLine1}
                      {event.venue.addressLine2 ? (
                        <>
                          <br />
                          {event.venue.addressLine2}
                        </>
                      ) : null}
                      <br />
                      {event.venue.city}, {event.venue.state}{" "}
                      {event.venue.postalCode}
                      <br />
                      {event.venue.country}
                    </div>
                  ) : (
                    <RedactedNotice>
                      Full address is shared with attendees after they buy a
                      ticket. City: <strong>{event.venue.city}</strong>,{" "}
                      <strong>{event.venue.country}</strong>.
                    </RedactedNotice>
                  )
                ) : (
                  <div className="text-sm text-black/60">Location TBA</div>
                )
              ) : event.virtualMeeting ? (
                canViewLocation ? (
                  <div className="space-y-2 text-sm text-black/80">
                    <Row icon={Video} label="Provider">
                      {prettyProvider(event.virtualMeeting.provider)}
                    </Row>
                    <a
                      href={event.virtualMeeting.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#0EA5A5] font-medium hover:underline"
                    >
                      Join meeting
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {event.virtualMeeting.notes ? (
                      <div className="mt-2 text-xs text-black/60">
                        {event.virtualMeeting.notes}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <RedactedNotice>
                    The meeting link is shared with attendees after they buy a
                    ticket. Provider:{" "}
                    <strong>
                      {prettyProvider(event.virtualMeeting.provider)}
                    </strong>
                    .
                  </RedactedNotice>
                )
              ) : (
                <div className="text-sm text-black/60">Meeting TBA</div>
              )}
            </Section>
          </div>

          {/* Right: purchase panel */}
          <aside className="md:sticky md:top-6 h-fit space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-black/50 font-semibold">
                {isPaid ? "Ticket price" : "Free event"}
              </div>
              <div className="mt-1 text-2xl font-bold text-[#0EA5A5]">
                {priceLabel}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-black/60">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {ticketsSold} / {maxTickets} attending
                  </span>
                  <span>{seatsLeft} left</span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0EA5A5] transition-all"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-5">
                {hasTicket ? (
                  <div className="rounded-xl bg-[#E4F2DF] text-[#315326] px-4 py-3 text-sm font-semibold text-center">
                    You already have a ticket. Check your email for the QR.
                  </div>
                ) : canPurchase ? (
                  <button
                    type="button"
                    onClick={() => setBuyConfirmOpen(true)}
                    className="w-full rounded-full bg-[#0EA5A5] text-white py-3 text-sm font-semibold hover:bg-[#0c9a9a] transition"
                  >
                    {isPaid ? `Buy ticket — ${priceLabel}` : "Get free ticket"}
                  </button>
                ) : isPrivate &&
                  !viewer?.isOwner &&
                  !hasTicket &&
                  seatsLeft > 0 &&
                  event.status === "published" &&
                  !(event.endsAt &&
                    new Date(event.endsAt).getTime() <= Date.now()) ? (
                  // Private event, viewer's account email isn't on the
                  // allowlist — but they may still hold an invitation at a
                  // different email. Let them try with that one.
                  <>
                    <button
                      type="button"
                      onClick={() => setBuyConfirmOpen(true)}
                      className="w-full rounded-full border-2 border-[#0EA5A5] text-[#0EA5A5] py-3 text-sm font-semibold hover:bg-[#E8FBFB] transition"
                    >
                      I have an invitation
                    </button>
                    <p className="mt-2 text-[11px] text-black/55 text-center">
                      Enter the email your invitation was sent to.
                    </p>
                  </>
                ) : (
                  <DisabledReason
                    event={event}
                    viewer={viewer}
                    seatsLeft={seatsLeft}
                  />
                )}
              </div>

              {isInvited && !hasTicket ? (
                <div className="mt-3 rounded-lg bg-[#E8FBFB] border border-[#CFEDED] text-[#0c7777] text-xs px-3 py-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  You're personally invited to this event.
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {/* Buy confirm modal */}
      {buyConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => !buying && setBuyConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#111]">
              {isPaid ? "Confirm ticket purchase" : "Get your free ticket"}
            </h3>

            <p className="mt-2 text-sm text-black/70">
              {isPaid ? (
                <>
                  You'll be charged <strong>{priceLabel}</strong> from your
                  balance.
                </>
              ) : (
                <>We'll reserve a seat for you.</>
              )}{" "}
              {isPrivate ? (
                <>
                  Use the email you got the invitation at — that's the address
                  on the allowlist.
                </>
              ) : (
                <>The QR ticket will be emailed to the address below.</>
              )}
            </p>

            <div className="mt-4 space-y-1">
              <label className="text-xs font-medium text-black/70">
                Ticket email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                autoFocus
                value={ticketEmail}
                onChange={(e) => {
                  setTicketEmail(e.target.value);
                  if (buyError) setBuyError(null);
                }}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              />
              {hasAccountEmail ? (
                <p className="text-[11px] text-black/50">
                  Defaults to your account email. Override if your invitation
                  was sent elsewhere.
                </p>
              ) : (
                <p className="text-[11px] text-black/50">
                  Your account has no email on file — we'll use this address
                  for the QR ticket.
                </p>
              )}
            </div>

            {buyError ? (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">
                {buyError}
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={buying}
                onClick={() => setBuyConfirmOpen(false)}
                className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={buying}
                onClick={handleBuy}
                className={cn(
                  "flex-1 rounded-full py-2.5 text-sm font-semibold text-white",
                  buying
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#0EA5A5] hover:bg-[#0c9a9a]",
                )}
              >
                {buying ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* -------------------- helpers -------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-black/50">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-black/50 shrink-0" />
      <div className="flex flex-col">
        <span className="text-xs text-black/50">{label}</span>
        <span className="text-black/85">{children}</span>
      </div>
    </div>
  );
}

function Badge({
  tone,
  icon: Icon,
  children,
}: {
  tone: "teal" | "green" | "amber" | "neutral";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const styles = {
    teal: "bg-[#CFEDED] text-[#0c7777]",
    green: "bg-[#E4F2DF] text-[#315326]",
    amber: "bg-[#F2EAD8] text-[#7A5A1A]",
    neutral: "bg-black/5 text-black/70",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[tone],
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  );
}

function RedactedNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#FAFAFA] border border-black/10 p-3 text-xs text-black/70">
      <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function DisabledReason({
  event,
  viewer,
  seatsLeft,
}: {
  event: EventDetail;
  viewer: ViewerContext | null;
  seatsLeft: number;
}) {
  let label = "Tickets unavailable";
  let detail: string | null = null;

  if (viewer?.isOwner) {
    label = "You own this event";
    detail = "Owners can't purchase tickets to their own events.";
  } else if (event.status !== "published") {
    label = "Not on sale yet";
    detail = "The organizer hasn't published this event for purchase.";
  } else if (
    event.endsAt &&
    new Date(event.endsAt).getTime() <= Date.now()
  ) {
    label = "Event ended";
    detail = "This event has finished.";
  } else if (seatsLeft <= 0) {
    label = "Sold out";
    detail = "Every seat for this event has been claimed.";
  } else if (event.visibility === "private" && !viewer?.isInvited) {
    label = "Invite-only";
    detail =
      "This is a private event. Only invited emails can purchase a ticket.";
  }

  return (
    <div className="rounded-xl bg-black/5 text-black/60 px-4 py-3 text-sm text-center">
      <div className="font-semibold">{label}</div>
      {detail ? <div className="mt-1 text-xs">{detail}</div> : null}
    </div>
  );
}

function prettyProvider(p: string) {
  if (p === "google_meet") return "Google Meet";
  if (p === "zoom") return "Zoom";
  return "Other";
}
