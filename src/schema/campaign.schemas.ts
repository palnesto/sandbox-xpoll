import { isValidExternalLink } from "@/utils/external-links";
import { stripHtmlToText } from "@/utils/strip-html";
import { z } from "zod";

const trimOrEmpty = (v: unknown) => (typeof v === "string" ? v.trim() : v);

const emptyToUndefined = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length ? t : undefined;
};

const emptyToNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
};

export function normalizeTwitterLink(s: string | null): string | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^(www\.)?(x\.com|twitter\.com)(\/|$)/i.test(t)) return t.startsWith("http") ? t : `https://${t}`;
  return `https://x.com/${t.replace(/^@/, "")}`;
}

export function normalizeInstagramLink(s: string | null): string | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^(www\.)?instagram\.com(\/|$)/i.test(t)) return t.startsWith("http") ? t : `https://${t}`;
  return `https://instagram.com/${t.replace(/^@/, "")}`;
}

export function normalizeTelegramLink(s: string | null): string | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^(www\.)?(t\.me|telegram\.me)(\/|$)/i.test(t)) return t.startsWith("http") ? t : `https://${t}`;
  return `https://t.me/${t.replace(/^@/, "")}`;
}

export function normalizeWebsiteLink(s: string | null): string | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.toLowerCase().startsWith("www.")) return `https://${t}`;
  return `https://${t}`;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const urlWithLengthZ = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(3, "Must be at least 3 characters")
    .max(2000, "Must be at most 2000 characters")
    .url("Enter a valid URL")
    .optional(),
);

const emailWithLengthZ = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(3, "Must be at least 3 characters")
    .max(2000, "Must be at most 2000 characters")
    .email("Enter a valid email")
    .optional(),
);

/* -------------------------------------------------
 * ✅ WEBSITE – strict external-link validation
 * (same rules as Blog / Petition)
 * ------------------------------------------------- */
const websiteExternalLinkZ = z
  .preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().optional(),
  )
  .superRefine((v, ctx) => {
    if (!v) return; // empty allowed

    if (!isValidExternalLink(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid website URL",
      });
    }
  });

/* -------------------------------------------------
 * Media helpers (unchanged)
 * ------------------------------------------------- */
const imageStringZ = z
  .preprocess(trimOrEmpty, z.string())
  .refine(
    (v) =>
      typeof v === "string" &&
      (v.startsWith("data:image/") ||
        v.startsWith("blob:") ||
        /^https?:\/\//i.test(v)),
    "Upload a valid image",
  );

const imageFileZ =
  typeof File !== "undefined"
    ? z.instanceof(File)
    : z.any().refine(() => false, "File not supported");

const imageValueZ = z.union([imageStringZ, imageFileZ]);

const videoStringZ = z
  .preprocess(trimOrEmpty, z.string())
  .refine(
    (v) =>
      typeof v === "string" &&
      (v.startsWith("data:video/") ||
        v.startsWith("blob:") ||
        /^https?:\/\//i.test(v)),
    "Upload a valid video",
  );

const videoFileZ =
  typeof File !== "undefined"
    ? z.instanceof(File)
    : z.any().refine(() => false, "File not supported");

const videoValueZ = z.union([videoStringZ, videoFileZ]);

/* -------------------------------------------------
 * YouTube helpers (unchanged)
 * ------------------------------------------------- */
const isYoutubeId = (s: string) => /^[a-zA-Z0-9_-]{11}$/.test(s.trim());

const toYoutubeId = (input: string) => {
  const s = input.trim();
  if (isYoutubeId(s)) return s;

  const m =
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);

  return m?.[1] ?? null;
};

const youtubeIdOrUrlZ = z
  .preprocess(emptyToUndefined, z.string().trim().optional())
  .superRefine((v, ctx) => {
    if (!v) return;
    const id = toYoutubeId(v);
    if (!id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid YouTube URL or 11-char video ID",
      });
    }
  })
  .transform((v) => (v ? (toYoutubeId(v) ?? undefined) : undefined));

/* -------------------------------------------------
 * ✅ ADD LINKS (FINAL)
 * Only website uses strict external-link rules
 * ------------------------------------------------- */
export const addInfoLinksZ = z
  .object({
    x: urlWithLengthZ,
    instagram: urlWithLengthZ,
    telegram: urlWithLengthZ,
    email: emailWithLengthZ,

    // ✅ STRICT website validation
    website: websiteExternalLinkZ,
  })
  .default({});

export type AddInfoLinksValues = z.infer<typeof addInfoLinksZ>;

export const addLinksModalZ = addInfoLinksZ.superRefine((v, ctx) => {
  const any =
    !!v.x || !!v.instagram || !!v.telegram || !!v.email || !!v.website;

  if (!any) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["website"],
      message: "Add at least one link",
    });
  }
});
export type AddLinksModalValues = z.infer<typeof addLinksModalZ>;

/* -------------------------------------------------
 * Flat Add-Links modal schema (no nested paths – avoids zodFieldMeta)
 * Backend: email max 320, url max 2048. Strict validation + normalization.
 * ------------------------------------------------- */
const twitterLinkModalZ = z.preprocess(
  emptyToNull,
  z
    .union([z.null(), z.string().trim().max(2048)])
    .transform((v) => (v && typeof v === "string" && v.trim() ? normalizeTwitterLink(v) : null))
    .refine((v) => v === null || isValidHttpUrl(v), "Enter a valid X/Twitter URL").optional(),
);
const instagramLinkModalZ = z.preprocess(
  emptyToNull,
  z
    .union([z.null(), z.string().trim().max(2048)])
    .transform((v) => (v && typeof v === "string" && v.trim() ? normalizeInstagramLink(v) : null))
    .refine((v) => v === null || isValidHttpUrl(v), "Enter a valid Instagram URL").optional(),
);
const telegramLinkModalZ = z.preprocess(
  emptyToNull,
  z
    .union([z.null(), z.string().trim().max(2048)])
    .transform((v) => (v && typeof v === "string" && v.trim() ? normalizeTelegramLink(v) : null))
    .refine((v) => v === null || isValidHttpUrl(v), "Enter a valid Telegram URL").optional(),
);
const emailLinkModalZ = z.preprocess(
  emptyToNull,
  z.union([
    z.null(),
    z.string().trim().email("Enter a valid email").max(320, "Max 320 characters"),
  ]).optional(),
);
const websiteLinkModalZ = z.preprocess(
  emptyToNull,
  z
    .union([z.null(), z.string().trim().max(2048)])
    .transform((v) => (v && typeof v === "string" && v.trim() ? normalizeWebsiteLink(v) : null))
    .refine(
      (v) => v === null || (typeof v === "string" && isValidExternalLink(v)),
      "Enter a valid website URL",
    ).optional(),
);

export const addInfoLinksFlatModalZ = z.object({
  twitterLink: twitterLinkModalZ,
  instagramLink: instagramLinkModalZ,
  telegramLink: telegramLinkModalZ,
  emailLink: emailLinkModalZ,
  websiteLink: websiteLinkModalZ,
});

export type AddInfoLinksFlatModalValues = z.infer<typeof addInfoLinksFlatModalZ>;

export const donationSettingsModalZ = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  })
  .superRefine((v, ctx) => {
    if (v.startDate > v.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date",
      });
    }
  });

export type DonationSettingsModalValues = z.infer<
  typeof donationSettingsModalZ
>;

const targetGeoZ = z
  .object({
    countries: z.array(z.string()).default([]),
    states: z.array(z.string()).default([]),
    cities: z.array(z.string()).default([]),
  })
  .optional();

/* -------------------------------------------------
 * Campaign Add-Info form (simplified: single city, 3 images, 1 video)
 * ------------------------------------------------- */
/** Add-info: image slot is string (data URL or http) or null only — no File; component validates file (JPG/PNG/WEBP/GIF, 100KB–20MB) before setValue. */
const campaignAddInfoImageSlotZ = z.union([imageStringZ, z.null()]);

/** Add-info form + API shape: IDs only. countries/states/cities are string[] (no populated objects). */
const campaignAddInfoTargetGeoZ = z
  .object({
    countries: z.array(z.string().trim()).default([]),
    states: z.array(z.string().trim()).default([]),
    cities: z.array(z.string().trim()).default([]),
  })
  .default({ countries: [], states: [], cities: [] });

/** Add-info: uploadedVideoLinks is array of 0 or 1 (single MP4 slot). Element: blob/data URL or http URL or null. */
const campaignAddInfoUploadedVideoLinksZ = z
  .array(z.union([videoStringZ, z.null()]))
  .max(1)
  .default([]);

/** Base object schema for add-info (use with handleSubmitNormalized); validation is in campaignAddInfoZ. Field names match API: imageLinks, uploadedVideoLinks, videoLink. */
export const campaignAddInfoBaseZ = z.object({
  description: z.string().min(3, "Min 3 characters").max(350, "Max 350 characters"),
  targetGeo: campaignAddInfoTargetGeoZ,
  links: addInfoLinksZ.optional().default({}),
  imageLinks: z
    .tuple([
      campaignAddInfoImageSlotZ,
      campaignAddInfoImageSlotZ,
      campaignAddInfoImageSlotZ,
    ])
    .default([null, null, null]),
  uploadedVideoLinks: campaignAddInfoUploadedVideoLinksZ,
  videoLink: z.string().optional().default(""),
  /** Max 3 industry IDs; sent as linkedIndustries in PUT. Display names kept in UI state. */
  linkedIndustries: z.array(z.string()).max(3).optional().default([]),
});

export const campaignAddInfoZ = campaignAddInfoBaseZ.superRefine((data, ctx) => {
    const plain = stripHtmlToText(data.description ?? "");
    if (plain.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Min 3 characters",
      });
    }
    if (plain.length > 350) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Max 350 characters",
      });
    }
    const imageCount = (data.imageLinks ?? []).filter(Boolean).length;
    if (imageCount !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageLinks"],
        message: "Please add 3 images",
      });
    }
  });

export type CampaignAddInfoValues = z.infer<typeof campaignAddInfoZ>;

export const addInfoPageZ = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Min 10 characters")
    .max(150, "Max 150 characters"),
  location: z.string().optional().default(""),
  images: z
    .array(z.union([imageValueZ, z.null()]))
    .length(3, "Please add 3 images")
    .superRefine((arr, ctx) => {
      const count = (arr ?? []).filter(Boolean).length;
      if (count !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [],
          message: "Please add 3 images",
        });
      }
    }),
  videoUrl: youtubeIdOrUrlZ.optional(),
  uploadedVideos: z
    .array(z.union([videoValueZ, z.null()]))
    .length(1)
    .default([null]),
  links: addInfoLinksZ,
  donation: z.object({
    enabled: z.boolean(),
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(), // YYYY-MM-DD
  }),

  targetGeo: targetGeoZ
    .default({ countries: [], states: [], cities: [] })
    .optional(),
});

export type AddInfoPageValues = z.infer<typeof addInfoPageZ>;

export const createCampaignFormZ = z.object({
  campaignName: z
    .string()
    .trim()
    .min(1, "Campaign name is required")
    .max(25, "Max 25 characters"),
  goal: z
    .string()
    .trim()
    .min(10, "At least 10 characters")
    .max(150, "Max 150 characters"),
  getDataAccess: z.boolean(),
  campaignType: z.enum(["political", "non_political"]),
  duration: z.string().min(1, "Please select a plan"),
  agree: z.boolean(),
});

export type CreateCampaignFormValues = z.infer<typeof createCampaignFormZ>;

const rewardTypeZ = z.enum(["min", "max"]);

export const TRAIL_CONSTRAINTS = {
  textMin: 3,
  trailNameMax: 30,
  trailDescriptionMax: 350,
  pollNameMax: 25,
  pollDescriptionMax: 350,
  pollOptionMax: 25,
  pollsMax: 50,
  optionsMin: 2,
  optionsMax: 4,
} as const;

export const trailRewardZ = z.object({
  id: z.string(),
  assetId: z.string().trim().min(1, "Coin is required"),
  amount: z.number().min(0, "Invalid amount"),
  rewardAmountCap: z.number().min(0, "Invalid cap"),
  rewardType: rewardTypeZ,
});

/** Poll resource asset: image | youtube | video. Value: URL string, data URL, or File. */
const pollAssetValueZ =
  typeof File !== "undefined"
    ? z.union([z.string().min(1), z.instanceof(File)])
    : z.string().min(1);

export const pollResourceAssetZ = z.object({
  type: z.enum(["image", "youtube", "video"]),
  value: pollAssetValueZ,
});

export type PollResourceAsset = z.infer<typeof pollResourceAssetZ>;

const pollOptionZ = z
  .string()
  .trim()
  .min(1, "Option is required (min 1 char)")
  .max(
    TRAIL_CONSTRAINTS.pollOptionMax,
    `Option max ${TRAIL_CONSTRAINTS.pollOptionMax} characters`,
  );

export const trailPollZ = z.object({
  id: z.string(),
  pollName: z
    .string()
    .trim()
    .min(
      TRAIL_CONSTRAINTS.textMin,
      `Poll name is required (min ${TRAIL_CONSTRAINTS.textMin} chars)`,
    ),
  pollDescription: z
    .string()
    .trim()
    .min(
      TRAIL_CONSTRAINTS.textMin,
      `Poll description is required (min ${TRAIL_CONSTRAINTS.textMin} chars)`,
    ),
  resourceAssets: z.array(pollResourceAssetZ).max(20).default([]),
  options: z
    .array(pollOptionZ)
    .min(
      TRAIL_CONSTRAINTS.optionsMin,
      `Min. ${TRAIL_CONSTRAINTS.optionsMin} options are required`,
    )
    .max(
      TRAIL_CONSTRAINTS.optionsMax,
      `Max ${TRAIL_CONSTRAINTS.optionsMax} options are allowed`,
    ),
});

/** Trial (trail) allows exactly one resource asset: image OR youtube OR video (no co-exist). */
export const trailCreateZ = z
  .object({
    trailName: z
      .string()
      .trim()
      .min(
        TRAIL_CONSTRAINTS.textMin,
        `Trail name is required (min ${TRAIL_CONSTRAINTS.textMin} chars)`,
      )
      .max(
        TRAIL_CONSTRAINTS.trailNameMax,
        `Max ${TRAIL_CONSTRAINTS.trailNameMax} characters`,
      ),
    description: z
      .string()
      .trim()
      .min(
        TRAIL_CONSTRAINTS.textMin,
        `Description is required (min ${TRAIL_CONSTRAINTS.textMin} chars)`,
      )
      .max(
        TRAIL_CONSTRAINTS.trailDescriptionMax,
        `Max ${TRAIL_CONSTRAINTS.trailDescriptionMax} chars`,
      ),
    trialResourceAssets: z.array(pollResourceAssetZ).max(1).default([]),
    polls: z
      .array(trailPollZ)
      .min(1, "Add at least 1 poll")
      .max(
        TRAIL_CONSTRAINTS.pollsMax,
        `Max ${TRAIL_CONSTRAINTS.pollsMax} polls allowed`,
      )
      .default([]),
    rewards: z.array(trailRewardZ).min(1, "Add at least 1 reward").default([]),
  })
  .superRefine((v, ctx) => {
    const assets = v.trialResourceAssets ?? [];
    if (assets.length !== 1 || !assets[0]?.value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trialResourceAssets"],
        message: "Add one media (image, video, or YouTube)",
      });
    }
  });

export type TrailCreateValues = z.infer<typeof trailCreateZ>;

const optionTextZ = z
  .string()
  .trim()
  .min(1, "Option is required")
  .max(
    TRAIL_CONSTRAINTS.pollOptionMax,
    `Max ${TRAIL_CONSTRAINTS.pollOptionMax} characters`,
  );

export const addPollModalZ = z.object({
  pollName: z
    .string()
    .trim()
    .min(
      TRAIL_CONSTRAINTS.textMin,
      `Poll name is required (min ${TRAIL_CONSTRAINTS.textMin} chars)`,
    )
    .max(
      TRAIL_CONSTRAINTS.pollNameMax,
      `Max ${TRAIL_CONSTRAINTS.pollNameMax} chars`,
    ),
  pollDescription: z
    .string()
    .trim()
    .min(
      TRAIL_CONSTRAINTS.textMin,
      `Poll description is required (min ${TRAIL_CONSTRAINTS.textMin} chars)`,
    )
    .max(
      TRAIL_CONSTRAINTS.pollDescriptionMax,
      `Max ${TRAIL_CONSTRAINTS.pollDescriptionMax} chars`,
    ),
  resourceAssets: z.array(pollResourceAssetZ).max(20).default([]),
  options: z
    .array(optionTextZ)
    .min(
      TRAIL_CONSTRAINTS.optionsMin,
      `Min. ${TRAIL_CONSTRAINTS.optionsMin} options are required`,
    )
    .max(
      TRAIL_CONSTRAINTS.optionsMax,
      `Max ${TRAIL_CONSTRAINTS.optionsMax} options are allowed`,
    ),
});

export type AddPollModalValues = z.infer<typeof addPollModalZ>;

export const payNowModalZ = z.object({
  agree: z.literal(true, {
    errorMap: () => ({ message: "You must agree before proceeding" }),
  }),
});
export type PayNowModalValues = z.infer<typeof payNowModalZ>;
