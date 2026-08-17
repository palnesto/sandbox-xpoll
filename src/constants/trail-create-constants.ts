import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
} from "@/utils/media/video-upload.constants";

export const TRIAL_MAX_IMAGE_MB = 20;
export const TRIAL_MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
export const TRIAL_MAX_IMAGE_BYTES = TRIAL_MAX_IMAGE_MB * 1024 * 1024;
export const TRIAL_MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;
export const ACCEPT_IMAGE =
  "image/jpeg,image/jpg,image/png,image/webp,image/gif";
export const ACCEPT_VIDEO = VIDEO_UPLOAD_ACCEPT;
export const VIDEO_HELPER_TEXT = VIDEO_UPLOAD_HELPER_TEXT;

export const CROP_VIEW_W = 600;
export const CROP_VIEW_H = 300;

/** Max draft trails for campaign */
export const MAX_DRAFT_TRAILS_CAMPAIGN = 10;
/** Max draft trails for standalone */
export const MAX_DRAFT_TRAILS_STANDALONE = 3;
