import { z } from "zod";
import { extractYouTubeId } from "@/types/petition";
import {
  CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS,
  CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
  CAMPAIGN_BLOG_MAX_TITLE_CHARS,
} from "@/constants/campaign-blog.constants";
import { isValidExternalLink } from "@/utils/external-links";
import { campaignBlogDescriptionHasMeaningfulText } from "@/lib/campaign-blog-description";

const externalLinkItemZ = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || isValidExternalLink(v), "Enter a valid URL");

export const blogCreateExternalLinksZ = z
  .array(externalLinkItemZ)
  .max(CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS, `Max ${CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS} links`)
  .optional()
  .default([]);

export const blogCreateZ = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Min 1 character")
    .max(CAMPAIGN_BLOG_MAX_TITLE_CHARS, `Max ${CAMPAIGN_BLOG_MAX_TITLE_CHARS} characters`),
  description: z
    .string()
    .min(100, "Min 100 characters")
    .max(CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS, `Max ${CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS} characters`)
    .superRefine((val, ctx) => {
      if (!campaignBlogDescriptionHasMeaningfulText(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Description is required",
        });
      }
    }),
  externalLinks: blogCreateExternalLinksZ,
  /** Which media tab is selected. */
  mediaType: z.enum(["none", "image", "video", "youtube"]).default("none"),
  /** Single image slot (optional). Form stores data URL / blob URL / http URL. */
  imageLink: z.string().nullable().optional(),
  /** Single video slot (optional). */
  videoLink: z.string().nullable().optional(),
  /** YouTube id (optional). */
  youtubeId: z.string().trim().optional().nullable(),
  /** Linked trial ids (max 3). */
  linkedTrials: z.array(z.string().trim()).max(3).optional().default([]),
});

export const blogCreateBaseZ = blogCreateZ.superRefine((data, ctx) => {
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

export type BlogCreateValues = z.infer<typeof blogCreateZ>;
