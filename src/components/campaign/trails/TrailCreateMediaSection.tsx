import { RefObject } from "react";
import { cn } from "@/lib/utils";
import { Trash2, FileText, Video, Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getYouTubeThumbnailUrl } from "@/types/petition";
import type { PollResourceAsset } from "@/schema/campaign.schemas";
import { previewUrl } from "../../../utils/trail-create-utils";
import {
  TRIAL_MAX_IMAGE_MB,
  TRIAL_MAX_VIDEO_MB,
  ACCEPT_IMAGE,
  ACCEPT_VIDEO,
  CROP_VIEW_H,
  CROP_VIEW_W,
  VIDEO_HELPER_TEXT,
} from "../../../constants/trail-create-constants";
import EasyReactCropper from "@/components/commons/image-cropper";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";

export function TrailCreateMediaSection({
  canEdit,
  trialAsset,
  trialPendingType,
  trialYoutubeInput,
  trialResourceAssetsError,
  fileRef,
  videoRef,
  cropperRef,
  onRemove,
  onSelectType,
  onImagePick,
  onVideoPick,
  onYoutubeAdd,
  setTrialYoutubeInput,
  openTrialImagePicker,
  openTrialVideoPicker,
  cropUIOpen,
  cropperImageUrl,
  onSaveCrop,
  onCloseCropper,
  onImageDrop,
  dragOver,
  onDragOverChange,
  dragCounterRef,
}: {
  canEdit: boolean;
  trialAsset: PollResourceAsset | null;
  trialPendingType: "image" | "video" | "youtube";
  trialYoutubeInput: string;
  trialResourceAssetsError: string | undefined;
  fileRef: RefObject<HTMLInputElement | null>;
  videoRef: RefObject<HTMLInputElement | null>;
  cropperRef: RefObject<{ getCroppedAreaPixels: () => unknown } | null>;
  onRemove: () => void;
  onSelectType: (type: "image" | "video" | "youtube") => void;
  onImagePick: (file: File | null) => void;
  onVideoPick: (file: File | null) => void;
  onYoutubeAdd: () => void;
  setTrialYoutubeInput: (v: string) => void;
  openTrialImagePicker: () => void;
  openTrialVideoPicker: () => void;
  cropUIOpen?: boolean;
  cropperImageUrl?: string | null;
  onSaveCrop?: () => void;
  onCloseCropper?: () => void;
  onImageDrop?: (e: React.DragEvent) => void | Promise<void>;
  dragOver?: boolean;
  onDragOverChange?: (over: boolean) => void;
  dragCounterRef?: React.MutableRefObject<number>;
}) {
  return (
    <div>
      <span className="mb-2 text-[#7A7A7A]">Trail media (one only)</span>

      <div className="rounded-xl bg-white border border-black/10 p-3">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {(["image", "video", "youtube"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return;
                onSelectType(t);
                if (t === "image") fileRef.current?.click();
                if (t === "video") videoRef.current?.click();
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold border capitalize inline-flex items-center gap-1.5",
                trialAsset?.type === t
                  ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                  : trialPendingType === t
                    ? "bg-[#E4F2DF] border-[#78BC61] text-[#315326]"
                    : "bg-white border-black/10 text-black/60 hover:bg-black/5",
              )}
            >
              {t === "image" && <FileText className="h-3.5 w-3.5" />}
              {t === "video" && <Video className="h-3.5 w-3.5" />}
              {t === "youtube" && <Youtube className="h-3.5 w-3.5" />}
              {t === "image" ? "Image" : t === "video" ? "Video" : "YouTube"}
            </button>
          ))}
        </div>

        {trialAsset ? (
          <div className="rounded-xl border border-black/10 bg-[#FAFAFA] overflow-hidden">
            {trialAsset.type === "image" && (
              <div
                className={cn(
                  "relative h-[250px] transition-all",
                  dragOver && "ring-2 ring-[#78BC61] ring-dashed ring-inset"
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragCounterRef) dragCounterRef.current++;
                  if (e.dataTransfer?.types?.includes("Files")) onDragOverChange?.(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragCounterRef) dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
                  if (dragCounterRef && dragCounterRef.current === 0) onDragOverChange?.(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  onDragOverChange?.(true);
                }}
                onDrop={onImageDrop}
              >
                <img
                  src={previewUrl(trialAsset.value as string | File) ?? ""}
                  alt="Trail"
                  className="h-full w-full object-cover"
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="absolute right-2 top-2 bg-white/90 p-1 rounded-full shadow"
                    aria-label="remove"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
                {dragOver && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs">
                      Drop to replace
                    </span>
                  </div>
                )}
              </div>
            )}
            {trialAsset.type === "video" && (
              <div className="relative h-[250px]">
                <video
                  src={
                    typeof trialAsset.value === "string"
                      ? trialAsset.value
                      : previewUrl(trialAsset.value as File) ?? ""
                  }
                  controls
                  muted
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-full object-contain bg-black/5 rounded-lg"
                />
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={onRemove}
                      className="absolute right-2 top-2 bg-white/90 p-1 rounded-full shadow"
                      aria-label="remove"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTrialVideoPicker();
                      }}
                      className="absolute right-2 top-12 bg-white/90 px-2 py-1 rounded-full shadow text-[11px] font-medium"
                    >
                      Replace
                    </button>
                  </>
                )}
              </div>
            )}
            {trialAsset.type === "youtube" && (
              <div className="relative h-[250px]">
                {getYouTubeThumbnailUrl(String(trialAsset.value)) ? (
                  <img
                    src={getYouTubeThumbnailUrl(String(trialAsset.value))!}
                    alt="YouTube thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-black/5">
                    <Youtube className="h-12 w-12 text-red-600" />
                  </div>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="absolute right-2 top-2 bg-white/90 p-1 rounded-full shadow"
                    aria-label="remove"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {trialPendingType === "youtube" && (
              <div className="rounded-xl border border-black/10 bg-[#F7F7F7] p-3 space-y-2">
                <Label className="text-[#7A7A7A]">YouTube URL or Video ID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste link or 11-char ID (e.g. RSeXGH2kxdo)"
                    value={trialYoutubeInput}
                    onChange={(e) => setTrialYoutubeInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), onYoutubeAdd())
                    }
                    className="bg-white"
                  />
                  <button
                    type="button"
                    onClick={onYoutubeAdd}
                    className="rounded-full bg-[#E4F2DF] px-3 py-2 text-sm font-medium text-[#315326] shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            {trialPendingType === "image" && (
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragCounterRef) dragCounterRef.current++;
                  if (e.dataTransfer?.types?.includes("Files")) onDragOverChange?.(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragCounterRef) dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
                  if (dragCounterRef && dragCounterRef.current === 0) onDragOverChange?.(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  onDragOverChange?.(true);
                }}
                onDrop={onImageDrop}
                className={cn(
                  "relative rounded-xl transition-all",
                  dragOver && "ring-2 ring-[#78BC61] ring-dashed"
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTrialImagePicker();
                  }}
                  className="h-[250px] w-full rounded-xl border border-dashed border-black/15 flex items-center justify-center gap-2 text-sm text-[#315326]"
                >
                  <FileText className="h-5 w-5 text-[#78BC61]" />
                  + Add image (max {TRIAL_MAX_IMAGE_MB} MB)
                </button>
                {dragOver && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs">
                      Drop to upload
                    </span>
                  </div>
                )}
              </div>
            )}
            {trialPendingType === "video" && (
              <MediaDropzone
                accept={ACCEPT_VIDEO}
                onFiles={(files) => {
                  const f = files[0];
                  if (f) onVideoPick(f);
                }}
                onPickClick={openTrialVideoPicker}
                className={cn(
                  "rounded-xl border border-dashed border-black/15 min-h-[250px] flex items-center justify-center",
                  !trialAsset && "bg-[#FAFAFA]"
                )}
              >
                <div className="h-[250px] w-full flex items-center justify-center gap-2 text-sm text-[#315326]">
                  <Video className="h-5 w-5 text-[#78BC61]" />
                  + Add video ({TRIAL_MAX_VIDEO_MB} MB max)
                </div>
              </MediaDropzone>
            )}
          </>
        )}

        {cropUIOpen && cropperImageUrl && (
          <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-[#5E6366]">Crop image</p>
            <div
              className="relative w-full overflow-hidden rounded-lg bg-[#dfd7d7]"
              style={{ height: CROP_VIEW_H }}
            >
              <EasyReactCropper
                key={cropperImageUrl}
                image={cropperImageUrl}
                ref={cropperRef as any}
                width={CROP_VIEW_W}
                height={CROP_VIEW_H}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={onCloseCropper}>
                Cancel
              </Button>
              <Button type="button" onClick={onSaveCrop}>
                Apply Crop
              </Button>
            </div>
          </div>
        )}

        {trialResourceAssetsError ? (
          <p className="mt-2 text-xs text-red-600">{trialResourceAssetsError}</p>
        ) : null}

        <p className="mt-2 text-[11px] text-[#7A7A7A]">
          Image max {TRIAL_MAX_IMAGE_MB} MB · {VIDEO_HELPER_TEXT}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_IMAGE}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onImagePick(f);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept={ACCEPT_VIDEO}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onVideoPick(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
