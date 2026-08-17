import { z } from "zod";

export type BaseOption = { label: string; value: string };

export function safeArr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function sumVotes(v: any) {
  const yes = Number(v?.yes ?? 0);
  const no = Number(v?.no ?? 0);
  return (Number.isFinite(yes) ? yes : 0) + (Number.isFinite(no) ? no : 0);
}

export function extractYouTubeId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

  try {
    const url = new URL(s);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id! : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      const knownPrefixes = ["embed", "shorts", "v"];
      const idx = parts.findIndex((p) => knownPrefixes.includes(p));
      if (idx >= 0 && /^[A-Za-z0-9_-]{11}$/.test(parts[idx + 1] || "")) {
        return parts[idx + 1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Returns YouTube thumbnail URL (hqdefault) from video ID or full URL, or null if invalid. */
export function getYouTubeThumbnailUrl(input: string): string | null {
  const id = extractYouTubeId(input);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export async function resolveCountryNames(args: {
  codes: string[];
  apiBase: string; // import.meta.env.VITE_BACKEND_URL
  route: string; // endpoints.location.getAllCountries
  credentials?: RequestCredentials; // default "include"
}): Promise<Record<string, string>> {
  const { codes, apiBase, route, credentials = "include" } = args;

  const out: Record<string, string> = {};
  const uniq = Array.from(new Set(safeArr(codes).map(String).filter(Boolean)));

  await Promise.all(
    uniq.map(async (code) => {
      try {
        const url = new URL(`${apiBase}${route}`);
        url.searchParams.set("q", code);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "50");

        const res = await fetch(url.toString(), { credentials });
        const json = await res.json().catch(() => null);

        const root = json?.data?.data ?? json?.data ?? {};
        const entries = Array.isArray(root?.entries)
          ? root.entries
          : Array.isArray(root?.items)
            ? root.items
            : Array.isArray(root?.results)
              ? root.results
              : [];

        const match = entries.find((x: any) => String(x?._id) === String(code));
        out[code] = String(match?.name || code);
      } catch {
        out[code] = code;
      }
    }),
  );

  return out;
}

export type PetitionRow = {
  _id: string;
  id?: string;
  belongsToCampaignId?: string;

  isEnabled?: boolean;
  name: string;
  description?: string;

  uploadedImageLinks?: string[];
  uploadedVideoLinks?: string[];
  ytVideoLinks?: string[];

  externalLinks?: string[];

  targetGeo?: { countries?: string[] };

  voteCountCache?: { yes: number; no: number };

  createdAt?: string;
  updatedAt?: string;
};

export type ViewMode = "manage" | "create" | "edit";
export type MediaType = "none" | "image" | "video" | "youtube";

/**
 * Reusable media state:
 * supports multiple items per type (limits can constrain to 1 for current UI)
 */
export type MediaState =
  | { type: "none" }
  | {
      type: "image";
      files: File[];
      previews: string[]; // dataUrls OR urls for display
      urls: string[]; // existing remote urls
    }
  | {
      type: "video";
      files: File[];
      previews: string[]; // dataUrls OR urls for display
      urls: string[];
    }
  | { type: "youtube"; ytIds: string[] };

export const urlZ = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .max(2048, "Too long");

export function normalizeHttpUrl(input: string): string {
  let s = String(input ?? "");

  // remove common invisible chars (ZWSP, ZWNJ/ZWJ, BOM) + whitespace
  s = s
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, "");

  if (!s) throw new Error("URL is required");

  // add scheme if missing
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
    s = `https://${s}`;
  }

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    // helpful message instead of DOM default
    throw new Error("Enter a valid URL (e.g., example.com)");
  }

  // allow only http(s)
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }

  // force https
  u.protocol = "https:";

  // disallow credentials
  if (u.username || u.password) throw new Error("Credentials are not allowed");

  // require a real hostname
  if (!u.hostname || !u.hostname.includes(".")) {
    throw new Error("URL must include a valid domain");
  }

  // ensure path
  if (!u.pathname) u.pathname = "/";

  return u.toString();
}

export const httpUrlZ = z
  .string()
  .trim()
  .min(1, "URL is required")
  .transform((val, ctx) => {
    try {
      return normalizeHttpUrl(val); // ✅ normalization happens here
    } catch (e: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e?.message || "Invalid URL",
      });
      return z.NEVER;
    }
  });
export const externalLinksZ = z.preprocess(
  (v) => (Array.isArray(v) ? v : []).map((s) => String(s ?? "").trim()),
  z.array(httpUrlZ).max(3, "Max 3 links"),
);

export const petitionFormZ = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Min 3 characters")
      .max(30, "Max 30 characters"),
    description: z
      .string()
      .trim()
      .min(100, "Min 100 characters")
      .max(12000, "Max 12000 characters"),
    externalLinks: externalLinksZ.optional().default([]),
    countryOpts: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional()
      .default([]),
    mediaType: z.enum(["none", "image", "video", "youtube"]).default("none"),
    youtubeDraft: z.string().optional().default(""),
  })
  .superRefine((val, ctx) => {
    if (val.mediaType === "youtube") {
      const id = extractYouTubeId(val.youtubeDraft || "");
      if (!id) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid YouTube URL or 11-character ID",
          path: ["youtubeDraft"],
        });
      }
    }
  });

export type PetitionForm = z.infer<typeof petitionFormZ>;
