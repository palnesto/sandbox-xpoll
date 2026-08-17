import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Link as LinkIcon, Trash2, X } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import apiInstance, { BASE_URL, queryClient } from "@/api/queryClient";

import { MediaState, MediaType, extractYouTubeId } from "@/types/petition";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import { ImageSlot } from "@/components/campaign/petition/CampaignImageSlot";
import EasyReactCropper from "@/components/commons/image-cropper";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";
import { cropImage, type CropRect } from "@/utils/media/cropImage";
import { COMPRESS_QUALITY } from "@/utils/media/compressImage";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { Button } from "@/components/ui/button";

import { Controller, useForm } from "react-hook-form";
import { MarkdownEditor } from "@/components/commons/editor/markdown-editor";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TrialSelect,
  type ListingOption,
  type TrialListItem,
} from "@/components/commons/selects/trial-select";
import { appToast } from "@/utils/toast";
import {
  isValidExternalLink,
  normalizeExternalLink,
} from "@/utils/external-links";
import {
  useCampaignBlogEditStore,
  type LinkedTrialStored,
} from "@/stores/campaign-blog-edit.store";
import {
  CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS,
  CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
  CAMPAIGN_BLOG_MAX_TITLE_CHARS,
} from "@/constants/campaign-blog.constants";
import {
  campaignBlogDescriptionHasMeaningfulText,
  isLegacyCampaignBlogHtml,
  legacyCampaignBlogHtmlToMarkdown,
} from "@/lib/campaign-blog-description";
import { CampaignBlogDescriptionReadOnly } from "@/components/campaign/blog/CampaignBlogDescriptionPreview";
import {
  CampaignBlogInkDAgentAttribution,
  type GeneratedByInkDAgent,
} from "@/components/campaign/blog/CampaignBlogInkDAgentAttribution";
import { CampaignBlogSocialPublishButton } from "@/components/campaign/blog/CampaignBlogSocialPublishButton";
import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
  isAcceptedVideoUploadFile,
} from "@/utils/media/video-upload.constants";

type BlogStatus = "draft" | "live" | "deleted";

type Blog = {
  _id: string;
  belongsToCampaignId: string;
  title: string;
  description: string;
  externalLinks: string[];
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  linkedTrials?: any[];
  publishDate: string | null;
  status: BlogStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  generatedByInkDAgent?: GeneratedByInkDAgent;
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB max for image
const MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;
const MAX_LINKED_TRIALS = 3;
const BLOG_MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024); // 20
const BLOG_MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
const CROP_VIEW_W = 600;
const CROP_VIEW_H = 300;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp,image/gif";

// Media is optional. If added: max 20MB image (MAX_IMAGE_BYTES), max 25MB video (MAX_VIDEO_BYTES).
// At most one media type (image | video | youtube). Validated via mediaValid + buildMediaPayloadAsync.
const blogFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Min 1 character")
    .max(
      CAMPAIGN_BLOG_MAX_TITLE_CHARS,
      `Max ${CAMPAIGN_BLOG_MAX_TITLE_CHARS} characters`,
    ),
  description: z
    .string()
    .min(100, "Min 100 characters")
    .max(
      CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS,
      `Max ${CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS} characters`,
    )
    .superRefine((val, ctx) => {
      if (!campaignBlogDescriptionHasMeaningfulText(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Description is required",
        });
      }
    }),

  externalLinks: z
    .array(
      z
        .string()
        .trim()
        .max(2048)
        .refine((v) => !v || isValidExternalLink(v), "Enter a valid URL"),
    )
    .max(
      CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
      `Max ${CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS} links`,
    )
    .optional()
    .default([])
    .transform((arr) =>
      (Array.isArray(arr) ? arr : [])
        .map((x) => String(x ?? "").trim())
        .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS),
    ),
  linkedTrials: z.array(z.string()).optional().default([]),
});

type BlogForm = z.infer<typeof blogFormSchema>;

function safeArr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function isDeleted(b: Blog | null) {
  return !!b?.archivedAt || b?.status === "deleted";
}

function isHttpUrl(v: any) {
  const s = String(v || "").trim();
  return s.startsWith("http://") || s.startsWith("https://");
}

function debugBlogSave(label: string, data?: unknown) {
  if (import.meta.env.PROD) return;
  console.log(`[BlogUpsertView:save] ${label}`, data ?? "");
}

function pickTrialImage(item?: {
  resourceAssets?: { type?: string; value?: string }[];
}) {
  const img = (item?.resourceAssets || []).find((a) => a?.type === "image");
  return img?.value ? String(img.value) : "";
}

function detectMediaType(b: Blog): MediaType {
  if (safeArr(b.uploadedVideoLinks)[0]) return "video";
  if (safeArr(b.uploadedImageLinks)[0]) return "image";
  if (safeArr(b.ytVideoLinks)[0]) return "youtube";
  return "none";
}

function detectMediaState(b: Blog): MediaState {
  const vid = safeArr(b.uploadedVideoLinks)[0];
  const img = safeArr(b.uploadedImageLinks)[0];
  const yt = safeArr(b.ytVideoLinks)[0];

  if (vid) {
    return {
      type: "video",
      urls: [String(vid)],
      files: [],
      previews: [String(vid)],
    };
  }
  if (img) {
    return {
      type: "image",
      urls: [String(img)],
      files: [],
      previews: [String(img)],
    };
  }
  if (yt) return { type: "youtube", ytIds: [String(yt)] };
  return { type: "none" };
}

function errMsg(e: any) {
  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    "Request failed"
  );
}

async function buildMediaPayloadAsync(opts: {
  mediaType: MediaType;
  media: MediaState;
  youtubeDraft: string;
  uploadImage: (f: File) => Promise<string | null>;
  uploadVideo: (f: File) => Promise<string | null>;
}) {
  const { mediaType, media, youtubeDraft, uploadImage, uploadVideo } = opts;

  const empty = {
    uploadedImageLinks: [] as string[],
    uploadedVideoLinks: [] as string[],
    ytVideoLinks: [] as string[],
  };

  if (mediaType === "none") return empty;

  if (mediaType === "youtube") {
    const id =
      (media.type === "youtube" ? media.ytIds?.[0] : null) ||
      extractYouTubeId(youtubeDraft) ||
      null;
    if (!id) throw new Error("Enter a valid YouTube URL or video ID");
    return { ...empty, ytVideoLinks: [id] };
  }

  if (mediaType === "image") {
    if (media.type !== "image") return empty;

    const f = media.files?.[0] ?? null;
    if (f) {
      if (f.size > MAX_IMAGE_BYTES) throw new Error("Image must be <= 20MB");
      const url = await uploadImage(f);
      if (!url || !isHttpUrl(url)) throw new Error("Image upload failed");
      return { ...empty, uploadedImageLinks: [url] };
    }

    const url = media.urls?.[0] || media.previews?.[0] || "";
    if (isHttpUrl(url)) return { ...empty, uploadedImageLinks: [String(url)] };
    return empty;
  }

  if (mediaType === "video") {
    if (media.type !== "video") return empty;

    const f = media.files?.[0] ?? null;
    if (f) {
      if (f.size > MAX_VIDEO_BYTES)
        throw new Error(`Video must be <= ${BLOG_MAX_VIDEO_MB}MB`);
      const url = await uploadVideo(f);
      if (!url || !isHttpUrl(url)) throw new Error("Video upload failed");
      return { ...empty, uploadedVideoLinks: [url] };
    }

    const url = media.urls?.[0] || media.previews?.[0] || "";
    if (isHttpUrl(url)) return { ...empty, uploadedVideoLinks: [String(url)] };
    return empty;
  }

  return empty;
}

export function BlogUpsertView({
  campaignId,
  blogId,
  onBack,
  onSavedAndNavigate,
  onUnsavedChange,
  canSetDraft = true,
  canEditBlog = true,
  socialPublishDisabledReason = null,
  onOpenPublish,
}: {
  campaignId: string;
  blogId: string | null;
  onBack: () => void;
  onSavedAndNavigate?: () => void;
  onUnsavedChange?: (has: boolean) => void;
  canSetDraft?: boolean;
  canEditBlog?: boolean;
  socialPublishDisabledReason?: string | null;
  onOpenPublish?: () => void;
}) {
  const isCreate = !blogId;

  const { uploadImage } = useImageUpload();
  const { uploadVideo } = useVideoUpload();

  const {
    data: blogResp,
    isError: blogLoadFailed,
    error: blogLoadError,
    isFetching: blogFetching,
  } = useApiQuery(blogId ? endpoints.campaigns.getBlogById(blogId) : "", {
    enabled: !!blogId,
  } as any);
  const { data: meResp } = useApiQuery(endpoints.profile.me, {} as any);
  const userId = String(meResp?.data?.data?.id ?? meResp?.data?.id ?? "");

  const {
    getDraft,
    setDraft,
    setPatch,
    clear: clearEditStore,
    isExpired,
    loadFromLocalStorage,
  } = useCampaignBlogEditStore();

  const blog: Blog | null = useMemo(() => {
    const b = blogResp?.data?.data ?? blogResp?.data ?? null;
    if (!b) return null;
    return { ...b, _id: String(b._id ?? b.id) } as any;
  }, [blogResp]);

  const editBlogReady = isCreate || !!blog;
  const deleted = isDeleted(blog);
  const status: BlogStatus = blog?.status ?? "draft";
  const editable =
    canEditBlog && !deleted && (isCreate || (!!blog && status === "draft"));
  const blogLoadErrorText = blogLoadFailed
    ? errMsg(blogLoadError)
    : !isCreate && !blogFetching && !blog
      ? "Blog could not be loaded."
      : null;

  const form = useForm<BlogForm>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: "",
      description: "",
      externalLinks: [""],
      linkedTrials: [],
    },
    mode: "onChange",
  });

  const extLinks = form.watch("externalLinks") || [""];

  const linkRowErrors = useMemo(() => {
    return safeArr(extLinks)
      .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS)
      .map((v) => {
        const raw = String(v ?? "").trim();
        if (!raw) return null; // blank is ok
        return isValidExternalLink(raw) ? null : "Enter valid link";
      });
  }, [extLinks]);

  const hasLinkErrors = useMemo(
    () => linkRowErrors.some(Boolean),
    [linkRowErrors],
  );

  const descVal = form.watch("description") || "";
  const [legacyHtmlNotice, setLegacyHtmlNotice] = useState(false);
  const linkedTrialIds = form.watch("linkedTrials") || [];
  const [trialPickerKey, setTrialPickerKey] = useState(0);
  const [storedLinkedTrialsDetail, setStoredLinkedTrialsDetail] = useState<
    LinkedTrialStored[]
  >([]);

  const trialQueries = useQueries({
    queries: (linkedTrialIds as string[]).filter(Boolean).map((trialId) => ({
      queryKey: ["campaign-trial", trialId] as const,
      queryFn: async () => {
        const res = await apiInstance.get(
          `${BASE_URL}${endpoints.campaigns.getTrialById(trialId)}`,
        );
        const data = res?.data;
        return (data?.data ?? data?.trial ?? data) as any;
      },
      enabled: !!trialId,
      staleTime: 60_000,
    })),
  });

  const linkedTrialsView = useMemo(() => {
    const ids = (linkedTrialIds as string[]).filter(Boolean);
    return ids.map((id, i) => {
      const q = trialQueries[i];
      const raw = q?.data as any;
      const fromStored = storedLinkedTrialsDetail.find((s) => s.id === id);
      const title =
        raw?.title ?? raw?.name ?? raw?.label ?? fromStored?.name ?? id;
      const imageUrl = pickTrialImage(raw) || fromStored?.image || undefined;
      const isDeleted =
        q?.isError || (raw && (!!raw.archivedAt || raw.status === "deleted"));
      return { id, title, imageUrl, isDeleted: !!isDeleted };
    });
  }, [linkedTrialIds, trialQueries, storedLinkedTrialsDetail]);

  const hasDeletedLinkedTrial = linkedTrialsView.some((t) => t.isDeleted);

  // ✅ inline error for trials
  const [trialErrorText, setTrialErrorText] = useState<string | null>(null);
  const clearTrialError = () => setTrialErrorText(null);

  const [mediaType, setMediaType] = useState<MediaType>("none");
  const [media, setMedia] = useState<MediaState>({ type: "none" });
  const [youtubeDraft, setYoutubeDraft] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const pickedFileRef = useRef<File | null>(null);
  const pickedVideoRef = useRef<File | null>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(
    null,
  );
  const cropAreaRef = useRef<unknown>(null);
  const dragCounterRef = useRef(0);
  const [cropUIOpen, setCropUIOpen] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const imagePreviewUrl =
    media.type === "image"
      ? media.urls?.[0] || media.previews?.[0] || null
      : null;
  const videoPreviewUrl =
    media.type === "video"
      ? media.urls?.[0] || media.previews?.[0] || null
      : null;

  const revokeBlob = useCallback((url: string | null) => {
    if (url?.startsWith("blob:"))
      try {
        URL.revokeObjectURL(url);
      } catch {}
  }, []);

  const removeImage = useCallback(() => {
    const m = media as { type: string; urls?: string[] };
    if (m.type === "image" && m.urls?.[0]?.startsWith("blob:"))
      revokeBlob(m.urls[0]);
    setMedia({ type: "none" });
    pickedFileRef.current = null;
    cropAreaRef.current = null;
    if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
    setCropperImageUrl(null);
    setCropUIOpen(false);
  }, [media, cropperImageUrl, revokeBlob]);

  const removeVideo = useCallback(() => {
    const m = media as { type: string; urls?: string[] };
    if (m.type === "video" && m.urls?.[0]?.startsWith("blob:"))
      revokeBlob(m.urls[0]);
    setMedia({ type: "none" });
    pickedVideoRef.current = null;
  }, [media, revokeBlob]);

  const openImagePicker = () => fileRef.current?.click();
  const openVideoPicker = () => videoRef.current?.click();

  const applyImage = useCallback(
    async (file: File) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) return;
      if (file.size > MAX_IMAGE_BYTES) return;
      removeVideo();
      setYoutubeDraft("");
      const m = media as { type: string; urls?: string[] };
      revokeBlob(m.type === "image" ? (m.urls?.[0] ?? null) : null);
      pickedFileRef.current = file;
      if (file.type === "image/gif") {
        const dataUrl = await fileToDataUrl(file);
        setMedia({
          type: "image",
          files: [file],
          urls: [dataUrl],
          previews: [dataUrl],
        });
        return;
      }
      cropAreaRef.current = null;
      const blobUrl = URL.createObjectURL(file);
      setCropperImageUrl(blobUrl);
      setCropUIOpen(true);
      const dataUrl = await fileToDataUrl(file);
      setMedia({
        type: "image",
        files: [file],
        urls: [dataUrl],
        previews: [dataUrl],
      });
    },
    [media, removeVideo, revokeBlob],
  );

  const onImgDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file?.type.startsWith("image/")) return;
      await applyImage(file);
    },
    [applyImage],
  );

  const handleSaveCrop = useCallback(async () => {
    if (!cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as
      | CropRect
      | null
      | undefined;
    if (!area || typeof area.x !== "number") return;
    const file = pickedFileRef.current;
    try {
      const { file: croppedFile } = await cropImage(cropperImageUrl, area, {
        mime: file?.type,
        fileName: "blog-cover",
        quality: COMPRESS_QUALITY,
      });
      if (!croppedFile) return;
      cropAreaRef.current = area;
      const previewUrl = URL.createObjectURL(croppedFile);
      const m = media as { type: string; urls?: string[] };
      revokeBlob(m.type === "image" ? (m.urls?.[0] ?? null) : null);
      setMedia({
        type: "image",
        files: [croppedFile],
        urls: [previewUrl],
        previews: [previewUrl],
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
      setCropperImageUrl(null);
      setCropUIOpen(false);
    }
  }, [cropperImageUrl, media, revokeBlob]);

  const closeCropper = useCallback(() => {
    if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
    setCropperImageUrl(null);
    setCropUIOpen(false);
  }, [cropperImageUrl, revokeBlob]);

  const [errorText, setErrorText] = useState<string | null>(null);
  const clearError = useCallback(() => setErrorText(null), []);
  const setError = useCallback((msg: string) => setErrorText(msg), []);

  const onMediaTypeChange = useCallback(
    (next: MediaType) => {
      if (next === mediaType) return;
      setMediaType(next);
    },
    [mediaType],
  );

  const onVideoFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!isAcceptedVideoUploadFile(file)) {
        setError("Use MP4, MOV, WEBM, MKV, AVI, or M4V.");
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setError(`Video must be <= ${BLOG_MAX_VIDEO_MB}MB`);
        return;
      }
      clearError();
      removeImage();
      setYoutubeDraft("");
      const m = media as { type: string; urls?: string[] };
      revokeBlob(m.type === "video" ? (m.urls?.[0] ?? null) : null);
      pickedVideoRef.current = file;
      const blobUrl = URL.createObjectURL(file);
      setMedia({
        type: "video",
        files: [file],
        urls: [blobUrl],
        previews: [blobUrl],
      });
    },
    [clearError, media, removeImage, revokeBlob, setError],
  );

  const mediaWithUrls = media as {
    type: string;
    urls?: string[];
    files?: File[];
  };
  const hasImage =
    mediaWithUrls.type === "image" &&
    (!!mediaWithUrls.urls?.[0] || !!mediaWithUrls.files?.[0]);
  const hasVideo =
    mediaWithUrls.type === "video" &&
    (!!mediaWithUrls.urls?.[0] || !!mediaWithUrls.files?.[0]);
  const hasYoutube = !!(
    youtubeDraft && String(extractYouTubeId(youtubeDraft) ?? "").trim()
  );
  const hasMultipleMedia =
    [hasImage, hasVideo, hasYoutube].filter(Boolean).length > 1;

  const hasUnsavedChanges = editable && form.formState.isDirty;

  useEffect(() => {
    onUnsavedChange?.(!!hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChange]);

  const invalidateAfterWrite = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.blogsAdvancedListing],
    });
    if (blogId) {
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getBlogById(blogId)],
      });
    }
  }, [blogId]);

  const { mutateAsync: createBlog, isPending: createPending } = useApiMutation<
    any,
    any
  >({
    route: endpoints.campaigns.createBlog,
    method: "POST",
    onSuccess: () => {
      invalidateAfterWrite();
      (onSavedAndNavigate ?? onBack)();
    },
  });

  const { mutateAsync: updateBlog, isPending: updatePending } = useApiMutation<
    any,
    any
  >({
    route: blogId ? endpoints.campaigns.updateBlog(blogId) : "",
    method: "PUT",
    onSuccess: () => {
      invalidateAfterWrite();
      if (userId) clearEditStore(userId);
      appToast.success("Blog updated");
      (onSavedAndNavigate ?? onBack)();
    },
  });

  const { mutateAsync: makeDraft, isPending: draftPending } = useApiMutation<
    any,
    any
  >({
    route: endpoints.campaigns.setAsDraft,
    method: "PATCH",
    onSuccess: () => invalidateAfterWrite(),
  });

  const { mutateAsync: makeLive, isPending: livePending } = useApiMutation<
    any,
    any
  >({
    route: endpoints.campaigns.makeBlogLive,
    method: "PATCH",
    onSuccess: () => {
      invalidateAfterWrite();
      (onSavedAndNavigate ?? onBack)();
    },
  });

  const saving = createPending || updatePending;
  const switching = draftPending || livePending;

  const mediaValid = useMemo(() => {
    if (!editable) return false;
    if (mediaType === "none") return true;

    if (mediaType === "youtube") {
      const id =
        (media.type === "youtube" ? media.ytIds?.[0] : null) ||
        extractYouTubeId(youtubeDraft) ||
        "";
      return Boolean(String(id).trim());
    }

    if (mediaType === "image") {
      if (media.type !== "image") return false;
      const f = media.files?.[0];
      if (f) return f.size <= MAX_IMAGE_BYTES;
      const url = media.urls?.[0] || media.previews?.[0] || "";
      return isHttpUrl(url);
    }

    if (mediaType === "video") {
      if (media.type !== "video") return false;
      const f = media.files?.[0];
      if (f) return f.size <= MAX_VIDEO_BYTES;
      const url = media.urls?.[0] || media.previews?.[0] || "";
      return isHttpUrl(url);
    }

    return true;
  }, [editable, mediaType, media, youtubeDraft]);

  useEffect(() => {
    if (isCreate) {
      setLegacyHtmlNotice(false);
      setStoredLinkedTrialsDetail([]);
      form.reset({
        title: "",
        description: "",
        externalLinks: [""],
        linkedTrials: [],
      });
      setTrialPickerKey((k) => k + 1);
      setMediaType("none");
      setMedia({ type: "none" });
      setYoutubeDraft("");
      clearError();
      clearTrialError();
      return;
    }

    if (blog && blogId && campaignId && userId) {
      loadFromLocalStorage(userId);
      const draft = getDraft();
      const useStore =
        draft &&
        !isExpired() &&
        draft.campaignId === campaignId &&
        draft.blogId === blogId;

      if (useStore && draft.draft) {
        const d = draft.draft;
        const ext = safeArr(d.externalLinks).slice(
          0,
          CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
        );
        const ids = safeArr(d.linkedTrials)
          .map(String)
          .filter(Boolean)
          .slice(0, MAX_LINKED_TRIALS);
        const detail = safeArr(d.linkedTrialsDetail).filter((t) => t?.id);
        const rawDescription = String(d.description ?? "");
        const useLegacyMarkdown = isLegacyCampaignBlogHtml(rawDescription);
        const description = useLegacyMarkdown
          ? legacyCampaignBlogHtmlToMarkdown(rawDescription)
          : rawDescription;
        setLegacyHtmlNotice(useLegacyMarkdown);
        setStoredLinkedTrialsDetail(detail);
        form.reset({
          title: String(d.title ?? ""),
          description,
          externalLinks: ext.length ? ext : [""],
          linkedTrials: ids,
        });
      } else {
        const ext = safeArr(blog.externalLinks)
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .map(normalizeExternalLink)
          .filter((x) => isValidExternalLink(x))
          .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS);

        const ids = safeArr(blog.linkedTrials)
          .map((x: any) =>
            typeof x === "string" ? x : String(x?._id ?? x?.id),
          )
          .filter(Boolean);

        const detail: LinkedTrialStored[] = safeArr(blog.linkedTrials)
          .filter((t: any) => t && typeof t === "object")
          .map((t: any) => ({
            id: String(t._id ?? t.id ?? ""),
            name: String(t.title ?? t.name ?? t.label ?? ""),
            image: pickTrialImage(t) || undefined,
          }))
          .filter((x) => x.id);

        const rawDescription = String(blog.description ?? "");
        const useLegacyMarkdown = isLegacyCampaignBlogHtml(rawDescription);
        const description = useLegacyMarkdown
          ? legacyCampaignBlogHtmlToMarkdown(rawDescription)
          : rawDescription;

        setStoredLinkedTrialsDetail(detail);
        form.reset({
          title: String(blog.title ?? ""),
          description,
          externalLinks: ext.length ? ext : [""],
          linkedTrials: ids,
        });
        setLegacyHtmlNotice(useLegacyMarkdown);

        setDraft({
          campaignId,
          blogId,
          expireAt: Date.now() + 30 * 60 * 1000,
          draft: {
            title: String(blog.title ?? ""),
            description,
            externalLinks: ext.length ? ext : [""],
            linkedTrials: ids,
            linkedTrialsDetail: detail,
          },
        });
      }

      const mt = detectMediaType(blog);
      setMediaType(mt);
      setMedia(detectMediaState(blog));
      const ytId = safeArr(blog.ytVideoLinks)[0] || "";
      setYoutubeDraft(
        (prev) => prev || (ytId ? `https://youtu.be/${ytId}` : ""),
      );

      setTrialPickerKey((k) => k + 1);
      clearError();
      clearTrialError();
    }
  }, [isCreate, blog, blogId, campaignId, userId]);

  useEffect(() => {
    if (isCreate || !blogId || !campaignId || !userId) return;
    const sub = form.watch((values) => {
      const ids = safeArr(values.linkedTrials)
        .map(String)
        .filter(Boolean)
        .slice(0, MAX_LINKED_TRIALS);
      setPatch(userId, {
        title: values.title,
        description: values.description,
        externalLinks: safeArr(values.externalLinks)
          .map((x) => String(x ?? ""))
          .filter(Boolean)
          .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS),
        linkedTrials: ids,
        linkedTrialsDetail: linkedTrialsView
          .filter((t) => ids.includes(t.id))
          .map((t) => ({ id: t.id, name: t.title, image: t.imageUrl })),
      });
    });
    return () => sub.unsubscribe();
  }, [blogId, campaignId, userId, setPatch, linkedTrialsView]);

  const addLinkRow = () => {
    if (!editable) return;
    const cur = safeArr(extLinks).slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS);
    if (cur.length >= CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS) return;
    form.setValue("externalLinks", [...cur, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeLinkRow = (idx: number) => {
    if (!editable) return;
    const cur = safeArr(extLinks).slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS);
    const next = cur.filter((_, i) => i !== idx);
    form.setValue("externalLinks", next.length ? next : [""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // ✅ add trial (max 3)
  const onAddTrial = (opt: ListingOption<TrialListItem> | null) => {
    if (!editable) return;
    if (!opt?.value) return;

    clearTrialError();

    const curIds = safeArr(linkedTrialIds).map(String);

    // ✅ hard limit
    if (curIds.length >= MAX_LINKED_TRIALS) {
      setTrialErrorText(`You can link maximum ${MAX_LINKED_TRIALS} trails.`);
      setTrialPickerKey((k) => k + 1); // clears selection UI
      return;
    }

    const id = String(opt.value);

    if (curIds.includes(id)) {
      setTrialPickerKey((k) => k + 1);
      return;
    }

    const nextIds = [...curIds, id];

    form.setValue("linkedTrials", nextIds, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setStoredLinkedTrialsDetail((prev) => [
      ...prev,
      {
        id,
        name: String(opt.label ?? opt.data?.title ?? opt.data?.name ?? id),
        image: pickTrialImage(opt.data),
      },
    ]);

    setTrialPickerKey((k) => k + 1);
  };

  const onRemoveTrial = async (trialId: string) => {
    if (!editable) return;

    clearTrialError();

    const nextIds = safeArr(form.getValues("linkedTrials"))
      .map(String)
      .filter((id) => id !== String(trialId));

    form.setValue("linkedTrials", nextIds, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setStoredLinkedTrialsDetail((prev) =>
      prev.filter((t) => t.id !== String(trialId)),
    );
  };

  const canMakeLive = !isCreate && !deleted && status === "draft";
  const canMoveToDraft = !isCreate && !deleted && status === "live";

  const isDisabled =
    !editable ||
    !editBlogReady ||
    blogLoadFailed ||
    saving ||
    switching ||
    form.formState.isSubmitting ||
    !form.formState.isValid ||
    !mediaValid ||
    hasLinkErrors ||
    hasDeletedLinkedTrial ||
    hasMultipleMedia;

  const getSaveDebugState = () => ({
    campaignId,
    blogId,
    isCreate,
    status,
    editable,
    editBlogReady,
    blogFetching,
    blogLoadFailed,
    blogLoadErrorText,
    isDisabled,
    saving,
    switching,
    isSubmitting: form.formState.isSubmitting,
    isValid: form.formState.isValid,
    mediaValid,
    mediaType,
    media,
    youtubeDraft,
    hasLinkErrors,
    linkRowErrors,
    hasDeletedLinkedTrial,
    hasMultipleMedia,
    formErrors: form.formState.errors,
    values: form.getValues(),
  });

  const onSave = form.handleSubmit(
    async (vals) => {
      try {
        debugBlogSave("submit:start", getSaveDebugState());
        clearError();

        if (!campaignId) throw new Error("campaignId missing");

        const title = String(vals.title || "").trim();
        const description = String(vals.description || "");

        const externalLinks = safeArr(vals.externalLinks)
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .map(normalizeExternalLink)
          .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS);

        if (externalLinks.some((l) => !isValidExternalLink(l))) {
          debugBlogSave("submit:invalid-external-link", { externalLinks });
          throw new Error("Enter valid link");
        }

        const linkedTrials = safeArr(vals.linkedTrials)
          .map(String)
          .filter(Boolean)
          .slice(0, MAX_LINKED_TRIALS); // ✅ final safety

        const mediaPayload = await buildMediaPayloadAsync({
          mediaType,
          media,
          youtubeDraft,
          uploadImage,
          uploadVideo,
        });
        debugBlogSave("submit:media-payload-ready", mediaPayload);

        if (isCreate) {
          debugBlogSave("submit:create-blog", {
            title,
            externalLinks,
            linkedTrials,
            mediaPayload,
          });
          await createBlog({
            belongsToCampaignId: campaignId,
            title,
            description,
            externalLinks,
            linkedTrials,
            ...mediaPayload,
          });
          return;
        }

        if (!blogId) return;
        if (status !== "draft") {
          debugBlogSave("submit:blocked-non-draft", { status });
          throw new Error("Move blog to Draft to edit");
        }

        debugBlogSave("submit:update-blog", {
          blogId,
          title,
          externalLinks,
          linkedTrials,
          mediaPayload,
        });
        await updateBlog({
          title,
          description,
          externalLinks,
          linkedTrials,
          ...mediaPayload,
        });
      } catch (e: any) {
        debugBlogSave("submit:error", e);
        setError(errMsg(e));
      }
    },
    (errors) => {
      const state = getSaveDebugState();
      debugBlogSave("submit:form-invalid", { errors, state });
      setError("Please fix the highlighted form errors before saving.");
    },
  );

  const onMoveToDraft = async () => {
    if (!blogId) return;
    try {
      clearError();
      await makeDraft({ campaignBlogId: blogId });
      appToast.success("Blog moved to draft. You can edit it now.");
    } catch (e: any) {
      setError(errMsg(e));
    }
  };

  const onMakeLive = async () => {
    if (!blogId) return;
    try {
      clearError();
      await makeLive({ campaignBlogId: blogId });
    } catch (e: any) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="p-4 min-h-screen">
      <div className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                {isCreate ? "Create Blog" : canEditBlog ? "Edit Blog" : "View Blog"}
              </div>
              <div className="text-xs text-black/50">
                {!canEditBlog
                  ? "You have read-only access to this blog."
                  : deleted
                  ? "Deleted blog (read-only)"
                  : isCreate
                    ? "Blog will be created as Draft"
                    : status === "live"
                      ? "Live blogs are read-only. Move to Draft to edit."
                      : "Draft blog is editable"}
              </div>
              {!isCreate ? (
                <CampaignBlogInkDAgentAttribution
                  agent={blog?.generatedByInkDAgent}
                  className="mt-2"
                />
              ) : null}
            </div>
          </div>

          {hasDeletedLinkedTrial && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-blink">
              The trail you linked recently got deleted. Would you like to link
              a new trail?
            </p>
          )}

          <div className="flex items-center gap-2">
            {!isCreate ? (
              <CampaignBlogSocialPublishButton
                disabledReason={socialPublishDisabledReason}
                size="default"
                className="h-11 rounded-xl border-[#D7DCE2] bg-white px-5 text-sm font-semibold text-[#1E293B]"
                onClick={() => {
                  onOpenPublish?.();
                }}
              />
            ) : null}

            {canEditBlog && canMoveToDraft && canSetDraft ? (
              <Button
                type="button"
                variant="outline"
                onClick={onMoveToDraft}
                disabled={switching}
              >
                {draftPending ? "Switching..." : "Move to Draft to Edit"}
              </Button>
            ) : null}

            {/* {canMakeLive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onMakeLive}
                    disabled={switching}
                  >
                    {livePending ? "Publishing..." : "Make Live"}
                  </Button>
                ) : null} */}

            {canEditBlog ? (
              <button
                type="button"
                onClick={onSave}
                disabled={isDisabled}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold text-white transition",
                  isDisabled
                    ? "bg-[#BFBFBF] cursor-not-allowed opacity-70 pointer-events-none"
                    : "bg-[#0EA5A5] hover:bg-[#0b8f8f] cursor-pointer",
                )}
              >
                {saving || form.formState.isSubmitting
                  ? "Saving..."
                  : "Save Blog"}
              </button>
            ) : null}
          </div>
        </div>

        {blogLoadErrorText || errorText ? (
          <div className="mt-4 text-sm text-red-600">
            {blogLoadErrorText || errorText}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6">
          {/* LEFT */}
          <div className="space-y-5">
            <div className="space-y-2">
              <span className="flex justify-between items-center">
                <h2 className="font-semibold text-[#111]">
                  Blog name <span className="text-red-500">*</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Max {CAMPAIGN_BLOG_MAX_TITLE_CHARS} characters
                </p>
              </span>
              <Input
                disabled={!editable}
                {...form.register("title")}
                className="bg-white"
                placeholder="Blog title"
              />
              {form.formState.errors.title?.message ? (
                <p className="text-xs text-red-600">
                  {String(form.formState.errors.title.message)}
                </p>
              ) : null}
            </div>

            {/* Links */}
            <div className="rounded-xl bg-white border border-black/10 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#111] inline-flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links (max {CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS})
                </div>

                <button
                  type="button"
                  onClick={addLinkRow}
                  disabled={
                    !editable ||
                    safeArr(extLinks).length >= CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS
                  }
                  className={cn(
                    "rounded-full bg-[#E4F2DF] px-3 py-1 text-[11px] font-semibold text-[#315326]",
                    !editable ||
                      safeArr(extLinks).length >=
                        CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS
                      ? "opacity-60 cursor-not-allowed"
                      : "",
                  )}
                >
                  + Add link
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {safeArr(extLinks)
                  .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS)
                  .map((_, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Input
                          disabled={!editable}
                          value={String(extLinks[idx] ?? "")}
                          onChange={(e) => {
                            const next = safeArr(extLinks).slice(
                              0,
                              CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS,
                            );
                            next[idx] = e.target.value;
                            form.setValue("externalLinks", next, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          placeholder="https://example.com or example.com"
                          className={cn(
                            "bg-white",
                            (form.formState.errors?.externalLinks as any)?.[idx]
                              ? "border-red-500"
                              : "",
                          )}
                        />

                        {editable ? (
                          <button
                            type="button"
                            onClick={() => removeLinkRow(idx)}
                            className="rounded-lg p-2 hover:bg-black/5"
                            title="Remove"
                          >
                            <X className="h-4 w-4 text-black/60" />
                          </button>
                        ) : null}
                      </div>

                      {(form.formState.errors?.externalLinks as any)?.[idx]
                        ?.message ? (
                        <p className="text-xs text-red-600">
                          {
                            (form.formState.errors.externalLinks as any)[idx]
                              .message
                          }
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
                  {(["image", "video", "youtube", "none"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onMediaTypeChange(t)}
                      disabled={!editable}
                      className={cn(
                        "rounded-full px-2 xl:px-3 py-1.5 text-[10px] xl:text-[12px] font-semibold border",
                        mediaType === t
                          ? "bg-[#EDEDED] border-gray-300"
                          : "bg-white border-black/10 text-black/60 hover:bg-black/5",
                        !editable && "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {t === "image"
                        ? "Image"
                        : t === "video"
                          ? "Video"
                          : t === "youtube"
                            ? "YouTube"
                            : "No Media Required"}
                    </button>
                  ))}
                </div>
              </section>

              {hasMultipleMedia && (
                <p className="mt-2 text-xs text-red-600">
                  Only one media type allowed. Please remove the other or choose
                  one type (Image, Video, or YouTube).
                </p>
              )}

              {mediaType === "image" && (
                <div className="mt-3">
                  <p className="text-sm text-black/60 mb-2">
                    JPG, PNG, WEBP, GIF. Max {BLOG_MAX_IMAGE_MB} MB.
                  </p>
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dragCounterRef.current++;
                      if (e.dataTransfer?.types?.includes("Files"))
                        setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      dragCounterRef.current = Math.max(
                        0,
                        dragCounterRef.current - 1,
                      );
                      if (dragCounterRef.current === 0) setDragOver(false);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
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
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs">
                          Drop to upload
                        </span>
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
                  {cropUIOpen && cropperImageUrl && (
                    <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                      <p className="mb-2 text-sm font-medium text-[#5E6366]">
                        Crop image
                      </p>
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={closeCropper}
                        >
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
                      className={cn(
                        "flex-1",
                        !videoPreviewUrl && "flex min-h-[240px]",
                      )}
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
                            <FileText className="h-4 w-4 text-[#78BC61]" /> +
                            Upload video ({BLOG_MAX_VIDEO_MB} MB max)
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
                    placeholder="Paste YouTube link or 11-char ID"
                    value={youtubeDraft}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && String(v).trim()) {
                        removeImage();
                        removeVideo();
                      }
                      setYoutubeDraft(v);
                    }}
                  />
                </div>
              )}
              {!hasMultipleMedia && mediaType !== "none" && !mediaValid && (
                <p className="mt-2 text-xs text-red-600">
                  {mediaType === "image"
                    ? "Please upload max 1 media of <= 20MB"
                    : mediaType === "video"
                      ? `Please upload max 1 media of <= ${BLOG_MAX_VIDEO_MB}MB`
                      : "Please upload max 1 media"}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-2">
            <span className="flex justify-between items-center">
              <h2 className="font-semibold text-[#111]">
                Description <span className="text-red-500">*</span>
              </h2>
              <p className="text-xs text-gray-500">
                Max {CAMPAIGN_BLOG_MAX_DESCRIPTION_CHARS} characters
              </p>
            </span>
            {legacyHtmlNotice ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This blog was created in the older rich-text format. It has been
                converted to markdown for editing. Save once to fully migrate
                it.
              </p>
            ) : null}
            {!editable ? (
              <CampaignBlogDescriptionReadOnly
                content={String(descVal || "")}
              />
            ) : (
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <MarkdownEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    minHeight={360}
                  />
                )}
              />
            )}

            {form.formState.errors.description?.message ? (
              <p className="text-xs text-red-600">
                {String(form.formState.errors.description.message)}
              </p>
            ) : null}

            {/* Link Trials */}
            <div className="rounded-xl bg-white border border-black/10 p-4 mt-4">
              <div className="flex items-center justify-between text-sm font-semibold text-[#111] pb-3">
                <h2 className="font-semibold text-[#111]">Link Trails</h2>
                <p className="text-black/50">
                  {Math.min(MAX_LINKED_TRIALS, linkedTrialsView.length)}/
                  {MAX_LINKED_TRIALS}
                </p>
              </div>

              <TrialSelect
                key={trialPickerKey}
                onChange={(opt) => onAddTrial(opt as any)}
                additionalFilters={{
                  belongsToCampaignIds: campaignId,
                  ...(linkedTrialIds?.length > 0
                    ? { excludeIds: linkedTrialIds.join(",") }
                    : {}),
                }}
                selectProps={{
                  isClearable: true,
                  menuPortalTarget: document.body,
                  isDisabled:
                    !editable || linkedTrialIds.length >= MAX_LINKED_TRIALS, // ✅ hard lock
                }}
                placeholder="Search trails"
              />

              {/* ✅ inline error */}
              {trialErrorText ? (
                <p className="mt-2 text-xs text-red-600">{trialErrorText}</p>
              ) : null}

              {linkedTrialsView.length ? (
                <div className="mt-3 space-y-2">
                  {linkedTrialsView?.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2",
                        t.isDeleted
                          ? "bg-red-50 border-red-200"
                          : "border-black/10 bg-[#FAFAFA]",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-black/5 overflow-hidden shrink-0">
                          {t.imageUrl ? (
                            <img
                              src={t.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              {t.isDeleted ? (
                                <Trash2 className="h-4 w-4 text-red-400" />
                              ) : (
                                <LinkIcon className="h-4 w-4 text-black/40" />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#111] truncate">
                            {t.title}
                          </div>
                          <div className="text-[11px] text-black/50 truncate">
                            {t.id}
                          </div>
                          {t.isDeleted && (
                            <p className="text-xs font-medium text-red-600 mt-1">
                              This trail no longer exists. Please unlink it
                              before saving.
                            </p>
                          )}
                        </div>
                      </div>

                      {editable ? (
                        <button
                          type="button"
                          onClick={() => onRemoveTrial(t.id)}
                          className="rounded-lg p-2 hover:bg-black/5 shrink-0"
                          title="Remove trial"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-black/50">
                  No linked trails yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
