import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Link2, SendHorizontal, X } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";
import { CampaignSocialPublishRateLimitTooltip } from "@/components/campaign/social/campaign-social-publish-rate-limit-tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import {
  getCampaignSocialPublishRateLimitDisabledReason,
  publishCampaignBlogSocialPublication,
  readCampaignSocialRateLimitMeta,
  readCampaignSocialErrorMessage,
} from "@/lib/campaign/social";
import { cn } from "@/lib/utils";
import { prepareSocialPublishImage } from "@/utils/media/prepareSocialPublishImage";
import type {
  ApiCampaignBlogSocialPublicationCreateResult,
  CampaignSocialPublishRateLimitRule,
  CampaignSocialPublishRateLimitSnapshot,
  CampaignSocialPlatformKey,
  CreateCampaignBlogSocialPublicationInput,
} from "@/types/campaigns";
import { appToast } from "@/utils/toast";

const DEFAULT_INSTAGRAM_FALLBACK_IMAGE_URL =
  "https://test-storage.xpoll.io/xpoll-blob-dump/default-test.jpeg";
const ONE_MB = 1024 * 1024;
const SOCIAL_PUBLISH_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png";
const SOCIAL_PUBLISH_DEFAULT_IMAGE_LIMIT = 5;
const SOCIAL_PUBLISH_X_IMAGE_LIMIT = 4;
const SOCIAL_PUBLISH_IMAGE_OUTPUT_WIDTH = 1080;
const SOCIAL_PUBLISH_IMAGE_OUTPUT_HEIGHT = 1350;
const IMAGE_MAX_INPUT_BYTES_BY_PLATFORM: Record<CampaignSocialPlatformKey, number> = {
  x: 5 * ONE_MB,
  instagram: 8 * ONE_MB,
  facebook: 10 * ONE_MB,
};
const IMAGE_FORMATS_BY_PLATFORM: Record<CampaignSocialPlatformKey, string[]> = {
  x: ["JPG", "PNG"],
  instagram: ["JPG", "PNG"],
  facebook: ["JPG", "PNG"],
};
const ACCEPTED_SOCIAL_PUBLISH_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const ACCEPTED_SOCIAL_PUBLISH_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
]);

const PLATFORM_LABELS: Record<CampaignSocialPlatformKey, string> = {
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
};

const publishSchema = z.object({
  caption: z.string().trim().min(5).max(250),
});

type PublishFormValues = z.infer<typeof publishSchema>;

type SelectedMediaDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

type CampaignBlogPublishPreview = {
  _id: string;
  title: string;
};

function getSafeImageMaxInputBytes(platforms: CampaignSocialPlatformKey[]) {
  if (platforms.length === 0) {
    return IMAGE_MAX_INPUT_BYTES_BY_PLATFORM.x;
  }

  return platforms.reduce(
    (currentMin, platform) =>
      Math.min(currentMin, IMAGE_MAX_INPUT_BYTES_BY_PLATFORM[platform]),
    Number.POSITIVE_INFINITY,
  );
}

function getSocialPublishImageLimit(platforms: CampaignSocialPlatformKey[]) {
  return platforms.includes("x")
    ? SOCIAL_PUBLISH_X_IMAGE_LIMIT
    : SOCIAL_PUBLISH_DEFAULT_IMAGE_LIMIT;
}

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isAcceptedSocialPublishImageFile(file: File) {
  if (ACCEPTED_SOCIAL_PUBLISH_IMAGE_MIME_TYPES.has(file.type)) {
    return true;
  }

  if (file.type) {
    return false;
  }

  return ACCEPTED_SOCIAL_PUBLISH_IMAGE_EXTENSIONS.has(getFileExtension(file));
}

function truncateCaptionPart(value: string, maxLength: number) {
  if (maxLength <= 0) return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 1) return normalized.slice(0, maxLength);
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildDefaultCaption(args: {
  title: string;
  publicBlogUrl: string;
}) {
  const maxCaptionLength = 250;
  const link = truncateCaptionPart(args.publicBlogUrl.trim(), maxCaptionLength);
  const titleBudget = Math.max(
    0,
    maxCaptionLength - (link ? link.length : 0) - (link ? 2 : 0),
  );
  const title = truncateCaptionPart(args.title.trim(), titleBudget);
  const caption = [link, title].filter(Boolean).join("\n\n").trim();
  if (caption.length >= 5) return caption;

  return truncateCaptionPart(args.publicBlogUrl.trim(), 250);
}

function revokePreviewUrl(url: string) {
  if (!url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignore browser cleanup failures.
  }
}

export function CampaignBlogSocialPublishConfirmModal(props: {
  open: boolean;
  campaignId: string;
  blog: CampaignBlogPublishPreview | null;
  publishablePlatforms: CampaignSocialPlatformKey[];
  publishRateLimits?: {
    resetAt?: string | Date | null;
    user?: CampaignSocialPublishRateLimitSnapshot | null;
    campaign?: CampaignSocialPublishRateLimitSnapshot | null;
    blog?: CampaignSocialPublishRateLimitSnapshot | null;
    blogRule?: CampaignSocialPublishRateLimitRule | null;
  } | null;
  onOpenChange: (open: boolean) => void;
  onPublished?: (
    result: ApiCampaignBlogSocialPublicationCreateResult,
  ) => void | Promise<void>;
}) {
  const { uploadImage, loading: imageUploadPending } = useImageUpload();
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    CampaignSocialPlatformKey[]
  >([]);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaDraft[]>([]);
  const [submitPending, setSubmitPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rateLimitOverride, setRateLimitOverride] = useState<{
    resetAt?: string | Date | null;
    user?: CampaignSocialPublishRateLimitSnapshot | null;
    campaign?: CampaignSocialPublishRateLimitSnapshot | null;
    blog?: CampaignSocialPublishRateLimitSnapshot | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      caption: "",
    },
    mode: "onChange",
  });

  const publicBlogUrl = useMemo(() => {
    if (!props.blog?._id) return "";
    return `${import.meta.env.VITE_CLIENT_URL}/campaigns/all-campaigns/${props.campaignId}/blogs/${props.blog._id}`;
  }, [props.blog?._id, props.campaignId]);

  useEffect(() => {
    if (!props.open || !props.blog) return;

    setSelectedPlatforms(props.publishablePlatforms);
    setSubmitError(null);
    setRateLimitOverride(null);
    form.reset({
      caption: buildDefaultCaption({
        title: props.blog.title,
        publicBlogUrl,
      }),
    });
  }, [
    form,
    props.blog,
    props.open,
    props.publishablePlatforms,
    publicBlogUrl,
  ]);

  useEffect(() => {
    if (props.open) return;

    setSelectedPlatforms([]);
    setSubmitError(null);
    setRateLimitOverride(null);
    setSelectedMedia((current) => {
      current.forEach((item) => revokePreviewUrl(item.previewUrl));
      return [];
    });
    form.reset({
      caption: "",
    });
  }, [form, props.open]);

  useEffect(() => {
    return () => {
      selectedMedia.forEach((item) => revokePreviewUrl(item.previewUrl));
    };
  }, [selectedMedia]);

  const effectivePlatforms = useMemo(
    () =>
      selectedPlatforms.length > 0
        ? selectedPlatforms
        : props.publishablePlatforms,
    [props.publishablePlatforms, selectedPlatforms],
  );
  const imageMaxInputBytes = useMemo(
    () => getSafeImageMaxInputBytes(effectivePlatforms),
    [effectivePlatforms],
  );
  const selectedMediaLimit = useMemo(
    () => getSocialPublishImageLimit(effectivePlatforms),
    [effectivePlatforms],
  );
  const imageMaxInputMb = imageMaxInputBytes / ONE_MB;
  const imageFormatsLabel = IMAGE_FORMATS_BY_PLATFORM.instagram.join(", ");
  const xImageLimitReason = selectedPlatforms.includes("x")
    ? "X is selected, so this publish is limited to 4 images."
    : null;
  const effectivePublishRateLimits = useMemo(
    () => ({
      resetAt:
        rateLimitOverride?.resetAt ?? props.publishRateLimits?.resetAt ?? null,
      user: rateLimitOverride?.user ?? props.publishRateLimits?.user ?? null,
      campaign:
        rateLimitOverride?.campaign ??
        props.publishRateLimits?.campaign ??
        null,
      blog: rateLimitOverride?.blog ?? props.publishRateLimits?.blog ?? null,
      blogRule: props.publishRateLimits?.blogRule ?? null,
    }),
    [
      props.publishRateLimits?.blog,
      props.publishRateLimits?.blogRule,
      props.publishRateLimits?.campaign,
      props.publishRateLimits?.resetAt,
      props.publishRateLimits?.user,
      rateLimitOverride?.blog,
      rateLimitOverride?.campaign,
      rateLimitOverride?.resetAt,
      rateLimitOverride?.user,
    ],
  );

  const busy = submitPending || imageUploadPending;
  const rateLimitDisabledReason = useMemo(
    () =>
      getCampaignSocialPublishRateLimitDisabledReason({
        resetAt: effectivePublishRateLimits.resetAt,
        user: effectivePublishRateLimits.user,
        campaign: effectivePublishRateLimits.campaign,
        blog: effectivePublishRateLimits.blog,
      }),
    [
      effectivePublishRateLimits.blog,
      effectivePublishRateLimits.campaign,
      effectivePublishRateLimits.resetAt,
      effectivePublishRateLimits.user,
    ],
  );
  const canSubmit =
    !busy &&
    !!props.blog &&
    selectedPlatforms.length > 0 &&
    form.formState.isValid &&
    !rateLimitDisabledReason;
  const publishDisabledReason = useMemo(() => {
    if (submitPending) {
      return "This publish run is already being started.";
    }

    if (imageUploadPending) {
      return "Please wait for the selected media to finish uploading.";
    }

    if (!props.blog) {
      return "This blog is no longer available for publishing.";
    }

    if (props.publishablePlatforms.length === 0) {
      return "No connected, enabled, and healthy social platform is available for this publish.";
    }

    if (selectedPlatforms.length === 0) {
      return "Select at least one social platform to publish.";
    }

    if (form.formState.errors.caption?.message) {
      return form.formState.errors.caption.message;
    }

    if (!form.formState.isValid) {
      return "Caption must be between 5 and 250 characters.";
    }

    if (rateLimitDisabledReason) {
      return rateLimitDisabledReason;
    }

    return null;
  }, [
    form.formState.errors.caption?.message,
    form.formState.isValid,
    imageUploadPending,
    props.blog,
    props.publishablePlatforms.length,
    rateLimitDisabledReason,
    selectedPlatforms.length,
    submitPending,
  ]);

  const mediaCountLabel = `${selectedMedia.length}/${selectedMediaLimit} selected`;

  const updateSelectedMedia = (
    updater: (current: SelectedMediaDraft[]) => SelectedMediaDraft[],
  ) => {
    setSelectedMedia((current) => {
      const next = updater(current);
      current.forEach((item) => {
        if (!next.some((candidate) => candidate.id === item.id)) {
          revokePreviewUrl(item.previewUrl);
        }
      });
      return next;
    });
  };

  useEffect(() => {
    if (!props.open) return;

    let removedCount = 0;
    updateSelectedMedia((current) => {
      const next = current.filter((media) => {
        return media.file.size <= imageMaxInputBytes;
      });

      const limitedNext = next.slice(0, selectedMediaLimit);
      removedCount = current.length - limitedNext.length;
      return limitedNext;
    });

    if (removedCount > 0) {
      appToast.info(
        "Removed media that no longer matches the selected platform constraints.",
      );
    }
  }, [
    effectivePlatforms,
    imageMaxInputBytes,
    props.open,
    selectedMediaLimit,
  ]);

  const handleFiles = async (files: File[]) => {
    if (busy) return;

    const validDrafts: SelectedMediaDraft[] = [];
    for (const file of files) {
      if (!isAcceptedSocialPublishImageFile(file)) {
        appToast.error("Use JPG or PNG images only for social publishing.");
        continue;
      }

      if (file.size > imageMaxInputBytes) {
        appToast.error(`Images must be <= ${imageMaxInputMb}MB for the selected platforms.`);
        continue;
      }

      try {
        const preparedImage = await prepareSocialPublishImage(file);
        if (preparedImage.file.size > imageMaxInputBytes) {
          revokePreviewUrl(preparedImage.previewUrl);
          appToast.error(`Prepared images must be <= ${imageMaxInputMb}MB for the selected platforms.`);
          continue;
        }

        validDrafts.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file: preparedImage.file,
          previewUrl: preparedImage.previewUrl,
        });
      } catch {
        appToast.error(
          "We couldn’t prepare this image for social publishing. Try another JPG or PNG image.",
        );
      }
    }

    if (validDrafts.length === 0) return;

    updateSelectedMedia((current) => {
      const deduped = validDrafts.filter(
        (draft) => !current.some((item) => item.id === draft.id),
      );

      const availableSlots = Math.max(0, selectedMediaLimit - current.length);
      if (deduped.length > availableSlots) {
        appToast.info(
          selectedMediaLimit === SOCIAL_PUBLISH_X_IMAGE_LIMIT
            ? "You can attach up to 4 images when X is selected."
            : "You can attach up to 5 images per publish.",
        );
      }

      return [...current, ...deduped.slice(0, availableSlots)];
    });
  };

  const removeMedia = (id: string) => {
    updateSelectedMedia((current) => current.filter((item) => item.id !== id));
  };

  const togglePlatform = (platform: CampaignSocialPlatformKey) => {
    if (busy) return;

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const invalidateHistoryQueries = async () => {
    if (!props.blog?._id) return;

    const historyBase = endpoints.campaigns.getCampaignBlogSocialPublicationsBase(
      props.campaignId,
      props.blog._id,
    );

    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey[0];
        return (
          typeof queryKey === "string" &&
          queryKey.startsWith(historyBase)
        );
      },
    });
  };

  const invalidateRateLimitQueries = async () => {
    const campaignSocialRoute = endpoints.campaigns.getCampaignSocial(
      props.campaignId,
    );
    const blogRateLimitBase =
      endpoints.campaigns.getCampaignBlogSocialPublicationRateLimitsBase(
        props.campaignId,
      );

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [campaignSocialRoute],
      }),
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === blogRateLimitBase,
      }),
    ]);
  };

  const handlePublish = form.handleSubmit(async (values) => {
    if (!props.blog) return;
    if (selectedPlatforms.length === 0) {
      setSubmitError("Select at least one social platform.");
      return;
    }

    setSubmitPending(true);
    setSubmitError(null);

    try {
      const mediaItems: CreateCampaignBlogSocialPublicationInput["mediaItems"] =
        [];

      for (const media of selectedMedia) {
        const uploadedUrl = await uploadImage(media.file, undefined, false);
        if (!uploadedUrl) {
          throw new Error("Image upload failed.");
        }

        mediaItems.push({
          type: "image",
          url: uploadedUrl,
          mimeType: media.file.type || "application/octet-stream",
          fileName: media.file.name,
          byteSize: media.file.size,
        });
      }

      const result = await publishCampaignBlogSocialPublication(
        props.campaignId,
        props.blog._id,
        {
          platforms: selectedPlatforms,
          caption: values.caption.trim(),
          mediaItems,
        },
      );

      await Promise.all([invalidateHistoryQueries(), invalidateRateLimitQueries()]);
      await props.onPublished?.(result);

      appToast.success(
        `Started ${result.publications.length} social publication${
          result.publications.length === 1 ? "" : "s"
        }.`,
      );
      props.onOpenChange(false);
    } catch (error) {
      const rateLimitMeta = readCampaignSocialRateLimitMeta(error);
      if (rateLimitMeta) {
        setRateLimitOverride({
          resetAt: rateLimitMeta.resetAt ?? null,
          user: rateLimitMeta.user ?? null,
          campaign: rateLimitMeta.campaign ?? null,
          blog: rateLimitMeta.blog ?? null,
        });
        await invalidateRateLimitQueries();
      }
      setSubmitError(
        rateLimitMeta
          ? getCampaignSocialPublishRateLimitDisabledReason({
              resetAt: rateLimitMeta.resetAt ?? null,
              user: rateLimitMeta.user ?? null,
              campaign: rateLimitMeta.campaign ?? null,
              blog: rateLimitMeta.blog ?? null,
            }) ??
              readCampaignSocialErrorMessage(
                error,
                "We couldn’t start this social publish right now.",
              )
          : readCampaignSocialErrorMessage(
              error,
              "We couldn’t start this social publish right now.",
            ),
      );
    } finally {
      setSubmitPending(false);
    }
  });

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (busy) return;
        props.onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-[28px] border border-[#D9E4EC] bg-[#F8FBFD] p-0 shadow-2xl"
        onPointerDownOutside={(event) => busy && event.preventDefault()}
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b border-[#E7EEF3] px-6 py-5 sm:text-left">
          <DialogTitle className="text-xl font-semibold text-[#132238]">
            Publish blog to social media
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#64748B]">
            Choose where to publish, optionally attach JPG or PNG images for
            this run, and edit the generated caption before xPoll starts the
            tracked social publish.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={handlePublish}
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <section className="space-y-3 rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#117C7C]">
                    Social platforms
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Connected, enabled, and healthy platforms are selected by
                    default.
                  </p>
                </div>
                <span className="text-xs font-medium text-[#64748B]">
                  {selectedPlatforms.length} selected
                </span>
              </div>

              <CampaignSocialPublishRateLimitTooltip
                user={effectivePublishRateLimits.user}
                campaign={effectivePublishRateLimits.campaign}
                blog={effectivePublishRateLimits.blog}
                blogRule={effectivePublishRateLimits.blogRule}
                resetAt={effectivePublishRateLimits.resetAt}
                triggerClassName="border-[#CFE1EA] bg-[#F8FBFD]"
              />

              <div className="flex flex-wrap gap-3">
                {props.publishablePlatforms.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      disabled={busy}
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        isSelected
                          ? "border-[#0EA5A5] bg-[#E8FBFB] text-[#0B7272]"
                          : "border-[#D9E4EC] bg-white text-[#334155] hover:border-[#BFD5DE]",
                      )}
                    >
                      {PLATFORM_LABELS[platform]}
                    </button>
                  );
                })}
              </div>

              {selectedPlatforms.length === 0 ? (
                <p className="text-sm text-[#B91C1C]">
                  Select at least one social platform to continue.
                </p>
              ) : null}
            </section>

            <section className="space-y-4 rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#117C7C]">
                    Media for this publish
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Add up to {selectedMediaLimit} JPG or PNG images. Every
                    image is auto-fitted to a social-safe 4:5 frame for this
                    publish run and does not change the blog itself.
                  </p>
                </div>
                <span className="text-xs font-medium text-[#64748B]">
                  {mediaCountLabel}
                </span>
              </div>

              {xImageLimitReason ? (
                <p className="text-sm text-[#B45309]">{xImageLimitReason}</p>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={SOCIAL_PUBLISH_IMAGE_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  void handleFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />

              <MediaDropzone
                disabled={busy || selectedMedia.length >= selectedMediaLimit}
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
                      Add images for this social post
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Drag files here or click to choose JPG or PNG images.
                    </p>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Images only: {imageFormatsLabel} up to {imageMaxInputMb} MB
                    each. Every selected image is auto-fitted to{" "}
                    {SOCIAL_PUBLISH_IMAGE_OUTPUT_WIDTH}x
                    {SOCIAL_PUBLISH_IMAGE_OUTPUT_HEIGHT} (4:5) before publish.
                  </p>
                </div>
              </MediaDropzone>

              {selectedMedia.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedMedia.map((media) => (
                    <div
                      key={media.id}
                      className="relative overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-[#F8FBFD]"
                    >
                      <img
                        src={media.previewUrl}
                        alt=""
                        className="h-40 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeMedia(media.id)}
                        className="absolute right-3 top-3 rounded-full bg-white/95 p-1.5 text-[#132238] shadow"
                        aria-label="Remove media"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-[#64748B]">
                        <ImageIcon className="h-4 w-4" />
                        <span className="truncate">{media.file.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[20px] bg-[#F8FBFD] px-4 py-3 text-sm leading-6 text-[#5F7283]">
                If you don’t add any images, xPoll will use this default 4:5
                PNG fallback image for the selected platforms:
                <a
                  href={DEFAULT_INSTAGRAM_FALLBACK_IMAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 font-medium text-[#0EA5A5] underline underline-offset-2"
                >
                  preview default image
                </a>
                .
              </div>
            </section>

            <section className="space-y-4 rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#117C7C]">
                  Publish caption
                </p>
                <p className="mt-1 text-sm text-[#64748B]">
                  Review and edit the generated social caption before publishing.
                </p>
              </div>

              <div className="rounded-[20px] bg-[#F8FBFD] px-4 py-3 text-sm text-[#334155]">
                <div className="flex items-start gap-2">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0EA5A5]" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      Public blog link
                    </p>
                    <p className="mt-1 break-all">{publicBlogUrl}</p>
                  </div>
                </div>
              </div>

              <TextAreaField<PublishFormValues>
                form={form}
                schema={publishSchema as any}
                name="caption"
                label="Caption"
                rows={7}
                showCounter
                showError={false}
                helperText={
                  form.formState.errors.caption?.message ??
                  "Between 5 and 250 characters."
                }
              />
            </section>

            {submitError ? (
              <div className="rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                {submitError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-[#E7EEF3] px-6 py-5">
            {!canSubmit && publishDisabledReason ? (
              <div className="mb-3 text-sm text-[#B45309]">
                <p className="leading-6">{publishDisabledReason}</p>
              </div>
            ) : null}
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
                type="submit"
                disabled={!canSubmit}
                className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
              >
                <SendHorizontal className="mr-2 h-4 w-4" />
                {busy ? "Publishing..." : "Publish selected platforms"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
