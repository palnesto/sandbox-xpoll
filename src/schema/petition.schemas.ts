import { z } from "zod";
import { extractYouTubeId } from "@/types/petition";
import { isValidExternalLink } from "@/utils/external-links";

/** Single external link: same validation as add-info website link (http/https, valid domain) */
const externalLinkItemZ = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || isValidExternalLink(v), "Enter a valid URL (e.g. https://example.com or example.com)");

export const petitionCreateExternalLinksZ = z
  .array(externalLinkItemZ)
  .max(3, "Max 3 links")
  .optional()
  .default([]);

/** Image slot: data URL, blob URL, or http URL (no File in form state) */
const imageSlotZ = z.union([
  z.string(),
  z.null(),
]);
/** Video slot: blob or http URL */
const videoSlotZ = z.union([z.string(), z.null()]);

export const petitionCreateZ = z.object({
  name: z.string().trim().min(3, "Min 3 characters").max(30, "Max 30 characters"),
  countries: z.array(z.string().trim()).max(1).optional().default([]),
  externalLinks: petitionCreateExternalLinksZ,
  /** Single image slot for petition (optional). */
  imageLinks: z.tuple([imageSlotZ]).optional().default([null]),
  /** Single video slot (array of 0 or 1). */
  uploadedVideoLinks: z.array(videoSlotZ).max(1).optional().default([]),
  youtubeId: z.string().trim().optional().nullable(),
  description: z.string().trim().min(100, "Min 100 characters").max(12000, "Max 12000 characters"),
});

export const petitionCreateBaseZ = petitionCreateZ.superRefine((data, ctx) => {
  if (data.youtubeId != null && String(data.youtubeId).trim()) {
    const id = extractYouTubeId(String(data.youtubeId));
    if (!id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["youtubeId"],
        message: "Enter a valid YouTube URL or 11-character ID",
      });
    }
  }
});

export type PetitionCreateValues = z.infer<typeof petitionCreateZ>;
