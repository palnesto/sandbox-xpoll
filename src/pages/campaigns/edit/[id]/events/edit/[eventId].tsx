import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  Ticket,
  Users,
  Video,
} from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { cn } from "@/lib/utils";
import { appToast } from "@/utils/toast";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { NumberField } from "@/components/commons/form/NumberField";
import { EventCoverImageField } from "@/components/campaign/events/EventCoverImageField";
import { CitySelect } from "@/components/commons/selects/city-select";

import {
  EVENT_LOCATION_TYPE,
  EVENT_PRICING_MODE,
  EVENT_VISIBILITY,
  MAX_ALLOWLISTED_EMAILS_PER_EVENT,
  MAX_COINS_PER_EVENT,
  buildUpdateEventPayload,
  coinAmountToNumber,
  eventDocToEditFormValues,
  eventEditFormZ,
  type EventEditFormValues,
  virtualMeetingProviders,
} from "@/schema/event.schemas";

import { useEventEditStore } from "@/stores/event-edit.store";
 
const PERSIST_WRITE_THROTTLE_MS = 400;

export default function EditCampaignEventPage() {
  const navigate = useNavigate();
  const { id, eventId } = useParams();
  const campaignId = String(id ?? "");
  const activeEventId = String(eventId ?? "");

  // ---- Auth: get current user id (used to scope persistence) ----
  const { data: meResp } = useApiQuery(endpoints.profile.me, {
    queryKey: [endpoints.profile.me],
  } as any);
  const userId = String(
    meResp?.data?.data?.id ??
      meResp?.data?.data?._id ??
      meResp?.data?.id ??
      "",
  );

  const {
    campaignName,
    isBasic,
    isPaymentRequired,
    isLoading: isCampaignLoading,
  } = useCampaignByOwner(campaignId);

  // ---- Server fetch: full owner detail ----
  const detailRoute =
    campaignId && activeEventId
      ? endpoints.campaigns.events.getByIdForOwner(campaignId, activeEventId)
      : "";

  const {
    data: detailResp,
    isLoading: isEventLoading,
    isError: isEventError,
    error: eventError,
  } = useApiQuery(detailRoute, {
    enabled:
      !!detailRoute && !isCampaignLoading && !isBasic && !isPaymentRequired,
    queryKey: [detailRoute],
  } as any);

  const serverEvent = useMemo(() => {
    const root = detailResp?.data?.data ?? detailResp?.data ?? null;
    if (!root) return null;
    // owner endpoint returns the event document directly under data
    return root;
  }, [detailResp]);

  const isPublished = serverEvent?.status === "published";

  // ---- Persistence wiring ----
  const {
    draft,
    eventId: persistedEventId,
    isExpired,
    resetForEvent,
    setPatch,
    clear: clearEditStore,
    loadFromLocalStorage,
  } = useEventEditStore();

  // Load persisted draft from localStorage once we have a userId
  useEffect(() => {
    if (!userId) return;
    loadFromLocalStorage(userId);
  }, [userId, loadFromLocalStorage]);

  // ---- React Hook Form ----
  const form = useForm<EventEditFormValues>({
    mode: "onChange",
    resolver: zodResolver(eventEditFormZ),
    defaultValues: undefined,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isValid, isSubmitting, isDirty, errors, submitCount },
  } = form;

  // Track whether we've hydrated the form with initial values yet
  const [initDone, setInitDone] = useState(false);

  /**
   * Initialize the form:
   *  - If there's a non-expired persisted draft for THIS event, use it.
   *  - Otherwise, use the server doc.
   */
  useEffect(() => {
    if (initDone) return;
    if (!serverEvent) return;
    if (!userId) return;

    const persistedForThisEvent =
      !!draft && persistedEventId === activeEventId && !isExpired();

    const initialValues = persistedForThisEvent
      ? ({
          // Merge: server fields first, then persisted overrides
          ...eventDocToEditFormValues(serverEvent),
          ...(draft as Partial<EventEditFormValues>),
        } as EventEditFormValues)
      : eventDocToEditFormValues(serverEvent);

    reset(initialValues);

    if (!persistedForThisEvent) {
      // Seed the store with the server snapshot so subsequent edits get tracked
      resetForEvent(userId, activeEventId, initialValues);
    }
    setInitDone(true);
  }, [
    initDone,
    serverEvent,
    userId,
    draft,
    persistedEventId,
    activeEventId,
    reset,
    resetForEvent,
    isExpired,
  ]);

  /**
   * Mirror form values to the zustand store (which persists to localStorage)
   * with light throttling so we don't thrash localStorage on every keystroke.
   */
  const throttleRef = useRef(0);
  useEffect(() => {
    if (!initDone || !userId) return;
    const sub = watch((values) => {
      const now = Date.now();
      if (now - throttleRef.current < PERSIST_WRITE_THROTTLE_MS) return;
      throttleRef.current = now;
      setPatch(userId, values as Partial<EventEditFormValues>);
    });
    return () => sub.unsubscribe();
  }, [initDone, userId, watch, setPatch]);

  // ---- Conditional field scaffolding (mirrors create page) ----
  const locationType = watch("locationType");
  const pricingMode = watch("pricingMode");
  const visibility = watch("visibility");

  useEffect(() => {
    if (!initDone) return;
    if (locationType === EVENT_LOCATION_TYPE.IN_PERSON) {
      if (form.getValues("virtualMeeting") !== undefined)
        setValue("virtualMeeting", undefined);
      if (!form.getValues("venue")) {
        setValue("venue", {
          addressLine1: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
        } as any);
      }
    } else {
      if (form.getValues("venue") !== undefined) setValue("venue", undefined);
      if (!form.getValues("virtualMeeting")) {
        setValue("virtualMeeting", { provider: "google_meet", url: "" } as any);
      }
    }
  }, [locationType, initDone, setValue, form]);

  const coinsArray = useFieldArray({ control, name: "coins" });

  useEffect(() => {
    if (!initDone) return;
    if (
      pricingMode === EVENT_PRICING_MODE.FREE &&
      coinsArray.fields.length > 0
    ) {
      setValue("coins", []);
      return;
    }
    if (pricingMode === EVENT_PRICING_MODE.PAID) {
      const existing = (form.getValues("coins") as any[] | undefined) ?? [];
      const firstAmount =
        existing[0]?.amount !== undefined && existing[0]?.amount !== null
          ? Number(existing[0].amount)
          : 100;
      const needsReplace =
        existing.length !== 1 ||
        existing[0]?.assetId !== "xPoll" ||
        existing[0]?.amount !== firstAmount;
      if (needsReplace) {
        setValue(
          "coins" as any,
          [{ assetId: "xPoll", amount: firstAmount }] as any,
          { shouldDirty: false, shouldValidate: true },
        );
      }
    }
  }, [pricingMode, initDone, coinsArray, setValue, form]);

  // ---- PATCH mutation ----
  const { mutateAsync: updateEvent } = useApiMutation<any, any>({
    route: endpoints.campaigns.events.update(campaignId, activeEventId),
    method: "PATCH",
  });

  const onSubmit = async (data: EventEditFormValues) => {
    try {
      const body = buildUpdateEventPayload(data);
      await updateEvent(body);
      clearEditStore(userId);
      appToast.success("Event updated");
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.events.listForOwner(campaignId)],
      });
      queryClient.invalidateQueries({
        queryKey: [
          endpoints.campaigns.events.getByIdForOwner(campaignId, activeEventId),
        ],
      });
      navigate(`/campaigns/edit/${campaignId}/events`);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to update event";
      appToast.error(msg);
    }
  };

  const handleDiscard = () => {
    if (!userId) return;
    if (!serverEvent) return;
    const fresh = eventDocToEditFormValues(serverEvent);
    reset(fresh);
    resetForEvent(userId, activeEventId, fresh);
    appToast.success("Discarded unsaved changes");
  };

  // ---- Loading / error / blocked states ----
  if (isCampaignLoading || isEventLoading) {
    return <div className="p-8">Loading event…</div>;
  }
  if (isEventError) {
    const msg =
      (eventError as any)?.response?.data?.message ||
      (eventError as any)?.message ||
      "Event not found";
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {msg}
        </div>
        <button
          onClick={() => navigate(`/campaigns/edit/${campaignId}/events`)}
          className="mt-4 rounded-full bg-gray-100 px-4 py-2 text-sm"
        >
          Back to events
        </button>
      </div>
    );
  }
  if (isPublished) {
    return (
      <PublishedEventReadonlyView
        campaignId={campaignId}
        campaignName={campaignName}
        event={serverEvent}
        onBack={() => navigate(`/campaigns/edit/${campaignId}/events`)}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-3xl p-4 font-poppins">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-black/10 pb-4">
          <button
            onClick={() => navigate(`/campaigns/edit/${campaignId}/events`)}
            className="px-2 py-2 rounded-xl bg-[#dbdcdf30] hover:bg-black/5"
          >
            <ArrowLeft className="w-4" />
          </button>
          <div>
            <div className="text-lg font-bold">Edit Event</div>
            <div className="text-xs text-black/50 line-clamp-1">
              {campaignName ? `Campaign: ${campaignName}` : ""}
            </div>
          </div>
          {isDirty ? (
            <span className="ml-auto text-[10px] uppercase font-semibold tracking-wide text-[#7A5A1A] bg-[#F2EAD8] rounded-full px-2.5 py-1">
              Unsaved changes
            </span>
          ) : null}
        </header>

        {/* Read-only schedule notice */}
        <div className="mt-4 rounded-xl border border-black/10 bg-[#FAFAFA] p-3 text-xs text-black/70 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          Start and end times are locked once an event is created.{" "}
          {serverEvent
            ? `Currently scheduled ${new Date(serverEvent.startsAt).toLocaleString()} → ${new Date(serverEvent.endsAt).toLocaleString()}.`
            : null}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-8"
          noValidate
        >
          {/* -------- Basics -------- */}
          <section className="space-y-5">
            <SectionHeader title="Basics" />

            <TextField<EventEditFormValues>
              form={form}
              schema={eventEditFormZ as any}
              name="name"
              label="Event name"
              placeholder="e.g. Web3 Builder Meetup"
              showCounter
              showError
            />

            <TextAreaField<EventEditFormValues>
              form={form}
              schema={eventEditFormZ as any}
              name="description"
              label="Description"
              rows={5}
              showCounter
              showError
            />

            <Controller
              control={control}
              name="coverImageUrl"
              render={({ field }) => (
                <EventCoverImageField
                  value={field.value ?? null}
                  onChange={(url) => {
                    setValue(
                      "coverImageUrl",
                      (url ?? "") as any,
                      { shouldDirty: true, shouldValidate: true },
                    );
                  }}
                />
              )}
            />

            {/* timezone is auto-detected from the browser; no UI needed */}
          </section>

          {/* -------- Location -------- */}
          <section className="space-y-5">
            <SectionHeader title="Location" />

            <RadioRow
              label="Location type"
              value={locationType ?? "in_person"}
              onChange={(v) =>
                setValue("locationType", v as any, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              options={[
                { value: EVENT_LOCATION_TYPE.IN_PERSON, label: "In person" },
                { value: EVENT_LOCATION_TYPE.VIRTUAL, label: "Virtual" },
              ]}
            />

            {locationType === EVENT_LOCATION_TYPE.IN_PERSON ? (
              <div className="space-y-4 rounded-2xl border border-black/10 p-4">
                <NestedTextField
                  form={form}
                  name="venue.addressLine1"
                  label="Address line 1"
                  required
                />
                <NestedTextField
                  form={form}
                  name="venue.addressLine2"
                  label="Address line 2 (optional)"
                />
                <NestedSelectField
                  label="City"
                  required
                  error={getNestedErrorMessage(
                    form.formState.errors,
                    "venue.city",
                  )}
                  current={
                    [
                      form.getValues("venue.city" as any),
                      form.getValues("venue.state" as any),
                      form.getValues("venue.country" as any),
                    ]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                >
                  <CitySelect
                    placeholder="Search city..."
                    onChange={(opt) => {
                      if (!opt?.data) return;
                      form.setValue("venue.city" as any, opt.data.name, {
                        shouldDirty: true,
                      });
                      form.setValue(
                        "venue.state" as any,
                        opt.data.state?.name ?? "",
                        { shouldDirty: true },
                      );
                      form.setValue(
                        "venue.country" as any,
                        opt.data.country?.name ?? "",
                        { shouldDirty: true },
                      );
                      form.trigger([
                        "venue.city" as any,
                        "venue.state" as any,
                        "venue.country" as any,
                      ]);
                    }}
                  />
                </NestedSelectField>

                <NestedTextField
                  form={form}
                  name="venue.postalCode"
                  label="Postal code"
                  required
                />
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-black/10 p-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Meeting provider
                    <span className="ml-1 text-red-600">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="virtualMeeting.provider"
                    render={({ field }) => (
                      <select
                        value={(field.value as string) ?? "google_meet"}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                      >
                        {virtualMeetingProviders.map((p) => (
                          <option key={p} value={p}>
                            {p === "google_meet"
                              ? "Google Meet"
                              : p === "zoom"
                                ? "Zoom"
                                : "Other"}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                <NestedTextField
                  form={form}
                  name="virtualMeeting.url"
                  label="Meeting URL"
                  placeholder="https://meet.google.com/…"
                  required
                />
                <NestedTextField
                  form={form}
                  name="virtualMeeting.notes"
                  label="Notes (optional)"
                />
              </div>
            )}
          </section>

          {/* -------- Visibility -------- */}
          <section className="space-y-5">
            <SectionHeader title="Visibility" />

            <RadioRow
              label="Who can purchase?"
              value={visibility ?? "public"}
              onChange={(v) =>
                setValue("visibility", v as any, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              options={[
                { value: EVENT_VISIBILITY.PUBLIC, label: "Public — anyone" },
                {
                  value: EVENT_VISIBILITY.PRIVATE,
                  label: "Private — invited emails only",
                },
              ]}
            />

            {visibility === EVENT_VISIBILITY.PRIVATE ? (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Allowlisted emails
                </label>
                <Controller
                  control={control}
                  name="allowlistEmailsRaw"
                  render={({ field }) => (
                    <textarea
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      rows={4}
                      placeholder="alice@example.com, bob@example.com"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  )}
                />
                <div className="text-xs text-gray-500">
                  Comma- or newline-separated. Max {MAX_ALLOWLISTED_EMAILS_PER_EVENT} emails. Required at publish time.
                </div>
              </div>
            ) : null}
          </section>

          {/* -------- Pricing -------- */}
          <section className="space-y-5">
            <SectionHeader title="Pricing" />

            <RadioRow
              label="Pricing mode"
              value={pricingMode ?? "free"}
              onChange={(v) =>
                setValue("pricingMode", v as any, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              options={[
                { value: EVENT_PRICING_MODE.FREE, label: "Free" },
                { value: EVENT_PRICING_MODE.PAID, label: "Paid (coins)" },
              ]}
            />

            {pricingMode === EVENT_PRICING_MODE.PAID ? (
              <div className="rounded-2xl border border-black/10 p-4 space-y-1">
                <label className="text-sm font-medium">
                  Ticket price (in xPoll)
                </label>
                <Controller
                  control={control}
                  name={`coins.0.amount` as const}
                  render={({ field: f }) => (
                    <input
                      inputMode="numeric"
                      value={(f.value as number | undefined) ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!/^\d*$/.test(raw)) return;
                        f.onChange(raw === "" ? undefined : Number(raw));
                      }}
                      placeholder="0"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  )}
                />
                <p className="text-[11px] text-gray-500">
                  All paid events use xPoll for now.
                </p>
              </div>
            ) : null}
          </section>

          {/* -------- Capacity -------- */}
          <section className="space-y-5">
            <SectionHeader title="Capacity" />

            <NumberField<EventEditFormValues>
              form={form}
              schema={eventEditFormZ as any}
              name="maxTickets"
              label="Max tickets"
              decimalScale={0}
              helperText={
                serverEvent
                  ? `${serverEvent.capacity?.ticketsSold ?? 0} ticket${(serverEvent.capacity?.ticketsSold ?? 0) === 1 ? "" : "s"} already sold — can't reduce below this.`
                  : undefined
              }
              showError
            />
          </section>

          {/* -------- Error summary (after submit attempt only) -------- */}
          {submitCount > 0 ? <EditFormErrorSummary errors={errors} /> : null}

          {/* -------- Footer / actions -------- */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!isDirty || isSubmitting}
              className={cn(
                "flex-1 rounded-full py-3 text-sm font-semibold transition border",
                isDirty && !isSubmitting
                  ? "border-black/10 text-[#222] hover:bg-black/5"
                  : "border-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              Discard changes
            </button>
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className={cn(
                "flex-1 rounded-full py-3 text-sm font-semibold text-white transition",
                isDirty && !isSubmitting
                  ? "bg-[#0EA5A5] hover:bg-[#0c9a9a]"
                  : "bg-gray-300 cursor-not-allowed",
              )}
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- helpers (same as create page) -------------------- */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-black/10 pb-2">
      <h3 className="text-sm font-semibold tracking-wide text-[#222]">
        {title}
      </h3>
    </div>
  );
}

function NestedTextField({
  form,
  name,
  label,
  placeholder,
  required,
}: {
  form: ReturnType<typeof useForm<EventEditFormValues>>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  const err = getNestedErrorMessage(form.formState.errors, name);
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
      <Controller
        control={form.control}
        name={name as any}
        render={({ field }) => (
          <input
            value={(field.value as string) ?? ""}
            placeholder={placeholder}
            onChange={(e) => field.onChange(e.target.value)}
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2",
              err
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-200 focus:ring-gray-200",
            )}
          />
        )}
      />
      {err ? <div className="text-xs text-red-600">{err}</div> : null}
    </div>
  );
}

function EditFormErrorSummary({ errors }: { errors: any }) {
  const messages: string[] = [];
  const walk = (obj: any, path: string[] = []) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (!v) continue;
      const next = [...path, key];
      if (typeof v === "object" && "message" in v && v.message) {
        messages.push(`${next.join(".")} — ${v.message}`);
      } else if (typeof v === "object") {
        walk(v, next);
      }
    }
  };
  walk(errors);
  if (messages.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <div className="font-semibold mb-1">Fix the following before saving:</div>
      <ul className="list-disc pl-5 space-y-0.5">
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function NestedSelectField({
  label,
  required,
  error,
  current,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  current?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
      {children}
      {current ? (
        <div className="text-[11px] text-black/55">Selected: {current}</div>
      ) : null}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function getNestedErrorMessage(errors: any, path: string): string | undefined {
  const parts = path.split(".");
  let cur: any = errors;
  for (const p of parts) {
    if (!cur) return undefined;
    cur = cur[p];
  }
  return cur?.message as string | undefined;
}

/* -------------------- read-only view for PUBLISHED events -------------------- */

function formatInTz(iso: string, tz?: string) {
  const zone = tz || "UTC";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: zone,
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function durationLabel(startISO: string, endISO: string) {
  try {
    const s = new Date(startISO).getTime();
    const e = new Date(endISO).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return "";
    const minutes = Math.round((e - s) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  } catch {
    return "";
  }
}

function prettyProvider(p: string) {
  if (p === "google_meet") return "Google Meet";
  if (p === "zoom") return "Zoom";
  return "Other";
}

function PublishedEventReadonlyView({
  campaignId,
  campaignName,
  event,
  onBack,
}: {
  campaignId: string;
  campaignName?: string;
  event: any;
  onBack: () => void;
}) {
  const isPaid = event?.pricing?.mode === "paid";
  const isPrivate = event?.visibility === "private";
  const ticketsSold = event?.capacity?.ticketsSold ?? 0;
  const maxTickets = event?.capacity?.maxTickets ?? 0;
  const seatsLeft = Math.max(0, maxTickets - ticketsSold);
  const fillPct =
    maxTickets > 0
      ? Math.min(100, Math.round((ticketsSold / maxTickets) * 100))
      : 0;

  const priceLabel = !isPaid
    ? "Free"
    : (event?.pricing?.coins ?? [])
        .map(
          (c: any) =>
            `${coinAmountToNumber(c.amount).toLocaleString()} ${c.assetId}`,
        )
        .join(" + ");

  const allowlistEmails: string[] = Array.isArray(event?.allowlist?.emails)
    ? event.allowlist.emails
    : [];

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Hero with cover image as background */}
      <div className="relative w-full">
        <div className="relative h-56 md:h-96 w-full overflow-hidden bg-gradient-to-br from-[#0EA5A5] via-[#0c9a9a] to-[#0a8585]">
          {event?.coverImageUrl ? (
            <img
              src={event.coverImageUrl}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />

          {/* Top bar */}
          <div className="relative z-10 mx-auto max-w-4xl px-4 pt-4 flex items-center justify-between">
            <button
              onClick={onBack}
              className="rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white px-3 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F2DF] text-[#315326] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow">
              <CheckCircle2 className="w-3 h-3" />
              Published
            </span>
          </div>

          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-8">
            <div className="mx-auto max-w-4xl">
              {campaignName ? (
                <div className="text-xs uppercase tracking-wider text-white/90 font-bold">
                  {campaignName}
                </div>
              ) : null}
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                {event?.name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-2 md:px-4 -mt-8 relative z-20">
        {/* Floating badges card */}
        <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-4 flex flex-wrap items-center gap-2">
          <ReadBadge tone={isPaid ? "teal" : "green"} icon={isPaid ? Coins : Ticket}>
            {priceLabel}
          </ReadBadge>
          <ReadBadge
            tone={isPrivate ? "amber" : "neutral"}
            icon={isPrivate ? Lock : Globe}
          >
            {isPrivate ? "Private" : "Public"}
          </ReadBadge>
          <ReadBadge
            tone="neutral"
            icon={event?.locationType === "virtual" ? Video : MapPin}
          >
            {event?.locationType === "in_person" ? "In person" : "Virtual"}
          </ReadBadge>
          <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-[9px] md:text-xs font-medium">
            <Lock className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" />
            Locked
          </div>
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 pb-12">
          {/* Main column */}
          <div className="space-y-4">
            <ReadCard title="About">
              <p className="whitespace-pre-line text-sm leading-7 text-black/80">
                {event?.description || "—"}
              </p>
            </ReadCard>

            <ReadCard title="Location">
              {event?.locationType === "in_person" ? (
                event?.venue ? (
                  <div className="text-sm text-black/80 leading-7">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-[#0EA5A5] shrink-0" />
                      <div>
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
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-black/60">—</div>
                )
              ) : event?.virtualMeeting ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-[#0EA5A5]" />
                    <span className="font-medium">
                      {prettyProvider(event.virtualMeeting.provider)}
                    </span>
                  </div>
                  <a
                    href={event.virtualMeeting.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#0EA5A5] font-medium hover:underline break-all text-sm"
                  >
                    {event.virtualMeeting.url}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  {event.virtualMeeting.notes ? (
                    <div className="rounded-lg bg-[#FAFAFA] border border-black/5 p-3 text-xs text-black/60">
                      {event.virtualMeeting.notes}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-black/60">—</div>
              )}
            </ReadCard>

            {isPrivate ? (
              <ReadCard title="Allowlisted emails">
                {allowlistEmails.length === 0 ? (
                  <div className="text-sm text-black/60">No emails listed.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allowlistEmails.map((e) => (
                      <span
                        key={e}
                        className="inline-flex items-center rounded-full bg-[#F2EAD8] text-[#7A5A1A] px-2.5 py-1 text-xs font-medium"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </ReadCard>
            ) : null}

            <AttendeesPanel
              campaignId={campaignId}
              eventId={String(event?._id ?? "")}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 md:sticky md:top-4 h-fit">
            <ReadCard title="Schedule">
              <div className="mb-2 text-[10px] text-black/50">
                Times shown in event's timezone:{" "}
                <strong>{event?.timezone || "UTC"}</strong>.
              </div>
              <div className="space-y-2.5">
                <SidebarLine icon={Calendar} label="Starts">
                  {formatInTz(event?.startsAt, event?.timezone)}
                </SidebarLine>
                <SidebarLine icon={Calendar} label="Ends">
                  {formatInTz(event?.endsAt, event?.timezone)}
                </SidebarLine>
                <SidebarLine icon={Clock} label="Duration">
                  {durationLabel(event?.startsAt, event?.endsAt) || "—"}
                </SidebarLine>
              </div>
            </ReadCard>

            <ReadCard title="Capacity">
              <div className="flex items-center justify-between text-sm text-black/70">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {ticketsSold} / {maxTickets} sold
                </span>
                <span className="text-xs">{seatsLeft} left</span>
              </div>
              <div className="mt-2 h-2 w-full bg-black/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0EA5A5] to-[#5BC9C9] transition-all"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-black/50">
                {fillPct}% capacity filled
              </div>
            </ReadCard>

            <ReadCard title="Pricing">
              {isPaid ? (
                <div className="space-y-1.5">
                  {(event?.pricing?.coins ?? []).map((c: any, i: number) => (
                    <div
                      key={`${c.assetId}-${i}`}
                      className="flex items-center justify-between rounded-xl bg-[#FAFAFA] border border-black/5 px-3 py-2 text-sm"
                    >
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Coins className="w-3.5 h-3.5 text-[#0c7777]" />
                        {c.assetId}
                      </span>
                      <span className="text-[#0c7777] font-bold">
                        {coinAmountToNumber(c.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-[#E4F2DF] text-[#315326] text-sm font-semibold text-center px-3 py-3 inline-flex items-center gap-1.5 justify-center w-full">
                  <Ticket className="w-4 h-4" />
                  Free event
                </div>
              )}
            </ReadCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReadCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 mb-3">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function SidebarLine({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-[#0EA5A5] shrink-0" />
      <div className="flex flex-col">
        <span className="text-[11px] text-black/45 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-black/85">{children}</span>
      </div>
    </div>
  );
}

function AttendeesPanel({
  campaignId,
  eventId,
}: {
  campaignId: string;
  eventId: string;
}) {
  const route = campaignId && eventId
    ? endpoints.campaigns.events.attendees(campaignId, eventId)
    : "";
  const { data: resp, isLoading, isError } = useApiQuery(route, {
    enabled: !!route,
    queryKey: [route],
  } as any);

  type Attendee = {
    ticketId: string;
    email: string | null;
    name: string | null;
    paidCoins: { assetId: string; amount: string }[];
    issuedAt: string;
  };

  const root: any = resp?.data?.data ?? resp?.data ?? null;
  const entries: Attendee[] = Array.isArray(root?.entries) ? root.entries : [];
  const total: number = root?.meta?.total ?? entries.length;
  const ticketsSold: number = root?.meta?.capacity?.ticketsSold ?? 0;
  const maxTickets: number = root?.meta?.capacity?.maxTickets ?? 0;

  return (
    <ReadCard title={`Attendees${total ? ` · ${total}` : ""}`}>
      {isLoading ? (
        <div className="text-sm text-black/50 py-3 text-center">
          Loading attendees…
        </div>
      ) : isError ? (
        <div className="text-sm text-red-600 py-3 text-center">
          Failed to load attendees.
        </div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-black/60">
          No one has bought a ticket yet.
        </div>
      ) : (
        <>
          <div className="mb-3 text-xs text-black/55">
            {ticketsSold} / {maxTickets} tickets sold
          </div>
          <ul className="divide-y divide-black/5 rounded-xl border border-black/5">
            {entries.map((a) => (
              <li
                key={a.ticketId}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#222] truncate">
                    {a.name || "—"}
                  </div>
                  <div className="text-xs text-black/55 truncate">
                    {a.email || "no email"}
                  </div>
                </div>
                <div className="text-[11px] text-black/50 shrink-0 text-right">
                  {a.paidCoins.length === 0 ? (
                    <span className="inline-flex items-center rounded-full bg-[#E4F2DF] text-[#315326] px-2 py-0.5 font-semibold">
                      Free
                    </span>
                  ) : (
                    a.paidCoins
                      .map((c) => `${c.amount} ${c.assetId}`)
                      .join(" + ")
                  )}
                  <div className="mt-0.5">
                    {a.issuedAt
                      ? new Date(a.issuedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </ReadCard>
  );
}

function ReadBadge({
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] md:text-xs font-semibold",
        styles[tone],
      )}
    >
      <Icon className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" />
      {children}
    </span>
  );
}

function RadioRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition",
                active
                  ? "border-[#0EA5A5] bg-[#E8FBFB] text-[#0EA5A5] font-semibold"
                  : "border-gray-200 text-gray-700 hover:bg-black/5",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
