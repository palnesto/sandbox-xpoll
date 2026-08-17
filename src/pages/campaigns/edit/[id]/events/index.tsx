import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Coins,
  Lock,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { EventCardMenu } from "@/components/campaign/events/EventCardMenu";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { appToast } from "@/utils/toast";
import { pickDataRoot } from "@/types/campaigns";

type EventStatus = "draft" | "published";
type EventVisibility = "public" | "private";
type EventLocationType = "in_person" | "virtual";

type EventCoinAmount = string | number | { $numberDecimal?: string } | null;

type CampaignEventListItem = {
  _id: string;
  name: string;
  status: EventStatus;
  visibility: EventVisibility;
  locationType: EventLocationType;
  startsAt: string;
  endsAt: string;
  pricing: {
    mode: "free" | "paid";
    coins: { assetId: string; amount: EventCoinAmount }[];
  };
  capacity: { maxTickets: number; ticketsSold: number };
};

type CampaignEventListResult = {
  entries: CampaignEventListItem[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

type PendingAction =
  | { kind: "publish"; eventId: string; name: string }
  | { kind: "delete"; eventId: string; name: string }
  | null;

function formatDateRange(startISO: string, endISO: string) {
  try {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const sameDay = s.toDateString() === e.toDateString();
    const dateOpts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
    };
    if (sameDay) {
      return `${s.toLocaleDateString(undefined, dateOpts)} · ${s.toLocaleTimeString(undefined, timeOpts)} – ${e.toLocaleTimeString(undefined, timeOpts)}`;
    }
    return `${s.toLocaleDateString(undefined, dateOpts)} – ${e.toLocaleDateString(undefined, dateOpts)}`;
  } catch {
    return "";
  }
}

function statusPillCls(status: EventStatus) {
  if (status === "published") {
    return "bg-[#E4F2DF] text-[#315326]";
  }
  return "bg-[#F2EAD8] text-[#7A5A1A]";
}

/**
 * Mongo's Decimal128 round-trips through JSON as either a plain string (when
 * lean getters fire) or `{ $numberDecimal: "100" }`. Normalize both shapes
 * to a printable string so cards never render "[object Object]".
 */
function coinAmountStr(amount: EventCoinAmount): string {
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

type CardVariant = {
  /** Left-edge accent bar color */
  accent: string;
  /** Background tint behind the card */
  surface: string;
  /** Top-right pricing pill colors */
  pricingPill: string;
  /** Icon shown next to the price */
  PriceIcon: typeof Coins;
  label: string;
};

function getCardVariant(
  status: EventStatus,
  pricingMode: "free" | "paid",
): CardVariant {
  if (status === "draft" && pricingMode === "free") {
    return {
      accent: "bg-[#E0B973]",
      surface: "bg-[#FFFBF2] border-[#F2EAD8]",
      pricingPill: "bg-[#F2EAD8] text-[#7A5A1A]",
      PriceIcon: Ticket,
      label: "Free draft",
    };
  }
  if (status === "draft" && pricingMode === "paid") {
    return {
      accent: "bg-[#C97E3F]",
      surface: "bg-[#FFF7EF] border-[#F2DBC2]",
      pricingPill: "bg-[#F2DBC2] text-[#7A4A1A]",
      PriceIcon: Coins,
      label: "Paid draft",
    };
  }
  if (status === "published" && pricingMode === "free") {
    return {
      accent: "bg-[#5BA67A]",
      surface: "bg-[#F3FBF4] border-[#D6EEDF]",
      pricingPill: "bg-[#E4F2DF] text-[#315326]",
      PriceIcon: Ticket,
      label: "Free, live",
    };
  }
  return {
    accent: "bg-[#0EA5A5]",
    surface: "bg-[#F1FBFB] border-[#CFEDED]",
    pricingPill: "bg-[#CFEDED] text-[#0c7777]",
    PriceIcon: Coins,
    label: "Paid, live",
  };
}

export default function EditCampaignEventsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");

  const {
    campaignName,
    permissions,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isCampaignLoading,
  } = useCampaignByOwner(campaignId);

  const showUpgradePrompt = !isCampaignLoading && isBasic;
  const showPaymentPrompt =
    !isCampaignLoading && !isBasic && isPaymentRequired;
  const listEnabled =
    !!campaignId && !isCampaignLoading && !showUpgradePrompt && !showPaymentPrompt;

  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published"
  >("all");

  const listRoute = campaignId
    ? endpoints.campaigns.events.listForOwner(
        campaignId,
        statusFilter === "all" ? undefined : statusFilter,
      )
    : "";

  const {
    data: listResp,
    isLoading: isListLoading,
    isError: isListError,
  } = useApiQuery(listRoute, {
    enabled: listEnabled,
    queryKey: [listRoute],
  } as any);

  const listing = useMemo(
    () => pickDataRoot<CampaignEventListResult>(listResp) ?? null,
    [listResp],
  );
  const events: CampaignEventListItem[] = listing?.entries ?? [];

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const canCreate = !!permissions?.campaign?.edit;
  const canEdit = !!permissions?.campaign?.edit;

  const [pending, setPending] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Invalidate every variant of the owner's events list (all / draft / published)
  // so the active tab refreshes regardless of which filter is currently active.
  const invalidateEvents = () => {
    if (!campaignId) return;
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.events.listForOwner(campaignId)],
    });
    queryClient.invalidateQueries({
      queryKey: [
        endpoints.campaigns.events.listForOwner(campaignId, "draft"),
      ],
    });
    queryClient.invalidateQueries({
      queryKey: [
        endpoints.campaigns.events.listForOwner(campaignId, "published"),
      ],
    });
  };

  const { mutate: publishEvent, isPending: publishing } = useApiMutation<
    Record<string, never>,
    any
  >({
    route: pending?.kind === "publish"
      ? endpoints.campaigns.events.publish(campaignId, pending.eventId)
      : "",
    method: "POST",
    onSuccess: () => {
      appToast.success("Event published");
      setPending(null);
      setActionError(null);
      invalidateEvents();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to publish event";
      setActionError(msg);
    },
  });

  const { mutate: deleteEvent, isPending: deleting } = useApiMutation<
    Record<string, never>,
    any
  >({
    route: pending?.kind === "delete"
      ? endpoints.campaigns.events.delete(campaignId, pending.eventId)
      : "",
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Draft event deleted");
      setPending(null);
      setActionError(null);
      invalidateEvents();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to delete event";
      setActionError(msg);
    },
  });

  const busy = publishing || deleting;

  const confirmTitle =
    pending?.kind === "publish"
      ? "Publish event?"
      : pending?.kind === "delete"
        ? "Delete event?"
        : "";
  const confirmDesc =
    pending?.kind === "publish"
      ? `"${pending.name}" will become visible to attendees and start accepting ticket purchases.`
      : pending?.kind === "delete"
        ? `"${pending.name}" will be permanently removed. This cannot be undone.`
        : "";
  const confirmLabel = pending?.kind === "publish" ? "Publish" : "Delete";
  const confirmTone =
    pending?.kind === "publish" ? ("primary" as const) : ("danger" as const);

  const handleConfirm = () => {
    if (!pending) return;
    setActionError(null);
    if (pending.kind === "publish") publishEvent({});
    if (pending.kind === "delete") deleteEvent({});
  };

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab="events"
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => {}}
    >
      {showPaymentPrompt ? (
        <CampaignPaymentRequiredPrompt
          campaignId={campaignId}
          featureName="Events"
          isMainOwner={isMainOwner}
          billingMode={billingMode}
        />
      ) : showUpgradePrompt ? (
        <BasicFeatureUpgradePrompt
          campaignId={campaignId}
          featureName="Events"
          isMainOwner={isMainOwner}
        />
      ) : (
        <div className="p-4 min-h-screen">
          <div className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#111]">
                  Manage Events
                </div>
                <div className="mt-1 text-xs text-black/50">
                  Create draft events, publish them, and manage your event
                  attendees. Up to 5 drafts and 3 published events per campaign.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <PermissionDisabledTooltip hasPermission={canCreate}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/campaigns/edit/${campaignId}/events/create`)
                    }
                    className="rounded-full bg-[#E4F2DF] px-5 py-2.5 text-sm font-semibold text-[#315326] inline-flex items-center gap-2"
                  >
                    + Add Event
                  </button>
                </PermissionDisabledTooltip>
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="mt-5 flex items-center gap-2">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "draft", label: "Drafts" },
                  { key: "published", label: "Published" },
                ] as const
              ).map((tab) => {
                const active = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-semibold border transition",
                      active
                        ? "bg-[#0EA5A5] border-[#0EA5A5] text-white shadow-sm"
                        : "bg-white border-black/10 text-black/70 hover:bg-black/5",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              {isListLoading ? (
                <div className="text-sm text-black/50 py-8 text-center">
                  Loading events...
                </div>
              ) : isListError ? (
                <div className="text-sm text-red-600 py-8 text-center">
                  Failed to load events.
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-black/50 py-12 text-center">
                  {statusFilter === "draft"
                    ? "No draft events."
                    : statusFilter === "published"
                      ? "No published events yet."
                      : "No events yet. Click "}
                  {statusFilter === "all" ? (
                    <>
                      <strong>+ Add Event</strong> to create your first one.
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((ev) => {
                    const isDraft = ev.status === "draft";
                    const hasEnded =
                      !!ev.endsAt && new Date(ev.endsAt).getTime() <= Date.now();
                    const variant = getCardVariant(ev.status, ev.pricing.mode);
                    const priceLabel =
                      ev.pricing.mode === "free"
                        ? "Free"
                        : (ev.pricing.coins ?? [])
                            .map((c) => `${coinAmountStr(c.amount)} ${c.assetId}`)
                            .join(" + ");

                    return (
                      <div
                        key={ev._id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(
                            `/campaigns/edit/${campaignId}/events/edit/${ev._id}`,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(
                              `/campaigns/edit/${campaignId}/events/edit/${ev._id}`,
                            );
                          }
                        }}
                        className={cn(
                          "relative rounded-2xl border p-4 pl-5 transition cursor-pointer hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A5]",
                          variant.surface,
                        )}
                      >
                        {/* Variant accent strip */}
                        <span
                          className={cn(
                            "absolute left-0 top-3 bottom-3 w-1 rounded-full",
                            variant.accent,
                          )}
                          aria-hidden
                        />

                        {/* Title + status + menu */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-[#111] line-clamp-2 flex-1">
                            {ev.name}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5",
                                hasEnded
                                  ? "bg-black/10 text-black/60"
                                  : statusPillCls(ev.status),
                              )}
                            >
                              {hasEnded ? "ended" : ev.status}
                            </span>
                            {isDraft || hasEnded ? (
                              <EventCardMenu
                                eventId={ev._id}
                                disabled={!canEdit}
                                onEdit={
                                  isDraft && !hasEnded
                                    ? () =>
                                        navigate(
                                          `/campaigns/edit/${campaignId}/events/edit/${ev._id}`,
                                        )
                                    : undefined
                                }
                                onPublish={
                                  isDraft && !hasEnded
                                    ? () => {
                                        setActionError(null);
                                        setPending({
                                          kind: "publish",
                                          eventId: ev._id,
                                          name: ev.name,
                                        });
                                      }
                                    : undefined
                                }
                                onDelete={() => {
                                  setActionError(null);
                                  setPending({
                                    kind: "delete",
                                    eventId: ev._id,
                                    name: ev.name,
                                  });
                                }}
                              />
                            ) : null}
                          </div>
                        </div>

                        {/* Variant micro-label */}
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-black/40 font-medium">
                          {variant.label}
                        </div>

                        {/* Date */}
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-black/70">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDateRange(ev.startsAt, ev.endsAt)}</span>
                        </div>

                        {/* Location + visibility */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-black/70">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>
                            {ev.locationType === "in_person"
                              ? "In person"
                              : "Virtual"}
                          </span>
                          {ev.visibility === "private" ? (
                            <>
                              <span className="mx-1 text-black/30">·</span>
                              <Lock className="w-3 h-3" />
                              <span>Private</span>
                            </>
                          ) : null}
                        </div>

                        {/* Capacity */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-black/70">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {ev.capacity.ticketsSold ?? 0} /{" "}
                            {ev.capacity.maxTickets} tickets
                          </span>
                        </div>

                        {/* Pricing pill */}
                        <div className="mt-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                              variant.pricingPill,
                            )}
                          >
                            <variant.PriceIcon className="w-3.5 h-3.5" />
                            {priceLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CampaignActionConfirmModal
        open={!!pending}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={confirmLabel}
        tone={confirmTone}
        loading={busy}
        error={actionError}
        onClose={() => {
          if (busy) return;
          setPending(null);
          setActionError(null);
        }}
        onConfirm={handleConfirm}
      />
    </CampaignLayout>
  );
}
