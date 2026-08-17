import { useEffect, useRef, useState } from "react";
import { X, FileText, Plus, Video, Youtube, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addPollModalZ,
  type AddPollModalValues,
  type PollResourceAsset,
} from "@/schema/campaign.schemas";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { TipTap } from "../commons/editor/tiptap";
import { extractYouTubeId, getYouTubeThumbnailUrl } from "@/types/petition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EasyReactCropper from "@/components/commons/image-cropper";
import { cropImage, type CropRect } from "@/utils/media/cropImage";
import { COMPRESS_QUALITY } from "@/utils/media/compressImage";
import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
  isAcceptedVideoUploadFile,
} from "@/utils/media/video-upload.constants";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

const POLL_MAX_IMAGE_MB = 20;
const POLL_MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
const POLL_MAX_IMAGE_BYTES = POLL_MAX_IMAGE_MB * 1024 * 1024;
const POLL_MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;
const MAX_RESOURCE_ASSETS = 20;
const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp,image/gif";
const CROP_VIEW_W = 600;
const CROP_VIEW_H = 300;

function previewUrl(v: string | File | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  return URL.createObjectURL(v);
}

export default function AddPollModal({
  onSaved,
  initialPoll,
  mediaOnly = false,
  saving = false,
}: {
  onClose: () => void;
  onSaved: (poll: any) => void;
  initialPoll?: {
    id: string;
    pollName: string;
    pollDescription: string;
    resourceAssets: PollResourceAsset[];
    options: string[];
  } | null;
  /** When true, only resource assets (media) are editable; name, description, options are readonly */
  mediaOnly?: boolean;
  /** When true, external save (e.g. media upload/PATCH) is in progress; disables Save button */
  saving?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(null);
  const pickedFileRef = useRef<File | null>(null);
  const pendingImageIndexRef = useRef<number>(-1);
  const dragCounterRef = useRef(0);

  const [cropUIOpen, setCropUIOpen] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeInputValue, setYoutubeInputValue] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    reset,
    trigger,
    setError,
    clearErrors,
    control,
    formState: { errors, isValid, isSubmitting },
  } = useForm<AddPollModalValues>({
    mode: "onChange",
    resolver: zodResolver(addPollModalZ),
    defaultValues: {
      pollName: "",
      pollDescription: "",
      resourceAssets: [],
      options: ["", ""],
    },
  });

  useEffect(() => {
    if (!initialPoll) return;
    reset({
      pollName: initialPoll.pollName ?? "",
      pollDescription: initialPoll.pollDescription ?? "",
      resourceAssets: (initialPoll.resourceAssets ?? []).map((a) => ({
        type: a.type,
        value: a.value,
      })),
      options:
        initialPoll.options?.length >= 2
          ? initialPoll.options
          : [...(initialPoll.options ?? []), "", ""].slice(0, 4),
    });
    // Show validation errors immediately for prefilled invalid values.
    void trigger();
  }, [initialPoll, reset, trigger]);

  const { fields: assetFields, append: appendAsset, remove: removeAsset } = useFieldArray({
    control,
    name: "resourceAssets",
  });

  const options = watch("options") ?? ["", ""];
  const appendOption = () => {
    if (options.length >= 4) return;
    setValue("options", [...options, ""], { shouldDirty: true, shouldValidate: true });
  };
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setValue(
      "options",
      options.filter((_, i) => i !== idx),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const resourceAssets = (watch("resourceAssets") ?? []) as PollResourceAsset[];

  const addImage = () => fileRef.current?.click();
  const addVideo = () => videoRef.current?.click();

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    if (resourceAssets.length >= MAX_RESOURCE_ASSETS) return;
    if (!file.type.startsWith("image/") && !ACCEPT_IMAGE.includes(file.type)) {
      setError("resourceAssets", { type: "manual", message: "Only JPG, PNG, WEBP, GIF allowed" });
      return;
    }
    if (file.size > POLL_MAX_IMAGE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("resourceAssets", {
        type: "manual",
        message: `Image is ${mb} MB. Max ${POLL_MAX_IMAGE_MB} MB per image.`,
      });
      return;
    }
    clearErrors("resourceAssets");
    if (file.type === "image/gif") {
      const dataUrl = await fileToDataUrl(file);
      appendAsset({ type: "image", value: dataUrl });
      return;
    }
    pickedFileRef.current = file;
    pendingImageIndexRef.current = resourceAssets.length;
    const dataUrl = await fileToDataUrl(file);
    appendAsset({ type: "image", value: dataUrl });
    const blobUrl = URL.createObjectURL(file);
    setCropperImageUrl(blobUrl);
    setCropUIOpen(true);
  };

  const handleSaveCrop = async () => {
    if (!cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as CropRect | null | undefined;
    if (!area || typeof area.x !== "number") return;
    const file = pickedFileRef.current;
    const idx = pendingImageIndexRef.current;
    try {
      const { file: croppedFile } = await cropImage(cropperImageUrl, area, {
        mime: file?.type,
        fileName: "poll-image",
        quality: COMPRESS_QUALITY,
      });
      const next = [...(watch("resourceAssets") ?? [])] as PollResourceAsset[];
      if (idx >= 0 && idx < next.length && next[idx]?.type === "image") {
        next[idx] = { ...next[idx], value: croppedFile };
        setValue("resourceAssets", next, { shouldDirty: true, shouldValidate: true });
      }
      clearErrors("resourceAssets");
    } catch (err) {
      console.error(err);
    } finally {
      if (cropperImageUrl?.startsWith("blob:")) URL.revokeObjectURL(cropperImageUrl);
      setCropperImageUrl(null);
      setCropUIOpen(false);
    }
  };

  const closeCropper = () => {
    if (cropperImageUrl?.startsWith("blob:")) URL.revokeObjectURL(cropperImageUrl);
    setCropperImageUrl(null);
    setCropUIOpen(false);
  };

  const onPickVideo = (file: File | null) => {
    if (!file) return;
    if (resourceAssets.length >= MAX_RESOURCE_ASSETS) return;
    if (!isAcceptedVideoUploadFile(file)) {
      setError("resourceAssets", {
        type: "manual",
        message: "Use MP4, MOV, WEBM, MKV, AVI, or M4V.",
      });
      return;
    }
    if (file.size > POLL_MAX_VIDEO_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("resourceAssets", {
        type: "manual",
        message: `Video is ${mb} MB. Max ${POLL_MAX_VIDEO_MB} MB per video.`,
      });
      return;
    }
    clearErrors("resourceAssets");
    appendAsset({ type: "video", value: file });
  };

  const addYoutube = () => {
    const id = extractYouTubeId(youtubeInputValue);
    if (!id) {
      setYoutubeError("Enter a valid YouTube URL or 11-char video ID");
      return;
    }
    if (resourceAssets.length >= MAX_RESOURCE_ASSETS) {
      setYoutubeError(`Max ${MAX_RESOURCE_ASSETS} assets allowed`);
      return;
    }
    setYoutubeError(null);
    appendAsset({ type: "youtube", value: youtubeInputValue.trim() });
    setYoutubeInputValue("");
    setShowYoutubeInput(false);
  };

  const onSave = async () => {
    if (mediaOnly) {
      const v = {
        id: initialPoll?.id ?? uid(),
        pollName: watch("pollName"),
        pollDescription: watch("pollDescription"),
        resourceAssets: (watch("resourceAssets") ?? []) as PollResourceAsset[],
        options: watch("options"),
      };
      onSaved(v);
      return;
    }
    const ok = await trigger();
    if (!ok) return;
    const v = {
      id: initialPoll?.id ?? uid(),
      pollName: watch("pollName"),
      pollDescription: watch("pollDescription"),
      resourceAssets: (watch("resourceAssets") ?? []) as PollResourceAsset[],
      options: watch("options"),
    };
    onSaved(v);
  };

  useEffect(() => {
    if (options.length === 0) {
      setValue("options", ["", ""], {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [options.length, setValue]);

  return (
    <div className="w-[520px] max-w-full rounded-[28px] bg-white p-6 shadow-xl relative overflow-y-auto max-h-[90vh]">
      <div className="space-y-4">
        <div>
          <div className="text-[#7A7A7A] mb-2">Poll name</div>
          {mediaOnly ? (
            <p className="rounded-lg bg-[#F5F5F5] border border-black/10 px-4 py-3 text-sm text-[#111]">
              {watch("pollName") || "—"}
            </p>
          ) : (
            <input
              className={cn(
                "w-full rounded-lg bg-white border px-4 py-3 text-sm outline-none",
                errors.pollName ? "border-red-300" : "border-black/10",
              )}
              placeholder="Cost of Living Pulse"
              {...register("pollName")}
            />
          )}
          {errors.pollName?.message && (
            <p className="mt-2 text-xs text-red-600">{errors.pollName.message}</p>
          )}
        </div>

        <div>
          <div className="text-[#7A7A7A] mb-2">Poll Description</div>
          {mediaOnly ? (
            <div
              className="rounded-lg bg-[#F5F5F5] border border-black/10 px-4 py-3 text-sm text-[#111] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: watch("pollDescription") || "<p>—</p>",
              }}
            />
          ) : (
            <div
              className={cn(
                errors.pollDescription ? "border-red-300" : "border-black/10",
              )}
            >
              <Controller
                control={control}
                name="pollDescription"
                render={({ field }) => (
                  <TipTap
                    description={field.value || ""}
                    onChange={(next) => field.onChange(next)}
                  />
                )}
              />
            </div>
          )}
          {errors.pollDescription?.message && (
            <p className="mt-2 text-xs text-red-600">
              {errors.pollDescription.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#7A7A7A]">Resource assets (max {MAX_RESOURCE_ASSETS})</span>
            <span className="text-[11px] text-[#7A7A7A]">
              Image {POLL_MAX_IMAGE_MB} MB · {VIDEO_UPLOAD_HELPER_TEXT}
            </span>
          </div>

          <div
            className={cn(
              "relative rounded-xl border border-black/10 bg-[#FAFAFA] p-3 space-y-3 transition-all",
              dragOver && "ring-2 ring-[#78BC61] ring-dashed"
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current++;
              if (e.dataTransfer?.types?.includes("Files")) setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
              if (dragCounterRef.current === 0) setDragOver(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDragOver(true);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              const file = e.dataTransfer?.files?.[0];
              if (!file) return;
              if (file.type.startsWith("image/")) await onPickImage(file);
              else if (isAcceptedVideoUploadFile(file)) onPickVideo(file);
            }}
          >
            {assetFields.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {assetFields.map((field, idx) => {
                  const asset = resourceAssets[idx] as PollResourceAsset | undefined;
                  if (!asset) return null;
                  return (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 rounded-lg bg-white border border-black/10 p-2"
                    >
                      <div className="shrink-0 w-12 h-10 rounded overflow-hidden bg-black/5 flex items-center justify-center">
                        {asset.type === "image" && (
                          <img
                            src={previewUrl(asset.value as string | File) ?? ""}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        {asset.type === "video" && (() => {
                          const src = typeof asset.value === "string"
                            ? asset.value
                            : asset.value instanceof File
                              ? URL.createObjectURL(asset.value)
                              : null;
                          return src ? (
                            <video
                              src={src}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Video className="h-5 w-5 text-[#315326]" />
                          );
                        })()}
                        {asset.type === "youtube" && (() => {
                          const thumb = getYouTubeThumbnailUrl(String(asset.value));
                          return thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Youtube className="h-5 w-5 text-red-600" />
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-[#5E6366] capitalize">
                          {asset.type}
                        </span>
                        {asset.type === "youtube" && (
                          <p className="text-xs text-[#7A7A7A] truncate">
                            {String(asset.value).slice(0, 40)}…
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(idx)}
                        className="shrink-0 p-1 rounded hover:bg-black/5 text-red-500"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addImage();
                }}
                disabled={resourceAssets.length >= MAX_RESOURCE_ASSETS}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold border border-black/10 inline-flex items-center gap-1.5",
                  resourceAssets.length >= MAX_RESOURCE_ASSETS
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-white text-[#315326] hover:bg-[#E4F2DF]",
                )}
              >
                <FileText className="h-3.5 w-3.5" />+ Add image
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addVideo();
                }}
                disabled={resourceAssets.length >= MAX_RESOURCE_ASSETS}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold border border-black/10 inline-flex items-center gap-1.5",
                  resourceAssets.length >= MAX_RESOURCE_ASSETS
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-white text-[#315326] hover:bg-[#E4F2DF]",
                )}
              >
                <Video className="h-3.5 w-3.5" />+ Add video
              </button>
              {!showYoutubeInput ? (
                <button
                  type="button"
                  onClick={() => setShowYoutubeInput(true)}
                  disabled={resourceAssets.length >= MAX_RESOURCE_ASSETS}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold border border-black/10 inline-flex items-center gap-1.5",
                    resourceAssets.length >= MAX_RESOURCE_ASSETS
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-white text-[#315326] hover:bg-[#E4F2DF]",
                  )}
                >
                  <Youtube className="h-3.5 w-3.5" />+ Add YouTube
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    placeholder="YouTube link or ID (e.g. RSeXGH2kxdo)"
                    value={youtubeInputValue}
                    onChange={(e) => {
                      setYoutubeInputValue(e.target.value);
                      setYoutubeError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addYoutube())}
                    className="w-[200px] h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addYoutube}
                    className="rounded-full bg-[#E4F2DF] px-3 py-1.5 text-[12px] font-medium text-[#315326]"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowYoutubeInput(false);
                      setYoutubeInputValue("");
                      setYoutubeError(null);
                    }}
                    className="text-[12px] text-[#7A7A7A] hover:text-[#111]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

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
                  <Button type="button" variant="outline" onClick={closeCropper}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveCrop}>
                    Apply Crop
                  </Button>
                </div>
              </div>
            )}

            {dragOver && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs">
                  Drop to upload
                </span>
              </div>
            )}

            {showYoutubeInput && youtubeError && (
              <p className="text-xs text-red-600">{youtubeError}</p>
            )}
            {(errors as any).resourceAssets?.message && (
              <p className="text-xs text-red-600">
                {(errors as any).resourceAssets.message}
              </p>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_IMAGE}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              onPickImage(f);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={videoRef}
            type="file"
            accept={VIDEO_UPLOAD_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              onPickVideo(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[#7A7A7A]">Min. 2 options are required</div>
          {!mediaOnly && (
            <button
              type="button"
              onClick={appendOption}
              disabled={options.length >= 4}
              className={cn(
                "rounded-full bg-[#E4F2DF] px-3 py-1 font-medium text-[#315326] inline-flex items-center gap-2",
                options.length >= 4 ? "opacity-60 cursor-not-allowed" : "",
              )}
            >
              <Plus className="h-3 w-3" /> Add options
            </button>
          )}
        </div>

        <div className="space-y-3">
          {options.map((_, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[11px] text-[#7A7A7A]">Option {idx + 1}</div>
              <div className="flex gap-2">
                {mediaOnly ? (
                  <p className="flex-1 rounded-lg bg-[#F5F5F5] border border-black/10 px-4 py-3 text-sm text-[#111]">
                    {options[idx] || "—"}
                  </p>
                ) : (
                  <>
                    <input
                      className={cn(
                        "w-full rounded-lg bg-white border px-4 py-3 text-sm outline-none",
                        (errors.options as any)?.[idx]?.message
                          ? "border-red-300"
                          : "border-black/10",
                      )}
                      placeholder="Sample name"
                      {...register(`options.${idx}` as const)}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="rounded-lg border border-black/10 px-3 text-sm hover:bg-black/5"
                        aria-label="remove option"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
              {(errors.options as any)?.[idx]?.message && (
                <p className="text-xs text-red-600">
                  {(errors.options as any)[idx].message}
                </p>
              )}
            </div>
          ))}
          {errors.options?.message && (
            <p className="text-xs text-red-600">{errors.options.message}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting || saving || (mediaOnly ? false : !isValid)}
          className={cn(
            "w-full rounded-full bg-[#0EA5A5] text-white py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
            (mediaOnly ? false : !isValid) || isSubmitting || saving ? "opacity-70 cursor-not-allowed" : "",
          )}
        >
          {isSubmitting || saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
