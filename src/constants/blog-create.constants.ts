import type { BlogCreateValues } from "@/schema/blog.schemas";
import {
  CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS,
  CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
  CAMPAIGN_BLOG_MAX_TITLE_CHARS,
} from "@/constants/campaign-blog.constants";
import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
} from "@/utils/media/video-upload.constants";

export const BLOG_MAX_IMAGE_MB = 20;
export const BLOG_MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
export const CROP_VIEW_W = 600;
export const CROP_VIEW_H = 300;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = BLOG_MAX_IMAGE_MB * 1024 * 1024;
export const MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;
export const ACCEPT_IMAGE =
  "image/jpeg,image/jpg,image/png,image/webp,image/gif";
export const ACCEPT_VIDEO = VIDEO_UPLOAD_ACCEPT;
export const VIDEO_HELPER_TEXT = VIDEO_UPLOAD_HELPER_TEXT;

export const MAX_LINKED_TRIALS = 3;
export {
  CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS,
  CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
  CAMPAIGN_BLOG_MAX_TITLE_CHARS,
};

export const defaultFormValues: BlogCreateValues = {
  title: "",
  description: "",
  externalLinks: [],
  mediaType: "none",
  imageLink: null,
  videoLink: null,
  youtubeId: null,
  linkedTrials: [],
};

// ---------- utils (kept here to avoid extra file) ----------

export function pickTrialImage(
  item?: { resourceAssets?: { type?: string; value?: string }[] }
): string | undefined {
  const img = (item?.resourceAssets ?? []).find((a) => a?.type === "image");
  return img?.value ? String(img.value) : undefined;
}

export function safeArr<T = string>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function revokeBlob(url: string | null) {
  if (url?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}
