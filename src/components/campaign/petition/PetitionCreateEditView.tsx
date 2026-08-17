import { cn } from "@/lib/utils";
import { ArrowLeft, FileText, X } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useCallback, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CountrySelect from "@/components/commons/selects/country-select";
import { Button } from "@/components/ui/button";

import {
  BaseOption,
  PetitionForm,
  safeArr,
  extractYouTubeId,
  type MediaState,
  type MediaType,
} from "@/types/petition";
import { RichTextReadOnly } from "@/components/commons/editor/preview";
import { MAX_BLOG_EXTERNAL_LINKS } from "@/utils/external-links";
import { ImageSlot } from "@/components/campaign/petition/CampaignImageSlot";
import EasyReactCropper from "@/components/commons/image-cropper";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";
import { cropImage, type CropRect } from "@/utils/media/cropImage";
import { COMPRESS_QUALITY } from "@/utils/media/compressImage";
import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
  isAcceptedVideoUploadFile,
} from "@/utils/media/video-upload.constants";
import { fileToDataUrl } from "@/utils/fileToDataUrl";

const PETITION_MAX_IMAGE_MB = 20;
const PETITION_MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
const CROP_VIEW_W = 600;
const CROP_VIEW_H = 300;
const MAX_IMAGE_BYTES = PETITION_MAX_IMAGE_MB * 1024 * 1024;
const MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"] as const;
const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp,image/gif";


export function PetitionCreateEditView({
  saving,
  onBack,
  form,
  countryOpts,
  onCountriesChange,
  externalLinks,
  addLink,
  removeLinkAt,
  mediaType,
  setMediaType,
  media,
  setMedia,
  mediaErrorText,
  clearMediaError,
  setMediaErrorText,
  setMediaOversize,
  ytDraft,
  setYtDraft,
  descVal,
  onDeleteClick,
  onSaveClick,
  saveDisabledWhenNoChanges = false,
}: {
  saving: boolean;
  onBack: () => void;
  form: UseFormReturn<PetitionForm>;
  countryOpts: BaseOption[];
  onCountriesChange: (opts: BaseOption[]) => void;
  externalLinks: string[];
  addLink: () => void;
  removeLinkAt: (idx: number) => void;
  mediaType: MediaType;
  setMediaType: (t: MediaType) => void;
  media: MediaState;
  setMedia: (m: MediaState) => void;
  mediaErrorText: string | null;
  clearMediaError: () => void;
  setMediaErrorText: (msg: string) => void;
  setMediaOversize: (v: boolean) => void;
  ytDraft: string;
  setYtDraft: (v: string) => void;
  descVal: string;
  onDeleteClick: () => void;
  onSaveClick: () => void;
  /** When true, Save is disabled (e.g. edit page: no changes yet). */
  saveDisabledWhenNoChanges?: boolean;
}) {
  const [countryPickerKey, setCountryPickerKey] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(null);
  const pickedFileRef = useRef<File | null>(null);
  const cropAreaRef = useRef<unknown>(null);
  const dragCounterRef = useRef(0);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const imagePreviewUrl =
    media.type === "image" ? (media.previews?.[0] ?? media.urls?.[0] ?? null) : null;
  const videoPreviewUrl =
    media.type === "video" ? (media.previews?.[0] ?? media.urls?.[0] ?? null) : null;

  const revokeBlob = useCallback((url: string | null) => {
    if (url?.startsWith("blob:")) try {
      URL.revokeObjectURL(url);
    } catch {}
  }, []);

  const removeImage = useCallback(() => {
    const m = media as { type: string; urls?: string[] };
    if (m.type === "image" && m.urls?.[0]?.startsWith("blob:")) revokeBlob(m.urls[0]);
    setMedia({ type: "none" });
    setMediaType("none");
    pickedFileRef.current = null;
    cropAreaRef.current = null;
    if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
    setCropperImageUrl(null);
    clearMediaError();
  }, [media, cropperImageUrl, revokeBlob, setMedia, setMediaType, clearMediaError]);

  const removeVideo = useCallback(() => {
    const m = media as { type: string; urls?: string[] };
    if (m.type === "video" && m.urls?.[0]?.startsWith("blob:")) revokeBlob(m.urls[0]);
    setMedia({ type: "none" });
    setMediaType("none");
    clearMediaError();
  }, [media, revokeBlob, setMedia, setMediaType, clearMediaError]);

  const openImagePicker = () => fileRef.current?.click();
  const openVideoPicker = () => videoRef.current?.click();

  const applyImage = useCallback(
    async (file: File) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[0])) {
        setMediaErrorText("Only JPG, PNG, JPEG, WEBP, and GIF are allowed");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setMediaOversize(true);
        setMediaErrorText(`Image is over ${PETITION_MAX_IMAGE_MB} MB. Max allowed is ${PETITION_MAX_IMAGE_MB} MB.`);
        return;
      }
      removeVideo();
      clearMediaError();
      setMediaOversize(false);
      setMediaType("image");
      setYtDraft("");
      const m = media as { type: string; urls?: string[] };
      if (m.type === "image" && m.urls?.[0]) revokeBlob(m.urls[0]);
      pickedFileRef.current = file;
      if (file.type === "image/gif") {
        const dataUrl = await fileToDataUrl(file);
        setMedia({ type: "image", files: [file], urls: [dataUrl], previews: [dataUrl] });
        return;
      }
      cropAreaRef.current = null;
      const blobUrl = URL.createObjectURL(file);
      setCropperImageUrl(blobUrl);
      const dataUrl = await fileToDataUrl(file);
      setMedia({ type: "image", files: [file], urls: [dataUrl], previews: [dataUrl] });
    },
    [media, removeVideo, revokeBlob, setMedia, setMediaType, setYtDraft, clearMediaError, setMediaErrorText, setMediaOversize],
  );

  const onImgDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      await applyImage(file);
    },
    [applyImage],
  );

  const handleSaveCrop = useCallback(async () => {
    if (!cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as CropRect | null | undefined;
    if (!area || typeof area.x !== "number") return;
    const file = pickedFileRef.current;
    try {
      const { file: croppedFile } = await cropImage(cropperImageUrl, area, {
        mime: file?.type,
        fileName: "petition-cover",
        quality: COMPRESS_QUALITY,
      });
      if (!croppedFile) return;
      cropAreaRef.current = area;
      const previewUrl = URL.createObjectURL(croppedFile);
      const m = media as { type: string; urls?: string[] };
      if (m.type === "image" && m.urls?.[0]) revokeBlob(m.urls[0]);
      setMedia({ type: "image", files: [croppedFile], urls: [previewUrl], previews: [previewUrl] });
    } catch (err) {
      console.error(err);
    } finally {
      if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
      setCropperImageUrl(null);
    }
  }, [cropperImageUrl, media, revokeBlob, setMedia]);

  const closeCropper = useCallback(() => {
    if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
    setCropperImageUrl(null);
  }, [cropperImageUrl, revokeBlob]);

  const onMediaTypeChange = useCallback(
    (next: MediaType) => {
      if (next === mediaType) return;
      setMediaType(next);
      clearMediaError();
      setMediaOversize(false);
      if (next === "none") setMedia({ type: "none" });
      // Do not clear image/video/youtube when switching tab — only clear when adding other type
    },
    [mediaType, setMediaType, setMedia, clearMediaError, setMediaOversize],
  );

  const onVideoFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!isAcceptedVideoUploadFile(file)) {
        setMediaErrorText("Use MP4, MOV, WEBM, MKV, AVI, or M4V.");
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setMediaOversize(true);
        setMediaErrorText(`Video is over ${PETITION_MAX_VIDEO_MB} MB. Max allowed is ${PETITION_MAX_VIDEO_MB} MB.`);
        return;
      }
      removeImage();
      clearMediaError();
      setMediaOversize(false);
      setMediaType("video");
      setYtDraft("");
      const m = media as { type: string; urls?: string[] };
      if (m.type === "video" && m.urls?.[0]?.startsWith("blob:")) revokeBlob(m.urls[0]);
      const blobUrl = URL.createObjectURL(file);
      setMedia({ type: "video", files: [file], urls: [blobUrl], previews: [blobUrl] });
    },
    [media, removeImage, revokeBlob, setMedia, setMediaType, setYtDraft, clearMediaError, setMediaErrorText, setMediaOversize],
  );

  const mediaWithUrls = media as { type: string; urls?: string[]; files?: File[] };
  const hasImage = mediaWithUrls.type === "image" && (!!mediaWithUrls.urls?.[0] || !!mediaWithUrls.files?.[0]);
  const hasVideo = mediaWithUrls.type === "video" && (!!mediaWithUrls.urls?.[0] || !!mediaWithUrls.files?.[0]);
  const hasYoutube = !!(ytDraft && String(extractYouTubeId(ytDraft) ?? "").trim());
  const hasMultipleMedia = [hasImage, hasVideo, hasYoutube].filter(Boolean).length > 1;

  return (
        <div className="p-4 min-h-screen">
          <div className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl bg-white border border-black/10 px-2 py-2 hover:bg-black/5"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-lg font-semibold text-[#111]">
                    Edit Petition
                  </div>
                  <div className="text-xs text-black/50">
                    Name and description are locked. You can edit links, countries and media.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDeleteClick}
                  className="rounded-full border border-red-200 bg-white text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50"
                >
                  Delete
                </button>

                <button
                  type="button"
                  disabled={saving || hasMultipleMedia || saveDisabledWhenNoChanges || form.formState.isSubmitting}
                  onClick={onSaveClick}
                  className={cn(
                    "rounded-full bg-[#0EA5A5] text-white px-5 py-2 text-sm font-semibold hover:bg-[#0b8f8f]",
                    "disabled:opacity-60 disabled:cursor-not-allowed" 
                  )}
                >
                  {saving || form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <header className="flex items-center justify-between">
                    <h2 className="font-semibold text-[#111]">Petition name <span className="text-red-500">*</span></h2>
                    <p className="text-gray-500 text-sm">Max 30 characters</p>
                  </header>
                  <Input
                    disabled
                    {...form.register("name")}
                    placeholder="Enter petition name"
                    className="bg-white"
                  />
                  {form.formState.errors.name?.message ? (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  ) : null}
                </div> 
                <div className="space-y-2">
                  <h2 className="font-semibold text-[#111]">Countries</h2>
                  <CountrySelect
                    key={countryPickerKey}
                    placeholder="Select countries"
                    onChange={(opt: any) => {
                      if (!opt?.value) return;

                      const cur = safeArr(countryOpts);
                      const exists = cur.some(
                        (c) => String(c.value) === String(opt.value),
                      );
 
                      if (exists) {
                        setCountryPickerKey((k) => k + 1);
                        return;
                      }

                      const next: BaseOption[] = [
                        ...cur,
                        {
                          value: String(opt.value),
                          label: String(opt.label || opt.value),
                        },
                      ];

                      onCountriesChange(next);

                      // clear picker so next country can be selected
                      setCountryPickerKey((k) => k + 1);
                    }}
                    selectProps={{
                      isClearable: true,
                      menuPortalTarget: document.body,
                      isDisabled: true,
                    }}
                  />
 
                  {safeArr(countryOpts).length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {safeArr(countryOpts).map((c) => (
                        <div
                          key={String(c.value)}
                          className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-3 py-1 text-xs"
                        >
                          <span className="font-semibold text-[#111]">
                            {String(c.label || c.value)}
                          </span>

                          <span className="text-black/30">•</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl bg-white border border-black/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#111]">
                      External Links
                    </div>
                    <button
                      type="button"
                      onClick={addLink}
                      disabled={safeArr(externalLinks).length >= 3}
                      className={cn(
                        "rounded-full bg-[#E4F2DF] px-3 py-1 text-[11px] font-semibold text-[#315326]",
                        safeArr(externalLinks).length >= 3
                          ? "opacity-60 cursor-not-allowed"
                          : "",
                      )}
                    >
                      + Add Link
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {safeArr(externalLinks).length === 0 ? (
                      <div className="text-xs text-black/50">
                        Add up to 3 links.
                      </div>
                    ) : null}

                    {safeArr(externalLinks)
                      .slice(0, 3)
                      .map((_, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-2"
                        >
                          <span className="flex w-full">
                            <Input
                              placeholder="https://example.com"
                              value={String(externalLinks[idx] ?? "")}
                              onChange={(e) => {
                                const next = safeArr(externalLinks).slice(
                                  0,
                                  MAX_BLOG_EXTERNAL_LINKS,
                                );
                                next[idx] = e.target.value;
                                form.setValue("externalLinks", next, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                });
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => removeLinkAt(idx)}
                              className="rounded-lg p-2 hover:bg-black/5"
                              title="Remove link"
                            >
                              <X className="h-4 w-4 text-black/60" />
                            </button>
                          </span>

                          {form.formState.errors.externalLinks?.[idx]
                            ?.message ? (
                            <p className="w-full text-xs text-red-600">
                              {String(
                                form.formState.errors.externalLinks[idx]
                                  ?.message,
                              )}
                            </p>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>
 
                <div className="rounded-xl bg-white border border-black/10 p-4">
                  <section className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="font-semibold text-[#111]">Media</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {["image", "video", "youtube", "none"]?.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onMediaTypeChange(t as MediaType)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[12px] font-semibold border",
                            mediaType === t
                              ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                              : "bg-white border-black/10 text-black/60 hover:bg-black/5",
                          )}
                        >
                          {t === "image" ? "Image" : t === "video" ? "Video" : t === "youtube" ? "YouTube" : "No Media Required"}
                        </button>
                      ))}
                    </div>
                  </section>

                  {hasMultipleMedia && (
                    <p className="mt-2 text-xs text-red-600">
                      Only one media type allowed (image, video, or YouTube). Remove others or switch tab.
                    </p>
                  )}
                  {(mediaErrorText ?? form.formState.errors?.mediaType?.message) && (
                    <p className="mt-2 text-xs text-red-600">
                      {String(mediaErrorText ?? form.formState.errors?.mediaType?.message ?? "")}
                    </p>
                  )}

                  {mediaType === "image" && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-black/60">
                        JPG, PNG, JPEG, WEBP, GIF. Max {PETITION_MAX_IMAGE_MB} MB.
                      </p>
                      <div
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dragCounterRef.current += 1;
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
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = "copy";
                          setDragOver(true);
                        }}
                        onDrop={onImgDrop}
                        className={cn(
                          "relative rounded-xl transition-all",
                          dragOver && "ring-2 ring-[#78BC61] ring-dashed",
                        )}
                      >
                        <ImageSlot
                          size="big"
                          value={imagePreviewUrl ?? null}
                          onPick={openImagePicker}
                          onRemove={removeImage}
                        />
                        {dragOver && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs">Drop to upload</span>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPT_IMAGE}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) applyImage(f);
                          e.currentTarget.value = "";
                        }}
                      />
                      {cropperImageUrl && (
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
                    </div>
                  )}

                  {mediaType === "video" && (
                    <div className="mt-3">
                      <p className="text-sm text-black/60 mb-2">
                        {VIDEO_UPLOAD_HELPER_TEXT}
                      </p>
                      <MediaDropzone
                        accept={VIDEO_UPLOAD_ACCEPT}
                        onFiles={(files) => {
                          const f = files[0];
                          if (f) onVideoFile(f);
                        }}
                        onPickClick={openVideoPicker}
                        className={cn(
                          "rounded-xl border border-black/10 p-3",
                          !videoPreviewUrl && "min-h-[170px]",
                        )}
                      >
                        <div
                          className={cn("flex-1", !videoPreviewUrl && "flex min-h-[170px]")}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {videoPreviewUrl ? (
                            <div>
                              <video
                                src={videoPreviewUrl}
                                playsInline
                                controls
                                muted
                                className="w-full rounded-lg h-[200px] object-cover bg-black/5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeVideo();
                                }}
                                className="mt-2"
                              >
                                Remove
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVideoPicker();
                                }}
                                className="mt-2 ml-2"
                              >
                                Replace video
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openVideoPicker();
                              }}
                              className="w-full min-h-[170px] rounded-lg border border-dashed border-black/15 px-3 py-6 flex items-center justify-center"
                            >
                              <div className="flex items-center gap-2 text-xs text-[#315326]">
                                <FileText className="h-4 w-4 text-[#78BC61]" />
                                <span>+ Upload video ({PETITION_MAX_VIDEO_MB} MB max)</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </MediaDropzone>
                      <input
                        ref={videoRef}
                        type="file"
                        accept={VIDEO_UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          onVideoFile(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  )}

                  {mediaType === "youtube" && (
                    <div className="mt-3 rounded-xl border border-black/10 bg-[#F7F7F7] p-3">
                      <Label>YouTube URL or Video ID</Label>
                      <Input
                        className="mt-2"
                        placeholder="Paste a YouTube link or 11-char ID"
                        value={ytDraft}
                        onChange={(e) => {
                          const v = e.target.value;
                          setYtDraft(v);
                          const id = extractYouTubeId(v);
                          if (id) {
                            const m = media as { type: string; urls?: string[] };
                            if (m.type === "image" && m.urls?.[0]?.startsWith("blob:")) revokeBlob(m.urls[0]);
                            if (m.type === "video" && m.urls?.[0]?.startsWith("blob:")) revokeBlob((media as { urls?: string[] }).urls?.[0] ?? null);
                            setMedia({ type: "youtube", ytIds: [id] });
                            setMediaType("youtube");
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-black/50">
                  <h2 className="font-semibold text-[#111]">Description <span className="text-red-500">*</span></h2>
                  <p className="text-gray-500 text-sm">
                    {/* {Math.min(2000, String(descVal ?? "").length)}/2000 */}
                    Max 12000 characters
                  </p>
                </div>

                <RichTextReadOnly html={String(descVal || "")} />

                {form.formState.errors.description?.message ? (
                  <p className="text-xs text-red-600">
                    {String(form.formState.errors.description.message)}
                  </p>
                ) : null}
              </div>
            </div>

          </div>
        </div>
  );
}
