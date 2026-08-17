import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import apiInstance, { BASE_URL } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  blogCreateBaseZ,
  type BlogCreateValues,
} from "@/schema/blog.schemas";
import { useCampaignBlogCreateStore, type LinkedTrialStored } from "@/stores/campaign-blog-create.store";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/types/petition";
import { normalizeExternalLink } from "@/utils/external-links";
import { cropImage, type CropRect } from "@/utils/media/cropImage";
import { COMPRESS_QUALITY } from "@/utils/media/compressImage";
import { fileToDataUrl } from "@/utils/fileToDataUrl"; 
import { ALLOWED_IMAGE_TYPES, BLOG_MAX_IMAGE_MB, BLOG_MAX_VIDEO_MB, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS, defaultFormValues, MAX_IMAGE_BYTES, MAX_LINKED_TRIALS, MAX_VIDEO_BYTES, pickTrialImage, revokeBlob, safeArr } from "@/constants/blog-create.constants";
import { isAcceptedVideoUploadFile } from "@/utils/media/video-upload.constants";

export type LinkedTrialView = {
  id: string;
  title: string;
  imageUrl?: string | null;
  isDeleted: boolean;
};

export type MediaSectionHandlers = {
  openImagePicker: () => void;
  removeImage: () => void;
  applyImage: (file: File) => Promise<void>;
  onImgDrop: (e: React.DragEvent) => void;
  handleSaveCrop: () => void;
  closeCropper: () => void;
  openVideoPicker: () => void;
  removeVideo: () => void;
  onMediaTypeChange: (next: "image" | "video" | "youtube" | "none") => void;
  onVideoFile: (file: File | null) => void;
};

export type MediaSectionRefs = {
  fileRef: React.RefObject<HTMLInputElement | null>;
  videoRef: React.RefObject<HTMLInputElement | null>;
  cropperRef: React.RefObject<{ getCroppedAreaPixels: () => unknown } | null>;
  dragCounterRef: React.MutableRefObject<number>;
};

export function useBlogCreateForm(campaignId: string) {
  const watchThrottleRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(null);
  const pickedFileRef = useRef<File | null>(null);
  const pickedVideoRef = useRef<File | null>(null);
  const cropAreaRef = useRef<unknown>(null);
  const dragCounterRef = useRef(0);

  const [cropUIOpen, setCropUIOpen] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [trialPickerKey, setTrialPickerKey] = useState(0);
  const [storedLinkedTrialsDetail, setStoredLinkedTrialsDetail] = useState<LinkedTrialStored[]>([]);

  const { data: meResp } = useApiQuery(endpoints.profile.me, {} as any);
  const userId = String(meResp?.data?.data?.id ?? "");

  const {
    getDraft,
    setPatch,
    resetForCampaign,
    clear,
    isExpired,
    loadFromLocalStorage,
  } = useCampaignBlogCreateStore();

  const form = useForm<BlogCreateValues>({
    mode: "onChange",
    resolver: zodResolver(blogCreateBaseZ as any),
    defaultValues: defaultFormValues,
  });

  const { watch, setValue, setError, clearErrors } = form;
  const imageLink = watch("imageLink");
  const videoLink = watch("videoLink");
  const linkedTrialIds = watch("linkedTrials") ?? [];

  const trialQueries = useQueries({
    queries: (linkedTrialIds as string[]).filter(Boolean).map((trialId) => ({
      queryKey: ["campaign-trial", trialId] as const,
      queryFn: async () => {
        const res = await apiInstance.get(
          `${BASE_URL}${endpoints.campaigns.getTrialById(trialId)}`
        );
        const data = res?.data;
        return (data?.data ?? data?.trial ?? data) as any;
      },
      enabled: !!trialId,
      staleTime: 60_000,
    })),
  });

  const linkedTrialsView = useMemo((): LinkedTrialView[] => {
    const ids = (linkedTrialIds as string[]).filter(Boolean);
    return ids.map((tid, i) => {
      const q = trialQueries[i];
      const raw = q?.data as any;
      const fromStored = storedLinkedTrialsDetail.find((s) => s.id === tid);
      const title =
        raw?.title ?? raw?.name ?? raw?.label ?? fromStored?.name ?? tid;
      const imageUrl = pickTrialImage(raw) ?? fromStored?.image;
      const isDeleted =
        q?.isError || (raw && (!!raw.archivedAt || raw.status === "deleted"));
      return { id: tid, title, imageUrl, isDeleted: !!isDeleted };
    });
  }, [linkedTrialIds, trialQueries, storedLinkedTrialsDetail]);

  const hasDeletedLinkedTrial = linkedTrialsView.some((t) => t.isDeleted);

  const onAddTrial = (opt: { value?: string; label?: string; data?: any } | null) => {
    if (!opt?.value) return;
    const curIds = (linkedTrialIds as string[]).filter(Boolean);
    if (curIds.length >= MAX_LINKED_TRIALS) return;
    const tid = String(opt.value);
    if (curIds.includes(tid)) return;
    setValue("linkedTrials", [...curIds, tid], { shouldDirty: true, shouldValidate: true });
    setStoredLinkedTrialsDetail((prev) => [
      ...prev,
      {
        id: tid,
        name: String(opt.label ?? opt.data?.title ?? opt.data?.name ?? tid),
        image: pickTrialImage(opt.data),
      },
    ]);
    setTrialPickerKey((k) => k + 1);
  };

  const onRemoveTrial = (trialId: string) => {
    const next = (linkedTrialIds as string[]).filter((id) => id !== trialId);
    setValue("linkedTrials", next, { shouldDirty: true, shouldValidate: true });
    setStoredLinkedTrialsDetail((prev) => prev.filter((t) => t.id !== trialId));
    setTrialPickerKey((k) => k + 1);
  };

  const { uploadImage } = useImageUpload();
  const { uploadVideo } = useVideoUpload();
  const { mutateAsync: createBlog, isPending: saving } = useApiMutation({
    route: endpoints.campaigns.createBlog,
    method: "POST",
  } as any);

  useEffect(() => {
    if (!campaignId || !userId) return;
    loadFromLocalStorage(userId);
    const draft = getDraft();
    if (!draft || isExpired()) {
      setStoredLinkedTrialsDetail([]);
      resetForCampaign(userId, campaignId, defaultFormValues as any);
      form.reset(defaultFormValues);
      return;
    }
    if (draft.campaignId !== campaignId) {
      setStoredLinkedTrialsDetail([]);
      resetForCampaign(userId, campaignId, defaultFormValues as any);
      form.reset(defaultFormValues);
      return;
    }
    const d = draft.draft as any;
    const linkedIds = Array.isArray(d.linkedTrials)
      ? d.linkedTrials
          .map((t: string | LinkedTrialStored) => (typeof t === "string" ? t : t?.id))
          .filter(Boolean)
          .slice(0, MAX_LINKED_TRIALS)
      : [];
    const detail = Array.isArray(d.linkedTrialsDetail)
      ? d.linkedTrialsDetail
      : Array.isArray(d.linkedTrials)
        ? d.linkedTrials
            .filter((t: any) => t && typeof t === "object" && t.id)
            .map((t: any) => ({ id: t.id, name: t.name ?? t.title, image: t.image ?? t.imageUrl }))
        : [];
    setStoredLinkedTrialsDetail(detail);
    form.reset({
      title: d.title ?? "",
      description: d.description ?? "",
      externalLinks: Array.isArray(d.externalLinks)
        ? (d.externalLinks as unknown[]).filter((l: unknown): l is string => typeof l === "string")
        : [],
      mediaType: d.mediaType ?? "none",
      imageLink: d.imageLink ?? null,
      videoLink: d.videoLink ?? null,
      youtubeId: d.youtubeId ?? null,
      linkedTrials: linkedIds,
    });
  }, [campaignId, userId]);

  useEffect(() => {
    if (!userId || !campaignId) return;
    const sub = watch((values) => {
      if (Date.now() - watchThrottleRef.current < 500) return;
      watchThrottleRef.current = Date.now();
      const ids = Array.isArray(values.linkedTrials)
        ? values.linkedTrials
            .filter((t): t is string => typeof t === "string")
            .slice(0, MAX_LINKED_TRIALS)
        : [];
      setPatch(userId, {
        title: values.title,
        description: values.description,
        externalLinks: Array.isArray(values.externalLinks)
          ? values.externalLinks.filter((l): l is string => typeof l === "string")
          : [],
        mediaType: values.mediaType,
        imageLink: values.imageLink,
        videoLink: values.videoLink,
        youtubeId: values.youtubeId,
        linkedTrials: ids,
        linkedTrialsDetail: linkedTrialsView
          .filter((t) => ids.includes(t.id))
          .map((t) => ({ id: t.id, name: t.title, image: t.imageUrl ?? undefined })),
      });
    });
    return () => sub.unsubscribe();
  }, [watch, userId, campaignId, setPatch, linkedTrialsView]);

  const removeImage = () => {
    revokeBlob(imageLink ?? null);
    setValue("imageLink", null, { shouldDirty: true });
    pickedFileRef.current = null;
    cropAreaRef.current = null;
    if (cropperImageUrl?.startsWith("blob:")) URL.revokeObjectURL(cropperImageUrl);
    setCropperImageUrl(null);
    setCropUIOpen(false);
  };

  const removeVideo = () => {
    revokeBlob(videoLink ?? null);
    pickedVideoRef.current = null;
    setValue("videoLink", null, { shouldDirty: true });
    clearErrors("videoLink");
  };

  const openImagePicker = () => fileRef.current?.click();

  const applyImage = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setError("imageLink", { message: "Only JPG, PNG, JPEG, WEBP, GIF allowed" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("imageLink", { message: `Max ${BLOG_MAX_IMAGE_MB} MB` });
      return;
    }
    clearErrors("imageLink");
    removeVideo();
    setValue("youtubeId", null, { shouldDirty: true });
    revokeBlob(imageLink ?? null);
    pickedFileRef.current = file;
    if (file.type === "image/gif") {
      const dataUrl = await fileToDataUrl(file);
      setValue("imageLink", dataUrl, { shouldDirty: true });
      return;
    }
    cropAreaRef.current = null;
    const blobUrl = URL.createObjectURL(file);
    setCropperImageUrl(blobUrl);
    setCropUIOpen(true);
    const dataUrl = await fileToDataUrl(file);
    setValue("imageLink", dataUrl, { shouldDirty: true });
  };

  const onImgDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    await applyImage(file);
  };

  const handleSaveCrop = async () => {
    if (!cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as CropRect | null | undefined;
    if (!area || typeof area.x !== "number") return;
    const file = pickedFileRef.current;
    try {
      const { url } = await cropImage(cropperImageUrl, area, {
        mime: file?.type,
        fileName: "blog-cover",
        quality: COMPRESS_QUALITY,
      });
      cropAreaRef.current = area;
      revokeBlob(imageLink ?? null);
      setValue("imageLink", url, { shouldDirty: true });
      clearErrors("imageLink");
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

  const openVideoPicker = () => videoRef.current?.click();

  const onMediaTypeChange = (next: "image" | "video" | "youtube" | "none") => {
    if (watch("mediaType") === next) return;
    setValue("mediaType", next, { shouldDirty: true });
  };

  const onVideoFile = async (file: File | null) => {
    if (!file) return;
    if (!isAcceptedVideoUploadFile(file)) {
      setError("videoLink", { message: "Use MP4, MOV, WEBM, MKV, AVI, or M4V." });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("videoLink", { message: `Max ${BLOG_MAX_VIDEO_MB} MB` });
      return;
    }
    clearErrors("videoLink");
    removeImage();
    setValue("youtubeId", null, { shouldDirty: true });
    pickedVideoRef.current = file;
    revokeBlob(videoLink ?? null);
    const blobUrl = URL.createObjectURL(file);
    setValue("videoLink", blobUrl, { shouldDirty: true });
  };

  async function buildMediaPayload(): Promise<{
    uploadedImageLinks: string[];
    uploadedVideoLinks: string[];
    ytVideoLinks: string[];
  }> {
    const mt = form.getValues("mediaType");
    const img = form.getValues("imageLink");
    const vid = form.getValues("videoLink");
    const yt = extractYouTubeId(String(form.getValues("youtubeId") ?? ""));

    if (mt === "image" && img) {
      if (typeof img === "string" && img.trim().startsWith("http")) {
        return { uploadedImageLinks: [img.trim()], uploadedVideoLinks: [], ytVideoLinks: [] };
      }
      let file = pickedFileRef.current;
      if (file) {
        const crop = cropAreaRef.current;
        if (crop) {
          const src = URL.createObjectURL(file);
          try {
            const { file: f } = await cropImage(src, crop as CropRect, {
              mime: file.type,
              fileName: "blog-cover",
              quality: COMPRESS_QUALITY,
            });
            file = f;
          } finally {
            URL.revokeObjectURL(src);
          }
        }
        const url = await uploadImage(file);
        if (url) return { uploadedImageLinks: [url], uploadedVideoLinks: [], ytVideoLinks: [] };
      }
    }
    if (mt === "video" && vid) {
      const file = pickedVideoRef.current;
      if (file) {
        const url = await uploadVideo(file);
        if (url) return { uploadedImageLinks: [], uploadedVideoLinks: [url], ytVideoLinks: [] };
      }
      if (typeof vid === "string" && vid.startsWith("http"))
        return { uploadedImageLinks: [], uploadedVideoLinks: [vid], ytVideoLinks: [] };
    }
    if (mt === "youtube" && yt) {
      return { uploadedImageLinks: [], uploadedVideoLinks: [], ytVideoLinks: [yt] };
    }
    return { uploadedImageLinks: [], uploadedVideoLinks: [], ytVideoLinks: [] };
  }

  const onSubmit = async (
    v: BlogCreateValues,
    onSuccess: () => void
  ) => {
    try {
      const media = await buildMediaPayload();
      const payload = {
        belongsToCampaignId: campaignId,
        title: v.title.trim(),
        description: v.description.trim(),
        externalLinks: safeArr(v.externalLinks)
          .map((s) => String(s).trim())
          .filter(Boolean)
          .map(normalizeExternalLink)
          .slice(0, CAMPAIGN_BLOG_MAX_EXTERNAL_LINKS),
        linkedTrials: safeArr(v.linkedTrials).map(String).filter(Boolean).slice(0, MAX_LINKED_TRIALS),
        ...media,
      };
      await createBlog(payload as any);
      clear(userId);
      queryClient.invalidateQueries({ queryKey: [endpoints.campaigns.blogsAdvancedListing] });
      appToast.success("Blog created");
      onSuccess();
    } catch (e: any) {
      appToast.error(e?.message ?? "Create failed");
    }
  };

  const youtubeIdVal = watch("youtubeId");
  const hasImage = !!(imageLink && String(imageLink).trim());
  const hasVideo = !!videoLink;
  const hasYoutube = !!(youtubeIdVal && String(youtubeIdVal).trim());
  const hasMultipleMedia = [hasImage, hasVideo, hasYoutube].filter(Boolean).length > 1;

  const canSubmit =
    !!campaignId &&
    !!form.watch("title")?.trim() &&
    (form.watch("description")?.trim()?.length ?? 0) > 0 &&
    form.formState.isValid &&
    !hasDeletedLinkedTrial &&
    !hasMultipleMedia;

  const mediaHandlers: MediaSectionHandlers = {
    openImagePicker,
    removeImage,
    applyImage,
    onImgDrop,
    handleSaveCrop,
    closeCropper,
    openVideoPicker,
    removeVideo,
    onMediaTypeChange,
    onVideoFile,
  };

  const mediaRefs: MediaSectionRefs = {
    fileRef,
    videoRef,
    cropperRef,
    dragCounterRef,
  };

  return {
    form,
    userId,
    trialPickerKey,
    linkedTrialsView,
    hasDeletedLinkedTrial,
    onAddTrial,
    onRemoveTrial,
    saving,
    onSubmit,
    canSubmit,
    hasUnsavedChanges: form.formState.isDirty,
    cropUIOpen,
    cropperImageUrl,
    dragOver,
    setDragOver,
    mediaHandlers,
    mediaRefs,
  };
}
