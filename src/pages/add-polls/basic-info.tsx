import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAddPollFormStore } from "@/stores/addUserPoll.store";
import {
  ADD_POLL_PAGE_PATHS,
  type BasicInfoForm,
  basicInfoSchema,
} from "@/schema/create-user-poll";
import CreatePollLayout from "@/layouts/create-poll-layout";
import EasyReactCropper from "@/components/commons/image-cropper";
import { getCroppedImg } from "@/utils/helper";
import { TipTap } from "@/components/commons/editor/tiptap"; // <-- TipTap editor
import { fileToDataUrl } from "@/utils/fileToDataUrl";

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 2 MB

function extractYouTubeId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

  let url: URL | null = null;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

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

  return null;
}

export default function AddPollsBasicInfo() {
  const navigate = useNavigate();
  const cropperRef = useRef(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const { data, setPartial } = useAddPollFormStore();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [showYouTubeEditor, setShowYouTubeEditor] = useState(false);
  const [youtubeDraft, setYouTubeDraft] = useState("");

  const form = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: useMemo(
      () => ({
        title: data.title ?? "",
        description: data.description ?? "",
        resourceAssets: (data.resourceAssets ?? []).slice(0, 1) as any,
      }),
      [data],
    ),
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
  });

  const resourceAssets = useWatch({
    control: form.control,
    name: "resourceAssets",
  });
  const media = resourceAssets?.[0];

  const onSubmit = async (values: BasicInfoForm) => {
    const next: BasicInfoForm = { ...values };
    const m = next.resourceAssets?.[0];
    if (m?.type === "image" && m.value instanceof File) {
      const dataUrl = await fileToDataUrl(m.value);
      next.resourceAssets = [{ type: "image", value: dataUrl }] as any;
    }
    setPartial(next);
    navigate(ADD_POLL_PAGE_PATHS.options);
  };

  const onInvalid = () => {
    const first = Object.keys(form.formState.errors)[0] as
      | keyof BasicInfoForm
      | undefined;
    if (first) setTimeout(() => form.setFocus(first), 0);
  };

  const openFileDialog = () => fileRef.current?.click();

  const setImageFile = (file: File | null) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      form.setValue("resourceAssets", [], {
        shouldDirty: true,
        shouldValidate: false,
      });

      const mb = (file.size / (1024 * 1024)).toFixed(2);
      form.setError("resourceAssets" as any, {
        type: "manual",
        message: `Image is ${mb} MB. Max allowed is ${MAX_FILE_SIZE_MB} MB.`,
      });
      // Optional: nested path for UIs that read item-level errors
      form.setError("resourceAssets.0.value" as any, {
        type: "manual",
        message: `Image is ${mb} MB. Max allowed is ${MAX_FILE_SIZE_MB} MB.`,
      });
      return;
    }

    form.clearErrors("resourceAssets" as any);

    form.setValue("resourceAssets", [{ type: "image", value: file }] as any, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (showYouTubeEditor) {
      setShowYouTubeEditor(false);
      setYouTubeDraft("");
    }
  };

  const clearMedia = () => {
    form.setValue("resourceAssets", [], {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.clearErrors("resourceAssets" as any);
  };

  const addYouTubeDraft = () => {
    const id = extractYouTubeId(youtubeDraft);
    if (!id) return; // should never happen when button enabled
    form.setValue("resourceAssets", [{ type: "youtube", value: id }] as any, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowYouTubeEditor(false);
    setYouTubeDraft("");
  };

  const imagePreviewUrl = useMemo(() => {
    if (media?.type !== "image") return null;
    const v = media.value;
    if (!v) return null;
    return v instanceof File ? URL.createObjectURL(v) : String(v);
  }, [media]);

  async function handleSaveCrop(): Promise<void> {
    try {
      const area = (cropperRef.current as any)?.getCroppedAreaPixels?.();
      if (!area || !imagePreviewUrl) return;

      const currentMime =
        media?.type === "image" && media.value instanceof File
          ? media.value.type
          : undefined;

      const { file, url } = await getCroppedImg(imagePreviewUrl, area, {
        mime: currentMime,
        fileName: "poll-image-crop",
      });

      setCroppedImage((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });

      form.setValue("resourceAssets", [{ type: "image", value: file }] as any, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (err) {
      console.error("Cropping failed:", err);
    }
  }
  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const youtubeIsValid = extractYouTubeId(youtubeDraft) !== null;

  const mediaFieldError =
    (form.formState.errors.resourceAssets as any)?.[0]?.value?.message ??
    (form.formState.errors.resourceAssets as any)?.message;

  useEffect(() => {
    form.register("resourceAssets" as any);
    return () => {
      form.unregister("resourceAssets" as any);
    };
  }, [form]);

  return (
    <CreatePollLayout
      title="Creating poll"
      currentStep={1}
      totalSteps={3}
      nextLabel="Next"
      nextDisabled={
        !form.formState.isDirty ||
        !form.formState.isValid ||
        form.formState.isSubmitting
      }
      onNext={form.handleSubmit(onSubmit, onInvalid)}
    >
      <div className="space-y-6 min-h-screen h-full overflow-y-scroll">
        {/* Basic Info */}
        <section>
          <h3 className="mb-4 text-sm font-semibold text-gray-600">
            Basic Info
          </h3>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm border">
            <div className="grid gap-2">
              <Label htmlFor="title">Question</Label>
              <Input
                id="title"
                placeholder="Write your title here"
                autoComplete="off"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
                className="placeholder:text-xs"
              />
              {form.formState.errors.title && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Poll Description</Label>
              <Controller
                control={form.control}
                name="description"
                {...form.register("description")}
                render={({ field }) => (
                  <TipTap
                    description={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">
            Media (optional)
          </h3>

          <div className="rounded-xl bg-white p-4 shadow-sm border space-y-3">
            {!media && (
              <>
                {!showYouTubeEditor ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openFileDialog}
                      >
                        + Add Image
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowYouTubeEditor(true);
                          setYouTubeDraft("");
                        }}
                      >
                        + Add YouTube
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Max image size: {MAX_FILE_SIZE_MB} MB
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      <Label htmlFor="youtube-url">
                        YouTube URL or Video ID
                      </Label>
                      <Input
                        id="youtube-url"
                        placeholder="Paste a YouTube link or 11-char video ID"
                        value={youtubeDraft}
                        onChange={(e) => setYouTubeDraft(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={addYouTubeDraft}
                        disabled={!youtubeIsValid}
                        className="disabled:opacity-60"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowYouTubeEditor(false);
                          setYouTubeDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>

                    {!youtubeIsValid && youtubeDraft && (
                      <p className="text-xs text-red-600">
                        Enter a valid YouTube URL or 11-character video ID.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {media?.type === "image" && (
              <div className="space-y-2">
                {imagePreviewUrl ? (
                  <div className="overflow-hidden rounded-xl border">
                    <EasyReactCropper
                      key={imagePreviewUrl}
                      image={imagePreviewUrl}
                      ref={cropperRef}
                      width={342}
                      height={176}
                    />
                    {croppedImage && (
                      <div>
                        <h4>Trimmed Result:</h4>
                        <img
                          src={croppedImage}
                          alt="Cropped"
                          className="rounded-xl h-full w-full"
                        />
                      </div>
                    )}

                    <Button onClick={handleSaveCrop}>Save Cropped</Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Select an image to preview.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openFileDialog}
                  >
                    Replace
                  </Button>
                  <Button type="button" variant="outline" onClick={clearMedia}>
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {media?.type === "youtube" && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="text-sm">
                  <span className="text-gray-600">YouTube ID:</span>{" "}
                  <span className="font-mono">{String(media.value)}</span>
                </div>
                <Button type="button" variant="outline" onClick={clearMedia}>
                  Remove
                </Button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageFile(f);
                e.currentTarget.value = "";
              }}
            />

            {mediaFieldError && (
              <p className="text-xs text-red-600">{String(mediaFieldError)}</p>
            )}
          </div>
        </section>
      </div>
    </CreatePollLayout>
  );
}
