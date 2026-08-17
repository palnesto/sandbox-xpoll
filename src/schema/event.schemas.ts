import { z } from "zod";
import { assetEnum } from "@/utils/currency-assets/asset";
import { toUTC } from "@/utils/time";

export const EVENT_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const;
export const eventVisibilities = [
  EVENT_VISIBILITY.PUBLIC,
  EVENT_VISIBILITY.PRIVATE,
] as const;
export type EventVisibility = (typeof eventVisibilities)[number];

export const EVENT_LOCATION_TYPE = {
  IN_PERSON: "in_person",
  VIRTUAL: "virtual",
} as const;
export const eventLocationTypes = [
  EVENT_LOCATION_TYPE.IN_PERSON,
  EVENT_LOCATION_TYPE.VIRTUAL,
] as const;
export type EventLocationType = (typeof eventLocationTypes)[number];

export const EVENT_PRICING_MODE = {
  FREE: "free",
  PAID: "paid",
} as const;
export const eventPricingModes = [
  EVENT_PRICING_MODE.FREE,
  EVENT_PRICING_MODE.PAID,
] as const;
export type EventPricingMode = (typeof eventPricingModes)[number];

export const VIRTUAL_MEETING_PROVIDER = {
  GOOGLE_MEET: "google_meet",
  ZOOM: "zoom",
  OTHER: "other",
} as const;
export const virtualMeetingProviders = [
  VIRTUAL_MEETING_PROVIDER.GOOGLE_MEET,
  VIRTUAL_MEETING_PROVIDER.ZOOM,
  VIRTUAL_MEETING_PROVIDER.OTHER,
] as const;
export type VirtualMeetingProvider = (typeof virtualMeetingProviders)[number];

export const MAX_COINS_PER_EVENT = 5;
export const MAX_COIN_AMOUNT_PER_EVENT = 1_000_000_000;
export const MAX_ALLOWLISTED_EMAILS_PER_EVENT = 10;

// Inner venue fields are all OPTIONAL at the schema level. Requiredness is
// enforced in the parent superRefine only when locationType === "in_person"
// — that way switching to "virtual" doesn't leave behind stale required
// errors from a partially-typed venue.
export const eventVenueZ = z
  .object({
    addressLine1: z.string().trim().max(250).optional(),
    addressLine2: z.string().trim().max(250).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().max(32).optional(),
  })
  .partial();

// Same approach as venue — inner fields optional, requiredness handled in
// the parent superRefine when locationType === "virtual".
export const eventVirtualMeetingZ = z
  .object({
    provider: z.enum(virtualMeetingProviders).optional(),
    url: z.string().trim().max(2048).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .partial();

export const eventCoinZ = z.object({
  assetId: assetEnum,
  amount: z
    .number()
    .int("Whole numbers only")
    .positive("Amount must be > 0")
    .max(MAX_COIN_AMOUNT_PER_EVENT, "Amount exceeds allowed max"),
});

/**
 * Top-level form values consumed by the create page. Keeps a flat shape so
 * the form fields can be wired with simple `name` paths.
 */
export const eventCreateFormZ = z
  .object({
    name: z.string().trim().min(3, "Min 3 characters").max(140, "Max 140 characters"),
    description: z.string().trim().min(1, "Required").max(5000, "Max 5000 characters"),
    coverImageUrl: z
      .string()
      .trim()
      .min(1, "Cover image is required")
      .max(2048),
    startsAt: z.string().trim().min(1, "Start time is required"),
    endsAt: z.string().trim().min(1, "End time is required"),
    timezone: z.string().trim().min(1).max(64),

    visibility: z.enum(eventVisibilities),
    locationType: z.enum(eventLocationTypes),

    venue: eventVenueZ.optional(),
    virtualMeeting: eventVirtualMeetingZ.optional(),

    pricingMode: z.enum(eventPricingModes),
    coins: z.array(eventCoinZ).max(MAX_COINS_PER_EVENT).optional().default([]),

    maxTickets: z
      .number()
      .int("Whole numbers only")
      .positive("Must be at least 1"),

    // Comma- or newline-separated emails. Parsed on submit.
    allowlistEmailsRaw: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    // Date validation
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Invalid date/time",
      });
    }
    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Invalid date/time",
      });
    }
    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end.getTime() <= start.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "End must be after start",
      });
    }
    if (!Number.isNaN(start.getTime()) && start.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Start must be in the future",
      });
    }

    // Location conditional — venue fields required ONLY for in_person events;
    // virtualMeeting fields required ONLY for virtual events. This stops
    // stale venue.* errors from showing when locationType is "virtual".
    if (data.locationType === EVENT_LOCATION_TYPE.IN_PERSON) {
      const v = data.venue ?? {};
      if (!v.addressLine1?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "addressLine1"],
          message: "Address is required",
        });
      if (!v.city?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "city"],
          message: "City is required",
        });
      if (!v.state?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "state"],
          message: "State is required",
        });
      if (!v.country?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "country"],
          message: "Country is required",
        });
      if (!v.postalCode?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "postalCode"],
          message: "Postal code is required",
        });
    }
    if (data.locationType === EVENT_LOCATION_TYPE.VIRTUAL) {
      const m = data.virtualMeeting ?? {};
      if (!m.provider)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["virtualMeeting", "provider"],
          message: "Provider is required",
        });
      const url = m.url?.trim();
      if (!url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["virtualMeeting", "url"],
          message: "Meeting URL is required",
        });
      } else if (!/^https?:\/\//i.test(url)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["virtualMeeting", "url"],
          message: "Enter a valid URL (https://…)",
        });
      }
    }

    // Pricing conditional
    if (data.pricingMode === EVENT_PRICING_MODE.PAID) {
      if (!data.coins || data.coins.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["coins"],
          message: "Add at least one coin price",
        });
      } else {
        const seen = new Set<string>();
        for (let i = 0; i < data.coins.length; i++) {
          const c = data.coins[i];
          if (seen.has(c.assetId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["coins", i, "assetId"],
              message: `Duplicate coin: ${c.assetId}`,
            });
          }
          seen.add(c.assetId);
        }
      }
    } else if (data.coins && data.coins.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coins"],
        message: "Free events cannot have priced coins",
      });
    }

    // Allowlist email count
    if (data.visibility === EVENT_VISIBILITY.PRIVATE && data.allowlistEmailsRaw) {
      const count = parseAllowlistEmails(data.allowlistEmailsRaw).length;
      if (count > MAX_ALLOWLISTED_EMAILS_PER_EVENT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allowlistEmailsRaw"],
          message: `Max ${MAX_ALLOWLISTED_EMAILS_PER_EVENT} emails allowed`,
        });
      }
    }
  });

export type EventCreateFormValues = z.infer<typeof eventCreateFormZ>;

/**
 * Edit form — same fields as create EXCEPT startsAt/endsAt/timezone-as-date.
 * Server forbids startsAt/endsAt changes (they are `immutable` on the model),
 * so we omit them from the form entirely.
 */
export const eventEditFormZ = z
  .object({
    name: z.string().trim().min(3, "Min 3 characters").max(140, "Max 140 characters"),
    description: z.string().trim().min(1, "Required").max(5000, "Max 5000 characters"),
    coverImageUrl: z
      .string()
      .trim()
      .min(1, "Cover image is required")
      .max(2048),
    timezone: z.string().trim().min(1).max(64),

    visibility: z.enum(eventVisibilities),
    locationType: z.enum(eventLocationTypes),

    venue: eventVenueZ.optional(),
    virtualMeeting: eventVirtualMeetingZ.optional(),

    pricingMode: z.enum(eventPricingModes),
    coins: z.array(eventCoinZ).max(MAX_COINS_PER_EVENT).optional().default([]),

    maxTickets: z
      .number()
      .int("Whole numbers only")
      .positive("Must be at least 1"),

    allowlistEmailsRaw: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.locationType === EVENT_LOCATION_TYPE.IN_PERSON) {
      const v = data.venue ?? {};
      if (!v.addressLine1?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "addressLine1"],
          message: "Address is required",
        });
      if (!v.city?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "city"],
          message: "City is required",
        });
      if (!v.state?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "state"],
          message: "State is required",
        });
      if (!v.country?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "country"],
          message: "Country is required",
        });
      if (!v.postalCode?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venue", "postalCode"],
          message: "Postal code is required",
        });
    }
    if (data.locationType === EVENT_LOCATION_TYPE.VIRTUAL) {
      const m = data.virtualMeeting ?? {};
      if (!m.provider)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["virtualMeeting", "provider"],
          message: "Provider is required",
        });
      const url = m.url?.trim();
      if (!url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["virtualMeeting", "url"],
          message: "Meeting URL is required",
        });
      } else if (!/^https?:\/\//i.test(url)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["virtualMeeting", "url"],
          message: "Enter a valid URL (https://…)",
        });
      }
    }

    if (data.pricingMode === EVENT_PRICING_MODE.PAID) {
      if (!data.coins || data.coins.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["coins"],
          message: "Add at least one coin price",
        });
      } else {
        const seen = new Set<string>();
        for (let i = 0; i < data.coins.length; i++) {
          const c = data.coins[i];
          if (seen.has(c.assetId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["coins", i, "assetId"],
              message: `Duplicate coin: ${c.assetId}`,
            });
          }
          seen.add(c.assetId);
        }
      }
    } else if (data.coins && data.coins.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coins"],
        message: "Free events cannot have priced coins",
      });
    }

    if (data.visibility === EVENT_VISIBILITY.PRIVATE && data.allowlistEmailsRaw) {
      const count = parseAllowlistEmails(data.allowlistEmailsRaw).length;
      if (count > MAX_ALLOWLISTED_EMAILS_PER_EVENT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allowlistEmailsRaw"],
          message: `Max ${MAX_ALLOWLISTED_EMAILS_PER_EVENT} emails allowed`,
        });
      }
    }
  });

export type EventEditFormValues = z.infer<typeof eventEditFormZ>;

/**
 * Normalize Mongo Decimal128 (`{ $numberDecimal: "100" }`), strings, and
 * numbers all to a plain number for form input.
 */
export function coinAmountToNumber(amount: unknown): number {
  if (amount == null) return 0;
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") return Number(amount) || 0;
  if (typeof amount === "object") {
    const obj = amount as any;
    if (typeof obj.$numberDecimal === "string") {
      return Number(obj.$numberDecimal) || 0;
    }
    const s = obj.toString?.();
    if (typeof s === "string" && s !== "[object Object]") return Number(s) || 0;
  }
  return 0;
}

/**
 * Build the PATCH payload the server expects from an edit-form snapshot.
 * Only sends fields the server's updateEventService accepts.
 */
export function buildUpdateEventPayload(
  values: EventEditFormValues,
): Record<string, unknown> {
  const allowlistEmails = parseAllowlistEmails(values.allowlistEmailsRaw);
  return {
    name: values.name,
    description: values.description,
    coverImageUrl: values.coverImageUrl ?? null,
    timezone: values.timezone,
    visibility: values.visibility,
    locationType: values.locationType,
    venue:
      values.locationType === EVENT_LOCATION_TYPE.IN_PERSON
        ? values.venue ?? null
        : null,
    virtualMeeting:
      values.locationType === EVENT_LOCATION_TYPE.VIRTUAL
        ? values.virtualMeeting ?? null
        : null,
    pricing: {
      mode: values.pricingMode,
      coins:
        values.pricingMode === EVENT_PRICING_MODE.PAID
          ? (values.coins ?? []).map((c) => ({
              assetId: c.assetId,
              amount: String(c.amount),
            }))
          : [],
    },
    capacity: { maxTickets: values.maxTickets },
    allowlistEmails:
      values.visibility === EVENT_VISIBILITY.PRIVATE
        ? allowlistEmails
        : undefined,
  };
}

/**
 * Convert a full event document (as returned by getByIdForOwner) into the
 * flat shape the edit form consumes.
 */
export function eventDocToEditFormValues(doc: any): EventEditFormValues {
  const allowlistEmails: string[] = doc?.allowlist?.emails ?? [];
  return {
    name: String(doc?.name ?? ""),
    description: String(doc?.description ?? ""),
    coverImageUrl: doc?.coverImageUrl ?? undefined,
    timezone: String(doc?.timezone ?? "UTC"),
    visibility: (doc?.visibility ?? EVENT_VISIBILITY.PUBLIC) as EventVisibility,
    locationType: (doc?.locationType ??
      EVENT_LOCATION_TYPE.IN_PERSON) as EventLocationType,
    venue: doc?.venue
      ? {
          addressLine1: doc.venue.addressLine1 ?? "",
          addressLine2: doc.venue.addressLine2 ?? undefined,
          city: doc.venue.city ?? "",
          state: doc.venue.state ?? "",
          country: doc.venue.country ?? "",
          postalCode: doc.venue.postalCode ?? "",
        }
      : undefined,
    virtualMeeting: doc?.virtualMeeting
      ? {
          provider: doc.virtualMeeting.provider,
          url: doc.virtualMeeting.url ?? "",
          notes: doc.virtualMeeting.notes ?? undefined,
        }
      : undefined,
    pricingMode: (doc?.pricing?.mode ?? EVENT_PRICING_MODE.FREE) as EventPricingMode,
    coins: Array.isArray(doc?.pricing?.coins)
      ? doc.pricing.coins.map((c: any) => ({
          assetId: c.assetId,
          amount: coinAmountToNumber(c.amount),
        }))
      : [],
    maxTickets: Number(doc?.capacity?.maxTickets ?? 1),
    allowlistEmailsRaw: allowlistEmails.length
      ? allowlistEmails.join("\n")
      : undefined,
  };
}

export function parseAllowlistEmails(raw?: string): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[,\n]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

/**
 * Map the flat form values to the exact request body the API expects.
 */
export function buildCreateEventPayload(
  values: EventCreateFormValues,
): Record<string, unknown> {
  const allowlistEmails = parseAllowlistEmails(values.allowlistEmailsRaw);

  return {
    name: values.name,
    description: values.description,
    coverImageUrl: values.coverImageUrl ?? null,
    // Owner picks in their local zone; convert to UTC ISO before send.
    startsAt: toUTC(values.startsAt),
    endsAt: toUTC(values.endsAt),
    timezone: values.timezone,
    visibility: values.visibility,
    locationType: values.locationType,
    venue:
      values.locationType === EVENT_LOCATION_TYPE.IN_PERSON
        ? values.venue ?? null
        : null,
    virtualMeeting:
      values.locationType === EVENT_LOCATION_TYPE.VIRTUAL
        ? values.virtualMeeting ?? null
        : null,
    pricing: {
      mode: values.pricingMode,
      coins:
        values.pricingMode === EVENT_PRICING_MODE.PAID
          ? (values.coins ?? []).map((c) => ({
              assetId: c.assetId,
              amount: String(c.amount),
            }))
          : [],
    },
    capacity: { maxTickets: values.maxTickets },
    allowlistEmails:
      values.visibility === EVENT_VISIBILITY.PRIVATE ? allowlistEmails : undefined,
  };
}
