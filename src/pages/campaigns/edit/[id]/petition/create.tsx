import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CountrySelect from "@/components/commons/selects/country-select";
import { TipTap } from "@/components/commons/editor/tiptap";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import {
  petitionCreateBaseZ,
  type PetitionCreateValues,
} from "@/schema/petition.schemas";
import { usePetitionCreateStore } from "@/stores/petition-create.store";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import {
  BaseOption,
  safeArr,
  extractYouTubeId,
} from "@/types/petition";
import { normalizeExternalLink } from "@/utils/external-links";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";
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
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";

const PETITION_MAX_IMAGE_MB = 20;
const PETITION_MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
const PETITION_CROP_VIEW_W = 600;
const PETITION_CROP_VIEW_H = 300;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const PETITION_MAX_IMAGE_BYTES = PETITION_MAX_IMAGE_MB * 1024 * 1024;
const PETITION_MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;
const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp,image/gif";

const defaultFormValues: PetitionCreateValues = {
  name: "",
  countries: [],
  externalLinks: [],
  imageLinks: [null],
  uploadedVideoLinks: [],
  youtubeId: null,
  description: "",
};

type MediaTypeKey = "none" | "image" | "video" | "youtube";

export default function PetitionCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campaignId = String(id ?? "");

  const [launchConfirmOpen, setLaunchConfirmOpen] = useState(false);
  const [mediaType, setMediaType] = useState<MediaTypeKey>("none");
  const [countryPickerKey, setCountryPickerKey] = useState(0);
  const watchThrottleRef = useRef(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(null);
  const pickedFilesRef = useRef<(File | null)[]>([null]);
  const pickedVideoRef = useRef<File | null>(null);
  const cropBySlotRef = useRef<unknown[]>([]);
  const dragCounterRef = useRef(0);
  const [cropUISlot, setCropperImageSlot] = useState<number | null>(null);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const { data: campaignResp } = useApiQuery(
    endpoints.campaigns.getCampaignByIdOwner(campaignId),
    { enabled: !!campaignId, queryKey: [endpoints.campaigns.getCampaignByIdOwner(campaignId)] } as any,
  );
  const { data: meResp } = useApiQuery(endpoints.profile.me, {
    queryKey: [endpoints.profile.me],
  } as any);

  const apiCampaign = campaignResp?.data?.data;
  const campaignName = String(apiCampaign?.name ?? "Campaign");
  const isPetitionEnabled = Boolean((apiCampaign as any)?.isPetitionEnabled);
  const {
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading: isOwnerCampaignLoading,
  } = useCampaignByOwner(campaignId);
  const userId = meResp?.data?.data?.id ?? "";

  const {
    getDraft,
    setPatch,
    resetForCampaign,
    clear,
    isExpired,
    loadFromLocalStorage,
  } = usePetitionCreateStore();

  const form = useForm<PetitionCreateValues>({
    mode: "onChange",
    resolver: zodResolver(petitionCreateBaseZ),
    defaultValues: defaultFormValues,
  });

  const { watch, setValue, formState: formState, setError, clearErrors } = form;
  const externalLinks = watch("externalLinks") ?? [];
  const countryCodes = watch("countries") ?? [];
  const imageLinks = (watch("imageLinks") ?? [null]) as [string | null];
  const uploadedVideoLinks = watch("uploadedVideoLinks") ?? [];
  const uploadedVideoVal = uploadedVideoLinks[0] ?? null;
  const countryOpts: BaseOption[] = useMemo(
    () => countryCodes.map((c) => ({ value: c, label: c })),
    [countryCodes],
  );

  const hasImage = !!(imageLinks[0] && String(imageLinks[0]).trim());
  const hasVideo = !!(uploadedVideoLinks[0] && String(uploadedVideoLinks[0]).trim());
  const hasYoutube = !!(
    (form.watch("youtubeId") ?? "") &&
    extractYouTubeId(String(form.watch("youtubeId") ?? ""))
  );
  const hasMultipleMedia =
    [hasImage, hasVideo, hasYoutube].filter(Boolean).length > 1;

  const revokeBlobUrlIfNeeded = (url: string | null) => {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
  };

  const openImagePicker = () => {
    fileRef.current?.click();
  };

  const removeImage = () => {
    revokeBlobUrlIfNeeded(imageLinks[0] ?? null);
    setValue("imageLinks", [null], { shouldDirty: true, shouldValidate: true });
    pickedFilesRef.current[0] = null;
    cropBySlotRef.current[0] = null;
    if (cropUISlot === 0) {
      if (cropperImageUrl?.startsWith("blob:")) URL.revokeObjectURL(cropperImageUrl);
      setCropperImageUrl(null);
      setCropperImageSlot(null);
    }
  };

  const applyImageToSlot = async (file: File) => {
    const isAllowed = ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]);
    if (!isAllowed) {
      setError("imageLinks.0", {
        type: "manual",
        message: "Only JPG, PNG, JPEG, WEBP, and GIF are allowed",
      });
      return;
    }
    if (file.size > PETITION_MAX_IMAGE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("imageLinks.0", {
        type: "manual",
        message: `Image is ${mb} MB. Max allowed is ${PETITION_MAX_IMAGE_MB} MB.`,
      });
      return;
    }
    clearErrors("imageLinks.0");
    revokeBlobUrlIfNeeded(imageLinks[0] ?? null);
    pickedFilesRef.current[0] = file;
    const isGif = file.type === "image/gif";
    if (isGif) {
      cropBySlotRef.current[0] = null;
      const dataUrl = await fileToDataUrl(file);
      setValue("imageLinks", [dataUrl], { shouldDirty: true, shouldValidate: true });
      return;
    }
    cropBySlotRef.current[0] = null;
    removeVideo();
    setValue("youtubeId", null, { shouldDirty: true, shouldValidate: true });
    const blobUrl = URL.createObjectURL(file);
    setCropperImageUrl(blobUrl);
    setCropperImageSlot(0);
    const dataUrl = await fileToDataUrl(file);
    setValue("imageLinks", [dataUrl], { shouldDirty: true, shouldValidate: true });
  };

  const onPickImageFile = async (file: File | null) => {
    if (!file) return;
    await applyImageToSlot(file);
  };

  const onImgDragEnter = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = (dragCounterRef.current ?? 0) + 1;
    if (e.dataTransfer?.types?.includes("Files")) setDragOverSlot(idx);
  };

  const onImgDragLeave = (e: React.DragEvent, _idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, (dragCounterRef.current ?? 1) - 1);
    if (dragCounterRef.current === 0) setDragOverSlot(null);
  };

  const onImgDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOverSlot(idx);
  };

  const onImgDrop = async (e: React.DragEvent, _idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOverSlot(null);
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await applyImageToSlot(file);
  };

  const handleSaveCrop = async () => {
    const slot = cropUISlot;
    if (slot === null || !cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as CropRect | null | undefined;
    if (!area || typeof area.x !== "number") return;
    const pendingFile = pickedFilesRef.current[slot];
    const currentMime = pendingFile?.type;
    try {
      const { file: croppedFile, url } = await cropImage(cropperImageUrl, area, {
        mime: currentMime,
        fileName: `petition-slot-${slot}`,
        quality: COMPRESS_QUALITY,
      });
      if (croppedFile.size > PETITION_MAX_IMAGE_BYTES) {
        setError("imageLinks.0", {
          type: "manual",
          message: `Cropped image exceeds ${PETITION_MAX_IMAGE_MB} MB.`,
        });
        return;
      }
      cropBySlotRef.current[slot] = area;
      revokeBlobUrlIfNeeded(imageLinks[slot] ?? null);
      setValue(
        "imageLinks",
        [url],
        { shouldDirty: true, shouldValidate: true },
      );
      clearErrors("imageLinks.0");
    } catch (err) {
      console.error("Cropping failed:", err);
    } finally {
      if (cropperImageUrl?.startsWith("blob:")) URL.revokeObjectURL(cropperImageUrl);
      setCropperImageUrl(null);
      setCropperImageSlot(null);
    }
  };

  const handleCloseCropper = () => {
    if (cropperImageUrl?.startsWith("blob:")) URL.revokeObjectURL(cropperImageUrl);
    setCropperImageUrl(null);
    setCropperImageSlot(null);
  };

  const openVideoPicker = () => videoRef.current?.click();

  const removeVideo = () => {
    pickedVideoRef.current = null;
    if (typeof uploadedVideoVal === "string" && uploadedVideoVal.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(uploadedVideoVal);
      } catch {
        /* noop */
      }
    }
    setValue("uploadedVideoLinks", [], { shouldDirty: true, shouldValidate: true });
    clearErrors("uploadedVideoLinks");
  };

  const onPickVideoFile = async (file: File | null) => {
    if (!file) return;
    if (!isAcceptedVideoUploadFile(file)) {
      setError("uploadedVideoLinks", {
        type: "manual",
        message: "Use MP4, MOV, WEBM, MKV, AVI, or M4V.",
      });
      return;
    }
    if (file.size > PETITION_MAX_VIDEO_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("uploadedVideoLinks", {
        type: "manual",
        message: `Video is ${mb} MB. Max allowed is ${PETITION_MAX_VIDEO_MB} MB.`,
      });
      return;
    }
    clearErrors("uploadedVideoLinks");
    removeImage();
    setValue("youtubeId", null, { shouldDirty: true, shouldValidate: true });
    pickedVideoRef.current = file;
    const blobUrl = URL.createObjectURL(file);
    if (typeof uploadedVideoVal === "string" && uploadedVideoVal.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(uploadedVideoVal);
      } catch {
        /* noop */
      }
    }
    setValue("uploadedVideoLinks", [blobUrl], { shouldDirty: true, shouldValidate: true });
  };

  const { uploadImage } = useImageUpload();
  const { uploadVideo } = useVideoUpload();
  const { mutateAsync: createPetitionApi, isPending: saving } = useApiMutation(
    { route: endpoints.campaigns.createPetition, method: "POST" } as any,
  );

  useEffect(() => {
    if (
      !isOwnerCampaignLoading &&
      !isBasic &&
      !isPaymentRequired &&
      isPetitionEnabled === false &&
      apiCampaign?._id
    ) {
      navigate(`/campaigns/edit/${campaignId}/add-info?blink=petition`, {
        replace: true,
      });
      appToast.error("Enable petitions in Add Info to create a petition.");
    }
  }, [
    campaignId,
    isOwnerCampaignLoading,
    isBasic,
    isPetitionEnabled,
    isPaymentRequired,
    apiCampaign?._id,
    navigate,
  ]);

  useEffect(() => {
    if (!campaignId || !userId) return;
    loadFromLocalStorage(userId);
    const draft = getDraft();

    if (!draft || isExpired()) {
      resetForCampaign(userId, campaignId, defaultFormValues);
      form.reset(defaultFormValues);
      return;
    }
    if (draft.campaignId !== campaignId) {
      resetForCampaign(userId, campaignId, defaultFormValues);
      form.reset(defaultFormValues);
      return;
    }
    const d = draft.draft as Partial<PetitionCreateValues>;
    form.reset({
      name: d.name ?? "",
      countries: Array.isArray(d.countries) ? d.countries.filter((c): c is string => typeof c === "string") : [],
      externalLinks: Array.isArray(d.externalLinks) ? d.externalLinks.filter((l): l is string => typeof l === "string") : [],
      imageLinks: Array.isArray(d.imageLinks) && d.imageLinks.length > 0 ? [d.imageLinks[0] ?? null] as [string | null] : [null],
      uploadedVideoLinks: Array.isArray(d.uploadedVideoLinks) ? d.uploadedVideoLinks.filter((v): v is string | null => v === null || typeof v === "string") : [],
      youtubeId: d.youtubeId ?? null,
      description: d.description ?? "",
    });
  }, [campaignId, userId]);

  useEffect(() => {
    if (!userId || !campaignId) return;
    const sub = watch((values) => {
      if (Date.now() - watchThrottleRef.current < 500) return;
      watchThrottleRef.current = Date.now();
      setPatch(userId, {
        name: values.name,
        countries: Array.isArray(values.countries) ? values.countries.filter((c): c is string => typeof c === "string") : [],
        externalLinks: Array.isArray(values.externalLinks) ? values.externalLinks.filter((l): l is string => typeof l === "string") : [],
        imageLinks: Array.isArray(values.imageLinks) && values.imageLinks.length > 0 ? [values.imageLinks[0] ?? null] as [string | null] : [null],
        uploadedVideoLinks: Array.isArray(values.uploadedVideoLinks) ? values.uploadedVideoLinks.filter((v): v is string | null => v === null || typeof v === "string") : [],
        youtubeId: values.youtubeId,
        description: values.description,
      });
    });
    return () => sub.unsubscribe();
  }, [watch, userId, campaignId, setPatch]);

  const goTab = (tab: CampaignTabKey) => {
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const addLink = () => {
    const cur = safeArr(externalLinks).slice(0, 3);
    if (cur.length >= 3) return;
    setValue("externalLinks", [...cur, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeLinkAt = (idx: number) => {
    const cur = safeArr(form.getValues("externalLinks")).slice(0, 3);
    const next = cur.filter((_, i) => i !== idx);
    setValue("externalLinks", next, { shouldDirty: true, shouldValidate: true });
  };

  const onCountriesChange = (opts: BaseOption[]) => {
    const codes = safeArr(opts).map((o) => String(o.value));
    setValue("countries", codes.slice(0, 1), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  async function uploadMediaIfNeeded(): Promise<{
    uploadedImageLinks: string[];
    uploadedVideoLinks: string[];
    ytVideoLinks: string[];
  }> {
    const v = form.getValues();
    const img0 = v.imageLinks?.[0];
    const vid0 = v.uploadedVideoLinks?.[0];
    const ytId = extractYouTubeId(String(v.youtubeId ?? ""));

    let uploadedImageLinks: string[] = [];
    if (img0 && typeof img0 === "string" && img0.trim().startsWith("http")) {
      uploadedImageLinks = [img0.trim()];
    } else if (img0) {
      let file = pickedFilesRef.current[0];
      if (file) {
        const crop = cropBySlotRef.current[0];
        if (crop) {
          const srcUrl = URL.createObjectURL(file);
          try {
            const { file: croppedFile } = await cropImage(srcUrl, crop as any, {
              mime: file.type,
              fileName: "petition-slot-0",
              quality: COMPRESS_QUALITY,
            });
            file = croppedFile;
          } finally {
            URL.revokeObjectURL(srcUrl);
          }
        }
        const url = await uploadImage(file);
        if (url) uploadedImageLinks = [url];
      }
    }

    let uploadedVideoLinks: string[] = [];
    if (vid0) {
      const file = pickedVideoRef.current;
      if (file) {
        const url = await uploadVideo(file);
        if (url) uploadedVideoLinks = [url];
      } else if (typeof vid0 === "string" && vid0.trim().startsWith("http")) {
        uploadedVideoLinks = [vid0.trim()];
      }
    }

    const ytVideoLinks = ytId ? [ytId] : [];
    return {
      uploadedImageLinks,
      uploadedVideoLinks,
      ytVideoLinks,
    };
  }

  const onSubmit = async (v: PetitionCreateValues) => {
    const mediaPayload = await uploadMediaIfNeeded();
    const payload = {
      belongsToCampaignId: campaignId,
      name: v.name.trim(),
      description: v.description.trim(),
      targetGeo: { countries: v.countries?.slice(0, 1) ?? [] },
      externalLinks: (v.externalLinks ?? [])
        .map((s) => String(s ?? "").trim())
        .filter(Boolean)
        .map((s) => normalizeExternalLink(s)),
      uploadedImageLinks: mediaPayload.uploadedImageLinks,
      uploadedVideoLinks: mediaPayload.uploadedVideoLinks,
      ytVideoLinks: mediaPayload.ytVideoLinks,
    };
    try {
      await createPetitionApi(payload as any);
      appToast.success("Petition launched");
      clear(userId);
      setLaunchConfirmOpen(false);
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getPetitionsListings],
      });
      navigate(`/campaigns/edit/${campaignId}/petition`);
    } catch (e: any) {
      appToast.error(e?.message || "Create failed");
    }
  };

  const canLaunch =
    !!campaignId &&
    !!form.watch("name")?.trim() &&
    (form.watch("description")?.trim()?.length ?? 0) >= 100 &&
    !hasMultipleMedia;

  const hasUnsavedChanges = formState.isDirty;

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={campaignId}
          campaignName={campaignName}
          activeTab="petitions"
          onTabChange={(t) => requestLeave(() => goTab(t))}
          onBack={() => requestLeave(() => navigate(`/campaigns/edit/${campaignId}/petition`))}
          onRewards={() => { }}
        >
          {isPaymentRequired ? (
            <div className="p-4 min-h-screen">
              <CampaignPaymentRequiredPrompt
                campaignId={campaignId}
                featureName="Petitions"
                isMainOwner={isMainOwner}
                billingMode={billingMode}
              />
            </div>
          ) : isBasic ? (
            <div className="p-4 min-h-screen">
              <BasicFeatureUpgradePrompt
                campaignId={campaignId}
                featureName="Petitions"
                isMainOwner={isMainOwner}
              />
            </div>
          ) : (
          <div className="p-4 min-h-screen">
            <div className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      requestLeave(() =>
                        navigate(`/campaigns/edit/${campaignId}/petition`),
                      )
                    }
                    className="rounded-xl bg-white border border-black/10 px-2 py-2 hover:bg-black/5"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="text-lg font-semibold text-[#111]">
                      Create Petition
                    </div>
                    <div className="text-xs text-black/50">
                      Launch a petition for this campaign.
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleSubmitNormalized(
                  petitionCreateBaseZ as any,
                  form,
                  onSubmit,
                )}
                className="mt-6 grid grid-cols-2 gap-6"
                noValidate
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <header className="flex items-center justify-between">
                      <h2 className="font-semibold text-[#111]">Petition name <span className="text-red-500">*</span></h2>
                      <p className="text-gray-500 text-sm">Max 30 characters</p></header>
                    <Input
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
                      placeholder="Select country"
                      onChange={(opt: any) => {
                        if (!opt?.value) return;
                        const cur = countryOpts;
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
                        ].slice(0, 1);
                        onCountriesChange(next);
                        setCountryPickerKey((k) => k + 1);
                      }}
                      selectProps={{
                        isClearable: true,
                        menuPortalTarget: document.body,
                      }}
                    />
                    {countryOpts.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {countryOpts.map((c) => (
                          <div
                            key={String(c.value)}
                            className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-3 py-1 text-xs"
                          >
                            <span className="font-semibold text-[#111]">
                              {String(c.label || c.value)}
                            </span>
                            <button
                              type="button"
                              className="rounded-full p-1 hover:bg-black/5"
                              onClick={() =>
                                onCountriesChange(
                                  countryOpts.filter(
                                    (x) => String(x.value) !== String(c.value),
                                  ),
                                )
                              }
                              title="Remove"
                            >
                              <X className="h-3 w-3 text-black/60" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-white border border-black/10 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-[#111]">
                        External Links
                      </h2>
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
                      {safeArr(externalLinks)
                        .slice(0, 3)
                        .map((_, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-1"
                          >
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="https://example.com or example.com"
                                value={String(externalLinks[idx] ?? "")}
                                onChange={(e) => {
                                  const next = [...(externalLinks ?? [])];
                                  next[idx] = e.target.value;
                                  setValue("externalLinks", next, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                className={cn(
                                  (form.formState.errors?.externalLinks as any)?.[idx]?.message
                                    ? "border-red-500"
                                    : "",
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => removeLinkAt(idx)}
                                className="rounded-lg p-2 hover:bg-black/5"
                                title="Remove link"
                              >
                                <X className="h-4 w-4 text-black/60" />
                              </button>
                            </div>
                            {(form.formState.errors?.externalLinks as any)?.[idx]?.message ? (
                              <p className="text-xs text-red-600">
                                {(form.formState.errors?.externalLinks as any)[idx].message}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      {form.formState.errors?.externalLinks?.message && !Array.isArray(form.formState.errors?.externalLinks) ? (
                        <p className="text-xs text-red-600">
                          {String(form.formState.errors.externalLinks.message)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-black/10 p-4">
                    <section className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-[#111]">Media</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(["image", "video", "youtube", "none"] as const).map(
                          (t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setMediaType(t)}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-[12px] font-semibold border capitalize",
                                mediaType === t
                                  ? "bg-[#EDEDED] border-gray-300 text-[#111]"
                                  : "bg-white border-black/10 text-black/60 hover:bg-black/5",
                              )}
                            >
                              {t === "image" ? "Image" : t === "video" ? "Video" : t === "youtube" ? "YouTube" : "No Media Required"}
                            </button>
                          ),
                        )}
                      </div></section>

                    {hasMultipleMedia && (
                      <p className="mt-2 text-xs text-red-600">
                        Only one media type allowed (image, video, or YouTube).
                        Remove others or switch tab.
                      </p>
                    )}

                    {mediaType === "image" ? (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-black/60">
                          JPG, PNG, JPEG, WEBP, GIF. Max {PETITION_MAX_IMAGE_MB} MB.
                        </p>
                        <div
                          onDragEnter={(e) => onImgDragEnter(e, 0)}
                          onDragLeave={(e) => onImgDragLeave(e, 0)}
                          onDragOver={(e) => onImgDragOver(e, 0)}
                          onDrop={(e) => onImgDrop(e, 0)}
                          className={cn(
                            "relative rounded-xl transition-all",
                            dragOverSlot === 0 && "ring-2 ring-[#78BC61] ring-dashed",
                          )}
                        >
                          <ImageSlot
                            size="big"
                            value={imageLinks[0]}
                            onPick={openImagePicker}
                            onRemove={removeImage}
                            error={form.formState.errors?.imageLinks?.[0]?.message as string | undefined}
                          />
                          {dragOverSlot === 0 && (
                            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium">
                                Drop to upload
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept={ACCEPT_IMAGE}
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            onPickImageFile(f);
                            e.currentTarget.value = "";
                          }}
                        />
                        {cropUISlot !== null && cropperImageUrl && (
                          <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                            <p className="mb-2 text-sm font-medium text-[#5E6366]">
                              Crop image
                            </p>
                            <div
                              className="relative w-full overflow-hidden rounded-lg bg-[#dfd7d7]"
                              style={{ height: PETITION_CROP_VIEW_H }}
                            >
                              <EasyReactCropper
                                key={cropperImageUrl}
                                image={cropperImageUrl}
                                ref={cropperRef as any}
                                width={PETITION_CROP_VIEW_W}
                                height={PETITION_CROP_VIEW_H}
                              />
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseCropper}
                              >
                                Cancel
                              </Button>
                              <Button type="button" onClick={handleSaveCrop}>
                                Apply Crop
                              </Button>
                            </div>
                          </div>
                        )}
                        {form.formState.errors?.imageLinks ? (
                          <p className="text-[11px] text-red-600">
                            {String(form.formState.errors.imageLinks.message ?? "")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {mediaType === "video" ? (
                      <div className="mt-3">
                        <p className="text-sm text-black/60 mb-2">
                          {VIDEO_UPLOAD_HELPER_TEXT}
                        </p>
                        <MediaDropzone
                          accept={VIDEO_UPLOAD_ACCEPT}
                          onFiles={(files) => {
                            const f = files[0];
                            if (f) onPickVideoFile(f);
                          }}
                          onPickClick={openVideoPicker}
                          className={cn(
                            "rounded-xl bg-white border border-black/10 p-3",
                            !uploadedVideoVal && "min-h-[170px] flex flex-col",
                          )}
                        >
                          <div
                            className={cn("flex-1", !uploadedVideoVal && "flex min-h-[170px]")}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {uploadedVideoVal ? (
                              <div className="relative">
                                <video
                                  src={
                                    typeof uploadedVideoVal === "string"
                                      ? uploadedVideoVal
                                      : undefined
                                  }
                                  playsInline
                                  controls
                                  muted
                                  autoPlay
                                  loop
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
                            const f = e.target.files?.[0] ?? null;
                            onPickVideoFile(f);
                            e.currentTarget.value = "";
                          }}
                        />
                        {form.formState.errors?.uploadedVideoLinks ? (
                          <p className="mt-2 text-[11px] text-red-600">
                            {String(form.formState.errors.uploadedVideoLinks.message ?? "")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {mediaType === "youtube" ? (
                      <div className="mt-3 rounded-xl border border-black/10 bg-[#F7F7F7] p-3">
                        <Label>YouTube URL or Video ID</Label>
                        <Input
                          className="mt-2"
                          placeholder="Paste a YouTube link or 11-char ID"
                          value={form.watch("youtubeId") ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setValue("youtubeId", v, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            if (extractYouTubeId(v)) {
                              removeImage();
                              removeVideo();
                            }
                          }}
                        />
                        {form.formState.errors?.youtubeId?.message ? (
                          <p className="mt-1 text-xs text-red-600">
                            {form.formState.errors.youtubeId.message}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-[#111]">Description <span className="text-red-500">*</span></h2>
                    <p className="text-gray-500 text-sm">Max 12000 characters</p>
                    {/* <span>
                      {(() => {
                        const raw = String(form.watch("description") ?? "");
                        const len = raw.length;
                        const RICH_TEXT_EMPTY_LENGTH = 7;
                        const displayCount =
                          len <= RICH_TEXT_EMPTY_LENGTH ? 0 : len;
                        return `${displayCount}/12000`;
                      })()}
                    </span> */}
                  </div>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <TipTap
                        description={field.value || ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {form.formState.errors.description?.message ? (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.description.message}
                    </p>
                  ) : null}
                </div>
              </form>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={
                    !canLaunch ||
                    saving ||
                    formState.isSubmitting ||
                    !formState.isValid 
                   
                  }
                  onClick={() => setLaunchConfirmOpen(true)}
                  className={cn(
                    "rounded-full px-6 py-3 text-sm font-semibold text-white",
                    canLaunch &&
                      !saving &&
                      !formState.isSubmitting &&
                      formState.isValid
                      ? "bg-[#0EA5A5] hover:bg-[#0b8f8f]"
                      : "bg-[#BFBFBF] cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {saving || formState.isSubmitting
                    ? "Launching..."
                    : "Launch Petition"}
                </button>
              </div>
            </div>
          </div>
          )}

          <CampaignActionConfirmModal
            open={launchConfirmOpen}
            title="Launch petition?"
            description="This will create the petition for this campaign. You can edit links, countries and media later."
            confirmLabel="Confirm & Launch"
            loading={saving || formState.isSubmitting || !formState.isValid}
            onClose={() => setLaunchConfirmOpen(false)}
            onConfirm={() =>
              form.handleSubmit((v) => onSubmit(v))()
            }
          />
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
