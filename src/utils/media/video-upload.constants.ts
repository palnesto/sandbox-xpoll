import {
  VIDEO_OPTIMIZATION_COMPRESSION_STAGES,
  VIDEO_OPTIMIZATION_MAX_INPUT_BYTES,
  VIDEO_OPTIMIZATION_MAX_INPUT_MB,
  VIDEO_OPTIMIZATION_TARGET_MAX_BYTES,
  VIDEO_OPTIMIZATION_TARGET_MAX_MB,
  type VideoOptimizationStage,
} from "./asset-optimization.constants";

export const VIDEO_UPLOAD_MAX_INPUT_MB = VIDEO_OPTIMIZATION_MAX_INPUT_MB;
export const VIDEO_UPLOAD_TARGET_MAX_MB = VIDEO_OPTIMIZATION_TARGET_MAX_MB;
export const VIDEO_UPLOAD_MAX_INPUT_BYTES = VIDEO_OPTIMIZATION_MAX_INPUT_BYTES;
export const VIDEO_UPLOAD_TARGET_MAX_BYTES =
  VIDEO_OPTIMIZATION_TARGET_MAX_BYTES;

export const VIDEO_UPLOAD_ACCEPTED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
  "video/x-m4v",
] as const;

export const VIDEO_UPLOAD_ACCEPT =
  "video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,video/x-m4v,.mp4,.mov,.webm,.mkv,.avi,.m4v";

export const VIDEO_UPLOAD_HELPER_TEXT =
  "MP4, MOV, WEBM, MKV, AVI, M4V. Max 25 MB.";

export const VIDEO_UPLOAD_PREPROCESSING_ENABLED = true;

export const VIDEO_UPLOAD_EXTENSION_MIME_MAP: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  m4v: "video/x-m4v",
};

export function getVideoUploadFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isAcceptedVideoUploadFile(file: File): boolean {
  if (
    VIDEO_UPLOAD_ACCEPTED_MIME_TYPES.includes(
      file.type as (typeof VIDEO_UPLOAD_ACCEPTED_MIME_TYPES)[number],
    )
  ) {
    return true;
  }

  return (
    getVideoUploadFileExtension(file.name) in VIDEO_UPLOAD_EXTENSION_MIME_MAP
  );
}

export const VIDEO_UPLOAD_STAGE_TIMEOUT_MS = 120_000;
export const VIDEO_UPLOAD_TOTAL_TIMEOUT_MS = 360_000;

export type VideoCompressionStage = VideoOptimizationStage;

export const VIDEO_UPLOAD_COMPRESSION_STAGES =
  VIDEO_OPTIMIZATION_COMPRESSION_STAGES;
