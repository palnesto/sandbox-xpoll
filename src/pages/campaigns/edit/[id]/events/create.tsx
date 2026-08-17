import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { cn } from "@/lib/utils";
import { appToast } from "@/utils/toast";
import { useEventCreateStore } from "@/stores/event-create.store";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { NumberField } from "@/components/commons/form/NumberField";
import { EventCoverImageField } from "@/components/campaign/events/EventCoverImageField";
import { DateTimePopover } from "@/components/campaign/events/DateTimePopover";
import { CitySelect } from "@/components/commons/selects/city-select";

import {
  EVENT_LOCATION_TYPE,
  EVENT_PRICING_MODE,
  EVENT_VISIBILITY,
  MAX_ALLOWLISTED_EMAILS_PER_EVENT,
  buildCreateEventPayload,
  eventCreateFormZ,
  type EventCreateFormValues,
  virtualMeetingProviders,
} from "@/schema/event.schemas";

export default function CreateCampaignEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");

  const { campaignName, isLoading: isCampaignLoading } =
    useCampaignByOwner(campaignId);

  const defaultTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);
 
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
    draft: persistedDraft,
    campaignId: persistedCampaignId,
    isExpired,
    setPatch,
    clear: clearCreateStore,
    loadFromLocalStorage,
  } = useEventCreateStore();
 
  useEffect(() => {
    if (!userId) return;
    loadFromLocalStorage(userId);
  }, [userId, loadFromLocalStorage]);

  const blankDefaults: EventCreateFormValues = useMemo(
    () =>
      ({
        name: "",
        description: "",
        coverImageUrl: "",
        startsAt: "",
        endsAt: "",
        timezone: defaultTimezone,
        visibility: EVENT_VISIBILITY.PUBLIC,
        locationType: EVENT_LOCATION_TYPE.IN_PERSON,
        venue: undefined,
        virtualMeeting: undefined,
        pricingMode: EVENT_PRICING_MODE.FREE,
        coins: [],
        maxTickets: 10,
        allowlistEmailsRaw: undefined,
      }) as EventCreateFormValues,
    [defaultTimezone],
  );

  const form = useForm<EventCreateFormValues>({
    mode: "onChange",
    resolver: zodResolver(eventCreateFormZ),
    defaultValues: blankDefaults,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { isSubmitting, errors, submitCount },
  } = form;
 
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydrated) return;
    if (!userId) return;
    const matches =
      persistedDraft &&
      persistedCampaignId === campaignId &&
      !isExpired();
    if (matches) {
      reset({ ...blankDefaults, ...(persistedDraft as object) } as EventCreateFormValues);
    }
    setHydrated(true); 
    setTimeout(() => trigger(), 0); 
  }, [
    userId,
    persistedDraft,
    persistedCampaignId,
    campaignId,
    hydrated,
    blankDefaults,
  ]);
 
  const throttleRef = useRef(0);
  useEffect(() => {
    if (!hydrated || !userId || !campaignId) return;
    const sub = watch((values) => {
      const now = Date.now();
      if (now - throttleRef.current < 400) return;
      throttleRef.current = now;
      setPatch(userId, campaignId, values as Partial<EventCreateFormValues>);
    });
    return () => sub.unsubscribe();
  }, [hydrated, userId, campaignId, watch, setPatch]);

  const locationType = watch("locationType");
  const pricingMode = watch("pricingMode");
  const visibility = watch("visibility");
 
  const prevLocationTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!hydrated) return;
    if (prevLocationTypeRef.current === locationType) return;
    prevLocationTypeRef.current = locationType;

    if (locationType === EVENT_LOCATION_TYPE.IN_PERSON) { 
      const v = form.getValues("venue") as any;
      if (!v || !v.addressLine1) {
        setValue("venue", {
          addressLine1: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
        } as any);
      }
    } else if (locationType === EVENT_LOCATION_TYPE.VIRTUAL) {
      const m = form.getValues("virtualMeeting") as any;
      if (!m || !m.url) {
        setValue("virtualMeeting", {
          provider: "google_meet",
          url: "",
        } as any);
      }
    }
  }, [locationType, hydrated, setValue, form]);

  const coinsArray = useFieldArray({ control, name: "coins" });
 
  useEffect(() => {
    if (pricingMode === EVENT_PRICING_MODE.FREE && coinsArray.fields.length > 0) {
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
  }, [pricingMode, coinsArray, setValue, form]);

  const { mutateAsync: createEvent } = useApiMutation<any, any>({
    route: endpoints.campaigns.events.create(campaignId),
    method: "POST",
  });

  const onSubmit = async (data: EventCreateFormValues) => {
    try {
      const body = buildCreateEventPayload(data);
      await createEvent(body); 
      if (userId) clearCreateStore(userId);
      appToast.success("Draft event created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.events.listForOwner(campaignId)],
      });
      queryClient.invalidateQueries({
        queryKey: [
          endpoints.campaigns.events.listForOwner(campaignId, "draft"),
        ],
      });
      navigate(`/campaigns/edit/${campaignId}/events`);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to create event";
      appToast.error(msg);
    }
  };

  if (isCampaignLoading) {
    return <div className="p-8">Loading campaign…</div>;
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
            <div className="text-lg font-bold">Create Event</div>
            <div className="text-xs text-black/50 line-clamp-1">
              {campaignName ? `Campaign: ${campaignName}` : ""}
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-8"
          noValidate
        >
          {/* -------- Basics -------- */}
          <section className="space-y-5">
            <SectionHeader title="Basics" />

            <TextField<EventCreateFormValues>
              form={form}
              schema={eventCreateFormZ as any}
              name="name"
              label="Event name"
              placeholder="e.g. Web3 Builder Meetup"
              showCounter
              showError
            />

            <TextAreaField<EventCreateFormValues>
              form={form}
              schema={eventCreateFormZ as any}
              name="description"
              label="Description"
              placeholder="Tell attendees what to expect…"
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
          </section>

          {/* -------- Schedule -------- */}
          <section className="space-y-5">
            <SectionHeader title="Schedule" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateTimeField form={form} name="startsAt" label="Starts at" />
              <DateTimeField form={form} name="endsAt" label="Ends at" />
            </div>
            {/* timezone is auto-detected from the browser; no UI needed */}
          </section>

          {/* -------- Location -------- */}
          <section className="space-y-5">
            <SectionHeader title="Location" />

            <RadioRow
              label="Location type"
              value={locationType}
              onChange={(v) =>
                setValue("locationType", v as any, { shouldValidate: true })
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
                  placeholder="123 Main St"
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
                  error={getNestedErrorMessage(form.formState.errors, "venue.city")}
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
                      // Picking a city auto-populates state + country behind
                      // the scenes; we don't show them as separate inputs.
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
              value={visibility}
              onChange={(v) =>
                setValue("visibility", v as any, { shouldValidate: true })
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
              value={pricingMode}
              onChange={(v) =>
                setValue("pricingMode", v as any, { shouldValidate: true })
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

            <NumberField<EventCreateFormValues>
              form={form}
              schema={eventCreateFormZ as any}
              name="maxTickets"
              label="Max tickets"
              placeholder="10"
              decimalScale={0}
              helperText="The total seats available for this event."
              showError
            />
          </section>

          {/* -------- Errors summary (only after a submit attempt) -------- */}
          {submitCount > 0 ? <FormErrorSummary errors={errors} /> : null}

          {/* -------- Submit -------- */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-full py-3 text-sm font-semibold text-white transition",
                isSubmitting
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#0EA5A5] hover:bg-[#0c9a9a]",
              )}
            >
              {isSubmitting ? "Saving draft…" : "Save as draft"}
            </button>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Drafts can be edited and then published from the events list.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- helpers -------------------- */

/**
 * Walks the RHF errors object and renders a flat list of field-level
 * messages so the user can see exactly why Save is blocked.
 */
function FormErrorSummary({ errors }: { errors: any }) {
  const messages = useMemo(() => collectErrorMessages(errors), [errors]);
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

function collectErrorMessages(errors: any, path: string[] = []): string[] {
  if (!errors || typeof errors !== "object") return [];
  const out: string[] = [];
  for (const key of Object.keys(errors)) {
    const val = errors[key];
    if (!val) continue;
    const nextPath = [...path, key];
    if (typeof val === "object" && "message" in val && val.message) {
      out.push(`${nextPath.join(".")} — ${val.message}`);
    } else if (typeof val === "object") {
      out.push(...collectErrorMessages(val, nextPath));
    }
  }
  return out;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-black/10 pb-2">
      <h3 className="text-sm font-semibold tracking-wide text-[#222]">
        {title}
      </h3>
    </div>
  );
}

function DateTimeField({
  form,
  name,
  label,
}: {
  form: ReturnType<typeof useForm<EventCreateFormValues>>;
  name: "startsAt" | "endsAt";
  label: string;
}) {
  const err = (form.formState.errors as any)?.[name]?.message as
    | string
    | undefined;
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        <span className="ml-1 text-red-600">*</span>
      </label>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <DateTimePopover
            value={(field.value as string) ?? ""}
            onChange={(v) => field.onChange(v)}
            error={!!err}
            placeholder={`Pick ${label.toLowerCase()}`}
          />
        )}
      />
      {err ? <div className="text-xs text-red-600">{err}</div> : null}
    </div>
  );
}

/**
 * Nested-path text input. The shared TextField is schema-aware off top-level
 * keys, so for venue.* / virtualMeeting.* we render the input directly while
 * keeping the same look.
 */
function NestedTextField({
  form,
  name,
  label,
  placeholder,
  required,
}: {
  form: ReturnType<typeof useForm<EventCreateFormValues>>;
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

function NestedNumberField({
  form,
  name,
  label,
  decimalScale = 0,
}: {
  form: ReturnType<typeof useForm<EventCreateFormValues>>;
  name: string;
  label: string;
  decimalScale?: number;
}) {
  const err = getNestedErrorMessage(form.formState.errors, name);
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Controller
        control={form.control}
        name={name as any}
        render={({ field }) => (
          <input
            inputMode={decimalScale > 0 ? "decimal" : "numeric"}
            value={field.value == null ? "" : String(field.value)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                field.onChange(undefined);
                return;
              }
              const pat = decimalScale > 0 ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
              if (!pat.test(raw)) return;
              if (raw === "-" || raw.endsWith(".")) {
                field.onChange(raw as any);
                return;
              }
              const n = Number(raw);
              if (Number.isFinite(n)) field.onChange(n);
            }}
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
