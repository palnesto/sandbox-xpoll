import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Video as VideoIcon,
  Youtube,
  Image as ImageIcon,
} from "lucide-react";

import { MediaState, MediaType, extractYouTubeId } from "@/types/petition";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  isAcceptedVideoUploadFile,
} from "@/utils/media/video-upload.constants";

type Limits = {
  image?: { maxCount: number; maxBytes: number };
  video?: { maxCount: number; maxBytes: number };
  youtube?: { maxCount: number };
};

export function MediaAssetsPicker({
  mediaType,
  setMediaType,
  media,
  setMedia,
  youtubeDraft,
  setYoutubeDraft,
  errorText,
  clearError,
  setError,
  setOversize,
  allowedTypes = ["image", "video", "youtube", "none"],
  limits = {
    image: { maxCount: 1, maxBytes: 2 * 1024 * 1024 },
    video: { maxCount: 1, maxBytes: VIDEO_UPLOAD_MAX_INPUT_BYTES },
    youtube: { maxCount: 1 },
  },
}: {
  mediaType: MediaType;
  setMediaType: (t: MediaType) => void;

  media: MediaState;
  setMedia: (m: MediaState) => void;

  youtubeDraft: string;
  setYoutubeDraft: (v: string) => void;

  errorText?: string | null;
  clearError: () => void;
  setError: (msg: string) => void;

  setOversize: (v: boolean) => void;

  allowedTypes?: MediaType[];
  limits?: Limits;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const imageLimit = limits.image?.maxCount ?? 1;
  const videoLimit = limits.video?.maxCount ?? 1;

  const openFileDialog = () => fileRef.current?.click();

  const hardResetMedia = () => {
    setOversize(false);
    clearError();
    setMedia({ type: "none" });
  };

  const onPickFiles = async (files: File[]) => {
    if (!files.length) return;

    // validate by current mediaType
    const isImgMode = mediaType === "image";
    const isVidMode = mediaType === "video";

    const allAreImages = files.every((f) => f.type.startsWith("image/"));
    const allAreVideos = files.every(isAcceptedVideoUploadFile);

    if (isImgMode && !allAreImages) {
      setOversize(false);
      setError("Select an image file");
      return;
    }
    if (isVidMode && !allAreVideos) {
      setOversize(false);
      setError("Select a video file");
      return;
    }

    // enforce size limits per file
    if (isImgMode) {
      const maxBytes = limits.image?.maxBytes ?? 2 * 1024 * 1024;
      const oversize = files.some((f) => f.size > maxBytes);
      if (oversize) {
        setOversize(true);
        setError("Image should not exceed 2MB");
        return;
      }
    }

    if (isVidMode) {
      const maxBytes = limits.video?.maxBytes ?? VIDEO_UPLOAD_MAX_INPUT_BYTES;
      const oversize = files.some((f) => f.size > maxBytes);
      if (oversize) {
        setOversize(true);
        setError(`Video should not exceed ${Math.round(maxBytes / (1024 * 1024))}MB`);
        return;
      }
    }

    setOversize(false);
    clearError();

    // count enforcement (keep existing urls + new files)
    if (isImgMode) {
      const existingUrls = media.type === "image" ? media.urls : [];
      const existingPreviews = media.type === "image" ? media.previews : [];
      const existingFiles = media.type === "image" ? media.files : [];

      const remaining = Math.max(
        0,
        imageLimit - (existingUrls.length + existingFiles.length),
      );
      const take = files.slice(0, remaining);

      const previews = await Promise.all(take.map(fileToDataUrl));

      setMedia({
        type: "image",
        urls: existingUrls,
        files: [...existingFiles, ...take],
        previews: [...existingPreviews, ...previews],
      });
      return;
    }

    if (isVidMode) {
      const existingUrls = media.type === "video" ? media.urls : [];
      const existingPreviews = media.type === "video" ? media.previews : [];
      const existingFiles = media.type === "video" ? media.files : [];

      const remaining = Math.max(
        0,
        videoLimit - (existingUrls.length + existingFiles.length),
      );
      const take = files.slice(0, remaining);

      const previews = await Promise.all(take.map(fileToDataUrl));

      setMedia({
        type: "video",
        urls: existingUrls,
        files: [...existingFiles, ...take],
        previews: [...existingPreviews, ...previews],
      });
      return;
    }
  };

  const showImage = allowedTypes.includes("image");
  const showVideo = allowedTypes.includes("video");
  const showYoutube = allowedTypes.includes("youtube");
  const showNone = allowedTypes.includes("none");

  return (
    <div className="rounded-xl bg-white border border-black/10 p-4">
      <div className="text-sm font-semibold text-[#111]">
        Media
      </div>

      <div className="mt-3 grid grid-cols-2 xl:grid-cols-4 xl:items-center gap-2">
        {showImage ? (
          <button
            type="button"
            onClick={() => {
              setMediaType("image");
              setMedia({
                type: "image",
                urls: [],
                files: [],
                previews: [],
              });
              setOversize(false);
              clearError();
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold border",
              mediaType === "image"
                ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                : "bg-white border-black/10 text-black/60 hover:bg-black/5",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Image
            </span>
          </button>
        ) : null}

        {showVideo ? (
          <button
            type="button"
            onClick={() => {
              setMediaType("video");
              setMedia({
                type: "video",
                urls: [],
                files: [],
                previews: [],
              });
              setOversize(false);
              clearError();
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold border",
              mediaType === "video"
                ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                : "bg-white border-black/10 text-black/60 hover:bg-black/5",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <VideoIcon className="h-4 w-4" /> Video
            </span>
          </button>
        ) : null}

        {showYoutube ? (
          <button
            type="button"
            onClick={() => {
              setMediaType("youtube");
              setOversize(false);
              clearError();
              setMedia({ type: "youtube", ytIds: [] });
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold border",
              mediaType === "youtube"
                ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                : "bg-white border-black/10 text-black/60 hover:bg-black/5",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Youtube className="h-4 w-4" /> YouTube
            </span>
          </button>
        ) : null}

        {showNone ? (
          <button
            type="button"
            onClick={() => {
              setMediaType("none");
              hardResetMedia();
            }}
            className={cn(
              "ml-auto rounded-full px-3 py-1.5 text-[12px] font-semibold border",
              mediaType === "none"
                ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                : "bg-white border-black/10 text-black/60 hover:bg-black/5",
            )}
          >
            No Media Required
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        {mediaType === "image" || mediaType === "video" ? (
          <div className="rounded-xl border border-black/10 bg-[#F7F7F7] p-3 space-y-3">
            <p className="text-sm text-black/60">
              {mediaType === "image"
                ? "Only PNG, JPG, or JPEG images are allowed (Max 20 MB)."
                : VIDEO_UPLOAD_HELPER_TEXT}
            </p>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (
                    !(
                      mediaType === "video" &&
                      media.type === "video" &&
                      media.previews?.[0]
                    )
                  ) {
                    openFileDialog();
                  }
                }
              }}
              className="h-[170px] rounded-xl overflow-hidden flex items-center justify-center bg-green-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#78BC61]"
              onClick={() => {
                if (
                  mediaType === "video" &&
                  media.type === "video" &&
                  media.previews?.[0]
                ) {
                  return;
                }
                openFileDialog();
              }}
            >
              {mediaType === "image" &&
              media.type === "image" &&
              media.previews[0] ? (
                <img
                  src={media.previews[0]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}

              {mediaType === "video" &&
              media.type === "video" &&
              media.previews[0] ? (
                <video
                  src={media.previews[0]}
                  controls
                  muted
                  playsInline
                  autoPlay
                  className="h-full w-full object-cover"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}

              {!media ||
              media.type === "none" ||
              (media.type !== "image" && media.type !== "video") ||
              !media.previews?.[0] ? (
                <div className="text-xs text-green-700 inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {mediaType === "image" ? "Upload an image" : "Upload a video"}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {(media.type === "image" && media.previews[0]) ||
              (media.type === "video" && media.previews[0]) ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openFileDialog}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      hardResetMedia();
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : null}
            </div>

            {errorText ? (
              <p className="mt-2 text-xs text-red-600">{errorText}</p>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              multiple={false}
              accept={mediaType === "image" ? "image/*" : VIDEO_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files ? Array.from(e.target.files) : [];
                onPickFiles(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : null}

        {mediaType === "youtube" ? (
          <div className="rounded-xl border border-black/10 bg-[#F7F7F7] p-3">
            <Label>YouTube URL or Video ID</Label>
            <Input
              className="mt-2"
              placeholder="Paste a YouTube link or 11-char ID"
              value={youtubeDraft || ""}
              onChange={(e) => {
                const v = e.target.value;
                setYoutubeDraft(v);
                const id = extractYouTubeId(v);
                setMedia({ type: "youtube", ytIds: id ? [id] : [] });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
