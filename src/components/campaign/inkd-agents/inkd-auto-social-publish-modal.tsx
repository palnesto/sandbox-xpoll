import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Rocket, X } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { prepareSocialPublishImage } from "@/utils/media/prepareSocialPublishImage";
import type {
  CampaignInkDAutoSocialPublishConfig,
  UpdateCampaignInkDAutoSocialPublishInput,
} from "@/types/campaigns";
import { appToast } from "@/utils/toast";

const DEFAULT_AUTO_SOCIAL_PUBLISH_IMAGE_URL =
  "https://test-storage.xpoll.io/xpoll-blob-dump/default-test.jpeg";
const AUTO_SOCIAL_PUBLISH_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png";
const ACCEPTED_AUTO_SOCIAL_PUBLISH_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const ACCEPTED_AUTO_SOCIAL_PUBLISH_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
]);

type SelectedImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isAcceptedAutoSocialPublishImageFile(file: File) {
  if (ACCEPTED_AUTO_SOCIAL_PUBLISH_IMAGE_MIME_TYPES.has(file.type)) {
    return true;
  }

  if (file.type) {
    return false;
  }

  return ACCEPTED_AUTO_SOCIAL_PUBLISH_IMAGE_EXTENSIONS.has(
    getFileExtension(file),
  );
}

function revokePreviewUrl(url: string) {
  if (!url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignore browser cleanup failures.
  }
}

function readMutationError(error: any) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function InkDAutoSocialPublishModal(props: {
  open: boolean;
  campaignId: string;
  config: CampaignInkDAutoSocialPublishConfig | null | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { uploadImage, loading: imageUploadPending } = useImageUpload();
  const mutation = useApiMutation<
    UpdateCampaignInkDAutoSocialPublishInput,
    unknown
  >({
    route: endpoints.campaigns.updateCampaignInkDAutoSocialPublish(
      props.campaignId,
    ),
    method: "PUT",
  });

  const [enabled, setEnabled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImageDraft | null>(
    null,
  );
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preparePending, setPreparePending] = useState(false);

  const busy = preparePending || mutation.isPending || imageUploadPending;
  const activePreviewUrl = selectedImage?.previewUrl ?? existingImageUrl ?? null;
  const activeConsentedAt = props.config?.consentedAt ?? null;
  const statusLabel = enabled ? "Enabled" : "Disabled";
  const imageSourceLabel = activePreviewUrl
    ? "Custom image selected"
    : "Default fallback image";
  const submitLabel = busy
    ? "Saving..."
    : enabled
      ? "Save consent"
      : "Save changes";

  useEffect(() => {
    if (!props.open) return;

    setEnabled(!!props.config?.enabled);
    setExistingImageUrl(props.config?.imageUrl ?? null);
    setSubmitError(null);
    setPreparePending(false);
    setSelectedImage((current) => {
      if (current) {
        revokePreviewUrl(current.previewUrl);
      }
      return null;
    });
  }, [props.config?.enabled, props.config?.imageUrl, props.open]);

  useEffect(() => {
    if (props.open) return;

    setSubmitError(null);
    setPreparePending(false);
    setSelectedImage((current) => {
      if (current) {
        revokePreviewUrl(current.previewUrl);
      }
      return null;
    });
  }, [props.open]);

  useEffect(() => {
    return () => {
      if (selectedImage) {
        revokePreviewUrl(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  const handleFiles = async (files: File[]) => {
    if (busy || files.length === 0) return;

    if (files.length > 1) {
      appToast.info("Use one image only for InkD auto social publishing.");
    }

    const firstFile = files[0];
    if (!firstFile || !isAcceptedAutoSocialPublishImageFile(firstFile)) {
      appToast.error("Use one JPG or PNG image only.");
      return;
    }

    setPreparePending(true);
    try {
      const preparedImage = await prepareSocialPublishImage(firstFile);
      setSubmitError(null);
      setSelectedImage((current) => {
        if (current) {
          revokePreviewUrl(current.previewUrl);
        }

        return {
          id: `${firstFile.name}-${firstFile.size}-${firstFile.lastModified}`,
          file: preparedImage.file,
          previewUrl: preparedImage.previewUrl,
        };
      });
    } catch {
      appToast.error(
        "We couldn’t prepare this image. Try another JPG or PNG image.",
      );
    } finally {
      setPreparePending(false);
    }
  };

  const handleRemoveImage = () => {
    setExistingImageUrl(null);
    setSelectedImage((current) => {
      if (current) {
        revokePreviewUrl(current.previewUrl);
      }
      return null;
    });
  };

  const handleSave = async () => {
    setSubmitError(null);

    try {
      let imageUrl = existingImageUrl;
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage.file, undefined, false);
        if (!uploadedUrl) {
          throw new Error("Image upload failed.");
        }
        imageUrl = uploadedUrl;
      }

      await mutation.mutateAsync({
        enabled,
        imageUrl: imageUrl ?? null,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.getCampaignInkDAgents(props.campaignId)],
        }),
        queryClient.invalidateQueries({
          queryKey: [endpoints.campaigns.getCampaignByIdOwner(props.campaignId)],
        }),
      ]);

      appToast.success(
        enabled
          ? "Automatic social publishing consent saved."
          : "Automatic social publishing disabled for future InkD generations.",
      );
      props.onOpenChange(false);
    } catch (error) {
      setSubmitError(
        readMutationError(error),
      );
    }
  };

  const consentedAtLabel = useMemo(() => {
    if (!activeConsentedAt) return "No consent recorded yet";
    const consentedAt = new Date(activeConsentedAt);
    if (Number.isNaN(consentedAt.getTime())) return "No consent recorded yet";

    return `Consented ${consentedAt.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;
  }, [activeConsentedAt]);

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (busy) return;
        props.onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-[28px] border border-[#D9E4EC] bg-[#F8FBFD] p-0 shadow-2xl"
        onPointerDownOutside={(event) => busy && event.preventDefault()}
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b border-[#E7EEF3] px-6 py-5 sm:text-left">
          <DialogTitle className="text-xl font-semibold text-[#132238]">
            Automatic social publishing consent
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#64748B]">
            This campaign-level setting applies to every connected InkD agent
            that generates a campaign blog for this campaign. When enabled,
            xPoll will automatically publish newly generated campaign blogs to
            all currently connected and enabled social accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#117C7C]">
                  Consent state
                </p>
                <p className="mt-1 text-sm text-[#64748B]">
                  Toggle whether future InkD campaign-blog generations should
                  automatically post to connected social accounts.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-[#D9E4EC] bg-[#F8FBFD] px-4 py-2">
                <span className="text-sm font-medium text-[#132238]">
                  {statusLabel}
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={(next) => setEnabled(!!next)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#EEF9FB] px-3 py-1 text-xs font-medium text-[#0B7272]">
                {imageSourceLabel}
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-medium text-[#516274]">
                {consentedAtLabel}
              </span>
            </div>
          </section>

          <section className="space-y-4 rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#117C7C]">
                Optional image
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                Upload one JPG or PNG image. xPoll will normalize it to a
                social-safe 4:5 frame before it is saved. If you leave this
                empty, the default fallback image will be used when auto
                publishing runs.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={AUTO_SOCIAL_PUBLISH_IMAGE_ACCEPT}
              className="hidden"
              onChange={(event) => {
                void handleFiles(Array.from(event.target.files ?? []));
                event.currentTarget.value = "";
              }}
            />

            {!activePreviewUrl ? (
              <MediaDropzone
                disabled={busy}
                onFiles={(files) => void handleFiles(files)}
                onPickClick={() => fileInputRef.current?.click()}
                className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FBFD] p-5"
              >
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8FBFB] text-[#0EA5A5]">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#132238]">
                      Add one image for automatic social publishing
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Drag an image here or click to choose one JPG or PNG file.
                    </p>
                  </div>
                </div>
              </MediaDropzone>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-[#F8FBFD]">
                <div className="relative">
                  <img
                    src={activePreviewUrl}
                    alt="Automatic social publishing image preview"
                    className="aspect-[4/5] w-full object-cover sm:max-h-[22rem]"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={busy}
                    className="absolute right-3 top-3 rounded-full bg-white/95 p-1.5 text-[#132238] shadow"
                    aria-label="Remove configured image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-[#5F7283]">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-[#0EA5A5]" />
                    <span>
                      {selectedImage
                        ? "New custom image ready to save"
                        : "Saved custom image"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#D7DCE2] text-[#1E293B]"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace image
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-[20px] bg-[#F8FBFD] px-4 py-3 text-sm leading-6 text-[#5F7283]">
              No image selected? xPoll will use the default fallback image for
              automatic social publishing.
              <a
                href={DEFAULT_AUTO_SOCIAL_PUBLISH_IMAGE_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-1 font-medium text-[#0EA5A5] underline underline-offset-2"
              >
                Preview fallback image
              </a>
              .
            </div>
          </section>

          {submitError ? (
            <div className="rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {submitError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-[#E7EEF3] px-6 py-5">
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="rounded-full border-[#D7DCE2] px-5 text-[#1E293B]"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              className="rounded-full bg-[#0EA5A5] px-5 text-white hover:bg-[#0c9a9a]"
              onClick={() => void handleSave()}
            >
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
