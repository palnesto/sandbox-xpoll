import { useRef, useState, useEffect, DragEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  trailCreateZ,
  type TrailCreateValues,
  type PollResourceAsset,
} from "@/schema/campaign.schemas";
import {
  useCreateCampaignStore,
  type TrailPoll,
  type TrailReward,
} from "@/stores/create-campaign.store";
import TrailModals, { type TrailModalKey } from "@/components/modals/trail-modals";
import type { RewardsForm } from "@/schema/create-user-poll";
import type { UseMutationResult } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryClient } from "@/api/queryClient";
import apiInstance from "@/api/queryClient";
import { extractYouTubeId } from "@/types/petition";
import { appToast } from "@/utils/toast";
import { endpoints } from "@/api/endpoints";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import { CreateTrialPayload } from "@/types/campaigns";

import { TrailCreateNameField } from "./TrailCreateNameField";
import { TrailCreateDescriptionField } from "./TrailCreateDescriptionField";
import { TrailCreateMediaSection } from "./TrailCreateMediaSection";
import { TrailCreatePollsSection, getPollIssues } from "./TrailCreatePollsSection";
import { TrailCreateRewardsSection } from "./TrailCreateRewardsSection";
import { TrailCreateFooter } from "./TrailCreateFooter";
import { TrailExcelPatchButton } from "./TrailExcelPatchButton";
import {
  TrailLlmSuggestionBox,
  type TrailSuggestionPatch,
} from "./TrailLlmSuggestionBox";

import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type TrialExcelFormPatch } from "@/utils/excel-upload";

import { isDataUrl, dataUrlToFile } from "../../../utils/trail-create-utils";
import {
  TRIAL_MAX_IMAGE_BYTES,
  TRIAL_MAX_VIDEO_BYTES,
  TRIAL_MAX_IMAGE_MB,
  TRIAL_MAX_VIDEO_MB,
  ACCEPT_IMAGE,
  MAX_DRAFT_TRAILS_CAMPAIGN,
  MAX_DRAFT_TRAILS_STANDALONE,
} from "../../../constants/trail-create-constants";
import { ArrowLeft } from "lucide-react";
import { cropImage, type CropRect } from "@/utils/media/cropImage";
import { COMPRESS_QUALITY } from "@/utils/media/compressImage";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { isAcceptedVideoUploadFile } from "@/utils/media/video-upload.constants";
import { withAssetUploadProgressBatch } from "@/stores/asset-upload-progress.store";

const makeTrailPollId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

type TrailContentPatch = TrailSuggestionPatch | TrialExcelFormPatch;

export default function TrailCreateView({
  canEdit,
  onViewAllTrails,
  onSaved,
  initialDataFromDraft,
  onDraftSaved,
  mode = "create",
  trialId,
  initialValuesForLaunchedEdit,
  onMediaSaved,
  draftId,
  onDraftUpdated,
  onLoadToCreate,
  canDraftCreate = true,
  onDirtyChange,
  isStandalone = false,
  allowAiSuggestions = true,
}: {
  canEdit: boolean;
  onViewAllTrails: () => void;
  onSaved: () => void;
  initialDataFromDraft?: {
    title?: string | null;
    description?: string | null;
    resourceAssets?: Array<{ type: "youtube" | "image" | "video"; value: string }>;
    rewards?: Array<{ assetId: string; amount: number; rewardAmountCap: number; rewardType: "min" | "max" }>;
    polls?: Array<{ title?: string; description?: string; options?: string[]; resourceAssets?: Array<{ type: string; value: string }> }>;
  };
  onDraftSaved?: () => void;
  mode?: "create" | "edit-launched" | "edit-draft";
  trialId?: string;
  initialValuesForLaunchedEdit?: TrailCreateValues;
  onMediaSaved?: () => void;
  draftId?: string;
  onDraftUpdated?: () => void;
  onLoadToCreate?: (payload: Record<string, unknown>) => void;
  canDraftCreate?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  isStandalone?: boolean;
  allowAiSuggestions?: boolean;
}) {
  const storeCampaignId = useCreateCampaignStore((s) => s.campaignId);
  const campaignId = isStandalone ? "" : storeCampaignId;
  const { uploadImage, loading: imageUploading } = useImageUpload();
  const { uploadVideo, loading: videoUploading } = useVideoUpload();
  const [activeModal, setActiveModal] = useState<TrailModalKey>(null);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [editingPollMediaOnly, setEditingPollMediaOnly] = useState(false);
  const [savingPollMedia, setSavingPollMedia] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardModalInit, setRewardModalInit] = useState<{
    initialRewards?: RewardsForm["rewards"];
  }>({});
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(null);
  const pickedFileRef = useRef<File | null>(null);
  const cropAreaRef = useRef<unknown>(null);
  const dragCounterRef = useRef(0);

  const [cropUIOpen, setCropUIOpen] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [trialPendingType, setTrialPendingType] = useState<
    "image" | "video" | "youtube"
  >("image");
  const [trialYoutubeInput, setTrialYoutubeInput] = useState("");
  const [showLlmSuggestion, setShowLlmSuggestion] = useState(false);

  const [saveDraftInProgress, setSaveDraftInProgress] = useState(false);

  const draftAssets = initialDataFromDraft?.resourceAssets ?? [];
  const draftRewards = (initialDataFromDraft?.rewards ?? []).map((r, i) => ({
    id: `draft-r-${i}`,
    assetId: r.assetId,
    amount: r.amount,
    rewardAmountCap: r.rewardAmountCap,
    rewardType: r.rewardType as "min" | "max",
  }));
  const draftPolls = (initialDataFromDraft?.polls ?? []).map((p, i) => ({
    id: `draft-p-${i}`,
    pollName: p.title ?? "",
    pollDescription: p.description ?? "",
    resourceAssets: (p.resourceAssets ?? []).map((a) => ({ type: a.type as "image" | "youtube" | "video", value: a.value })),
    options: p.options ?? [],
  }));
  const firstDraftAsset = draftAssets[0];
  const trialResourceAssetsFromDraft = firstDraftAsset
    ? [{ type: firstDraftAsset.type, value: firstDraftAsset.value as string | File }]
    : [];

  const {
    register,
    watch,
    control,
    setValue,
    setError,
    clearErrors,
    trigger,
    reset,
    formState: { errors, isValid, isSubmitting, isDirty },
  } = useForm<TrailCreateValues>({
    mode: "onChange",
    resolver: zodResolver(trailCreateZ),
    defaultValues: {
      trailName: "",
      description: "",
      trialResourceAssets: [],
      polls: [],
      rewards: [],
    },
  });

  useEffect(() => {
    if (!initialDataFromDraft) return;
    reset({
      trailName: (initialDataFromDraft.title ?? "").trim(),
      description: (initialDataFromDraft.description ?? "").trim(),
      trialResourceAssets: trialResourceAssetsFromDraft,
      polls: draftPolls,
      rewards: draftRewards,
    });
    if (firstDraftAsset?.type === "youtube") setTrialYoutubeInput(firstDraftAsset.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when draft identity changes (reset once per draft)
  }, [initialDataFromDraft, reset]);

  useEffect(() => {
    if (mode !== "edit-launched" || !initialValuesForLaunchedEdit) return;
    reset(initialValuesForLaunchedEdit);
    const first = initialValuesForLaunchedEdit.trialResourceAssets?.[0];
    if (first?.type === "youtube" && typeof first.value === "string")
      setTrialYoutubeInput(first.value);
  }, [mode, initialValuesForLaunchedEdit, reset]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const trialResourceAssets = (watch("trialResourceAssets") ??
    []) as PollResourceAsset[];
  const polls = (watch("polls") ?? []) as TrailPoll[];
  const rewards = (watch("rewards") ?? []) as TrailReward[];
  const trialAsset = trialResourceAssets[0] ?? null;
  const trialResourceAssetsError = (errors as { trialResourceAssets?: { message?: string } })
    ?.trialResourceAssets?.message as string | undefined;

  const listingRoute = isStandalone
    ? endpoints.standaloneTrail.getAll
    : campaignId
      ? endpoints.campaigns.getTrialsListings(campaignId)
      : "";
  const campaignRoute = campaignId
    ? endpoints.campaigns.getCampaignByIdOwner(campaignId)
    : "";

  const createTrialRoute = isStandalone
    ? endpoints.standaloneTrail.create
    : endpoints.campaigns.createTrial;
  const { mutate: createTrial, isPending: creating } = useApiMutation({
    route: createTrialRoute,
    method: "POST",
    onSuccess: () => {
      if (listingRoute) {
        queryClient.invalidateQueries({ queryKey: [listingRoute] });
      }
      if (campaignRoute) {
        queryClient.invalidateQueries({ queryKey: [campaignRoute] });
      }
      onSaved();
    },
    onError: (e) => console.error("Create trial failed:", e),
  }) as unknown as UseMutationResult<any, Error, CreateTrialPayload>;

  const draftListingsUrl = isStandalone
    ? endpoints.standaloneTrail.getDraftTrialListingsUrl({ page: 1, pageSize: 50 })
    : campaignId
      ? endpoints.campaigns.getDraftTrialListingsUrl({ belongsToCampaignId: campaignId, page: 1, pageSize: 50 })
      : "";
  const draftCountListingsUrl = isStandalone
    ? endpoints.standaloneTrail.getDraftTrialListingsUrl({ page: 1, pageSize: 100 })
    : campaignId
      ? endpoints.campaigns.getDraftTrialListingsUrl({ belongsToCampaignId: campaignId, page: 1, pageSize: 100 })
      : "";

  const { data: draftCountData } = useApiQuery(draftCountListingsUrl, {
    queryKey: [draftCountListingsUrl],
    enabled:
      mode === "create" &&
      !!draftCountListingsUrl &&
      (isStandalone || !!campaignId),
  });
  const draftCount = (() => {
    if (mode !== "create") return 0;
    const raw = draftCountData as any;
    const root = raw?.data?.data ?? raw?.data ?? raw ?? {};
    const total = root?.total;
    if (typeof total === "number" && total >= 0) return total;
    const totalCount = root?.totalCount;
    if (typeof totalCount === "number" && totalCount >= 0) return totalCount;
    const entries = root?.entries ?? root?.items ?? root?.results ?? root?.list ?? [];
    return Array.isArray(entries) ? entries.length : 0;
  })();

  const { mutate: createDraftTrial, isPending: savingDraft } = useApiMutation({
    route: endpoints.campaigns.createDraftTrial,
    method: "POST",
    onSuccess: () => {
      setSaveDraftInProgress(false);
      if (draftListingsUrl) queryClient.invalidateQueries({ queryKey: [draftListingsUrl] });
      if (draftCountListingsUrl) queryClient.invalidateQueries({ queryKey: [draftCountListingsUrl] });
      appToast.success("Draft saved");
      onDraftSaved?.();
    },
    onError: (e) => {
      setSaveDraftInProgress(false);
      console.error("Save draft failed:", e);
    },
  });

  const trialRoute = trialId
    ? isStandalone
      ? endpoints.standaloneTrail.editTrial(trialId)
      : endpoints.campaigns.updateTrial(trialId)
    : "";
  const { mutate: updateTrial, isPending: savingMedia } = useApiMutation({
    route: trialRoute,
    method: "PATCH",
    onSuccess: () => {
      if (listingRoute) queryClient.invalidateQueries({ queryKey: [listingRoute] });
      if (campaignRoute) queryClient.invalidateQueries({ queryKey: [campaignRoute] });
      appToast.success("Trail media updated");
      onMediaSaved?.();
    },
    onError: (e) => console.error("Update trial media failed:", e),
  });

  const updateDraftRoute = draftId
    ? endpoints.campaigns.updateDraftTrial(draftId)
    : "";
  const redirectDraftRef = useRef<"list" | "create" | null>(null);
  const loadToCreatePayloadRef = useRef<Record<string, unknown> | null>(null);
  const [pendingDraftAction, setPendingDraftAction] = useState<"list" | "create" | null>(null);
  const { mutate: updateDraftTrial, isPending: savingDraftEdit } = useApiMutation({
    route: updateDraftRoute,
    method: "PATCH",
    onSuccess: () => {
      if (draftListingsUrl) queryClient.invalidateQueries({ queryKey: [draftListingsUrl] });
      if (draftCountListingsUrl) queryClient.invalidateQueries({ queryKey: [draftCountListingsUrl] });
      appToast.success("Draft saved");
      if (redirectDraftRef.current === "create" && loadToCreatePayloadRef.current) {
        onLoadToCreate?.(loadToCreatePayloadRef.current);
      } else {
        onDraftUpdated?.();
      }
      redirectDraftRef.current = null;
      loadToCreatePayloadRef.current = null;
      setPendingDraftAction(null);
    },
    onError: (e) => {
      appToast.error((e as Error)?.message ?? "Failed to save draft");
      redirectDraftRef.current = null;
      loadToCreatePayloadRef.current = null;
      setPendingDraftAction(null);
    },
  });

  const canEditMedia = canEdit || mode === "edit-launched";
  const canEditRest = canEdit && mode !== "edit-launched";
  const showExcelUpload = mode !== "edit-launched";

  const applyTrailContentPatchToForm = (patch: TrailContentPatch) => {
    if (typeof patch.trailName === "string") {
      setValue("trailName", patch.trailName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (typeof patch.description === "string") {
      setValue("description", patch.description, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    const incomingPolls = Array.isArray(patch.polls) ? patch.polls : [];
    const replacementPolls: TrailPoll[] = incomingPolls
      .map((incoming) => {
        const options = (incoming.options ?? [])
          .map((option) => String(option ?? "").trim())
          .filter(Boolean)
          .slice(0, 4);
        if (options.length < 2) return null;

        return {
          id: makeTrailPollId(),
          pollName: String(incoming.pollName ?? "").trim(),
          pollDescription: String(incoming.pollDescription ?? "").trim(),
          resourceAssets: [],
          options,
        } satisfies TrailPoll;
      })
      .filter((poll): poll is TrailPoll => Boolean(poll));

    setValue("polls", replacementPolls, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const applyExcelPatchToForm = (patch: TrialExcelFormPatch) => {
    applyTrailContentPatchToForm(patch);
  };

  const setTrialAsset = (asset: PollResourceAsset | null) => {
    setValue("trialResourceAssets", asset ? [asset] : [], {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("trialResourceAssets");
  };

  const removeTrialAsset = () => {
    const current = trialResourceAssets[0];
    if (current?.type === "image" && typeof current.value === "string" && current.value.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(current.value);
      } catch {}
    }
    setTrialAsset(null);
    setTrialYoutubeInput("");
  };

  const openTrialImagePicker = () => {
    if (!canEditMedia) return;
    setTrialPendingType("image");
    fileRef.current?.click();
  };

  const openTrialVideoPicker = () => {
    if (!canEditMedia) return;
    setTrialPendingType("video");
    videoRef.current?.click();
  };

  const onPickTrialImage = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !ACCEPT_IMAGE.includes(file.type)) {
      setError("trialResourceAssets", {
        type: "manual",
        message: "Only JPG, PNG, WEBP, GIF allowed",
      });
      return;
    }
    if (file.size > TRIAL_MAX_IMAGE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("trialResourceAssets", {
        type: "manual",
        message: `Image is ${mb} MB. Max allowed is ${TRIAL_MAX_IMAGE_MB} MB.`,
      });
      return;
    }
    clearErrors("trialResourceAssets");
    removeTrialAsset();
    if (file.type === "image/gif") {
      const dataUrl = await fileToDataUrl(file);
      setTrialAsset({ type: "image", value: dataUrl });
      return;
    }
    pickedFileRef.current = file;
    cropAreaRef.current = null;
    const blobUrl = URL.createObjectURL(file);
    setCropperImageUrl(blobUrl);
    setCropUIOpen(true);
    const dataUrl = await fileToDataUrl(file);
    setTrialAsset({ type: "image", value: dataUrl });
  };

  const handleSaveCrop = async () => {
    if (!cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as CropRect | null | undefined;
    if (!area || typeof area.x !== "number") return;
    const file = pickedFileRef.current;
    try {
      const { url } = await cropImage(cropperImageUrl, area, {
        mime: file?.type,
        fileName: "trail-cover",
        quality: COMPRESS_QUALITY,
      });
      cropAreaRef.current = area;
      const current = trialResourceAssets[0];
      if (current?.type === "image" && typeof current.value === "string" && current.value.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(current.value);
        } catch {}
      }
      setTrialAsset({ type: "image", value: url });
      clearErrors("trialResourceAssets");
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

  const onTrialImageDrop = async (e:  DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    await onPickTrialImage(file);
  };


  const onPickTrialVideo = (file: File | null) => {
    if (!file) return;
    if (!isAcceptedVideoUploadFile(file)) {
      setError("trialResourceAssets", {
        type: "manual",
        message: "Use MP4, MOV, WEBM, MKV, AVI, or M4V.",
      });
      return;
    }
    if (file.size > TRIAL_MAX_VIDEO_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("trialResourceAssets", {
        type: "manual",
        message: `Video is ${mb} MB. Max allowed is ${TRIAL_MAX_VIDEO_MB} MB.`,
      });
      return;
    }
    clearErrors("trialResourceAssets");
    setTrialAsset({ type: "video", value: file });
  };

  const addTrialYoutube = () => {
    const id = extractYouTubeId(trialYoutubeInput);
    if (!id) {
      setError("trialResourceAssets", {
        type: "manual",
        message: "Enter a valid YouTube URL or 11-char video ID",
      });
      return;
    }
    clearErrors("trialResourceAssets");
    setTrialAsset({ type: "youtube", value: trialYoutubeInput.trim() });
  };

  const openRewardsModal = () => {
    setRewardModalInit({
      initialRewards: rewards.map((r) => ({
        assetId: r.assetId,
        rewardAmountCap: r.rewardAmountCap,
        amount: r.amount,
        rewardType: r.rewardType,
      })) as RewardsForm["rewards"],
    });
    setActiveModal("ADD_REWARD");
  };

  const openAddReward = () => {
    if (!canEditRest) return;
    openRewardsModal();
  };

  const handleEditPoll = (poll: TrailPoll) => {
    if (!canEditRest) return;
    setEditingPollMediaOnly(false);
    setEditingPollId(poll.id);
    setActiveModal("ADD_POLL");
  };

  const handleEditPollMedia = (poll: TrailPoll) => {
    setEditingPollMediaOnly(true);
    setEditingPollId(poll.id);
    setActiveModal("ADD_POLL");
  };

  const handleEditReward = (reward: TrailReward) => {
    if (!canEditRest) return;
    setEditingRewardId(reward.id);
    setRewardModalInit({
      initialRewards: [
        {
          assetId: reward.assetId,
          rewardAmountCap: reward.rewardAmountCap,
          amount: reward.amount,
          rewardType: reward.rewardType,
        },
      ] as RewardsForm["rewards"],
    });
    setActiveModal("ADD_REWARD");
  };

  const closeModals = () => {
    setActiveModal(null);
    setEditingPollId(null);
    setEditingPollMediaOnly(false);
    setEditingRewardId(null);
  };

  async function normalizeImageToPublicUrl(v: string | File): Promise<string> {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    if (typeof v === "string" && isDataUrl(v)) {
      const f = await dataUrlToFile(v, "upload.png");
      return await uploadImage(f);
    }
    if (v instanceof File) {
      return await uploadImage(v);
    }
    throw new Error("Invalid image value");
  }

  async function normalizeTrialAssetImage(): Promise<string> {
    const file = pickedFileRef.current;
    if (file) {
      let toUpload: File = file;
      const crop = cropAreaRef.current as CropRect | null | undefined;
      if (crop && typeof crop.x === "number") {
        const src = URL.createObjectURL(file);
        try {
          const { file: f } = await cropImage(src, crop, {
            mime: file.type,
            fileName: "trail-cover",
            quality: COMPRESS_QUALITY,
          });
          toUpload = f;
        } finally {
          URL.revokeObjectURL(src);
        }
      }
      return await uploadImage(toUpload);
    }
    const v = trialAsset?.value;
    if (!v) throw new Error("No trial image");
    return await normalizeImageToPublicUrl(v as string | File);
  }

  async function normalizeResourceAsset(
    asset: PollResourceAsset,
  ): Promise<{ type: "image" | "youtube" | "video"; value: string }> {
    const v = asset.value;
    if (asset.type === "youtube") {
      const id = extractYouTubeId(String(v));
      if (!id) throw new Error("Invalid YouTube video ID");
      return { type: "youtube", value: id };
    }
    if (asset.type === "image") {
      const url = await normalizeImageToPublicUrl(v as string | File);
      return { type: "image", value: url };
    }
    if (asset.type === "video") {
      if (typeof v === "string" && /^https?:\/\//i.test(v))
        return { type: "video", value: v };
      if (typeof v === "string" && isDataUrl(v)) {
        const f = await dataUrlToFile(v, "upload.mp4");
        const url = await uploadVideo(f);
        return { type: "video", value: url };
      }
      if (v instanceof File) {
        const url = await uploadVideo(v);
        return { type: "video", value: url };
      }
    }
    throw new Error("Invalid resource asset");
  }

  function collectPendingTrailMediaFiles() {
    const files: File[] = [];
    const addValue = (value: unknown) => {
      if (value instanceof File) files.push(value);
    };

    if (pickedFileRef.current) files.push(pickedFileRef.current);
    addValue(trialAsset?.value);
    (polls ?? []).forEach((poll) => {
      (poll.resourceAssets ?? []).forEach((asset) => addValue(asset?.value));
    });

    return files;
  }

  function collectPollMediaFiles(poll: TrailPoll) {
    return (poll.resourceAssets ?? [])
      .map((asset) => asset?.value)
      .filter((value): value is File => value instanceof File);
  }

  const onSaveTrail = async () => {
    const ok = await trigger();
    if (!ok) return;

    if (!isStandalone && !campaignId) {
      alert("Missing campaignId");
      return;
    }

    if (!trialAsset?.value) {
      setError("trialResourceAssets", {
        type: "manual",
        message: "Add one media (image, video, or YouTube)",
      });
      return;
    }

    await withAssetUploadProgressBatch(
      { label: "Saving trail media", files: collectPendingTrailMediaFiles() },
      async () => {
    try {
      const trialNormalized = trialAsset!.type === "image"
        ? { type: "image" as const, value: await normalizeTrialAssetImage() }
        : await normalizeResourceAsset(trialAsset!);
      const [trialNorm] = [trialNormalized];
      const normalizedPolls = await Promise.all(
        (polls ?? []).map(async (p: TrailPoll) => {
          const assets = (p.resourceAssets ?? []).filter(
            (a: PollResourceAsset) => a?.value,
          );
          const resourceAssets = await Promise.all(
            assets.map((a: PollResourceAsset) => normalizeResourceAsset(a)),
          );
          return {
            title: p.pollName,
            description: p.pollDescription,
            resourceAssets,
            options: (p.options ?? []).map((t: string) => ({ text: t })),
          };
        }),
      );

      const trialPayload = {
        resourceAssets: [trialNorm],
        title: watch("trailName"),
        description: watch("description"),
        rewards: (rewards ?? []).map((r) => ({
          assetId: String(r.assetId),
          amount: Number(r.amount),
          rewardAmountCap: Number(r.rewardAmountCap),
          rewardType: r.rewardType === "max" ? "max" : "min",
        })),
      };
      const usedTrialDraftId = (initialDataFromDraft as { _id?: string } | undefined)?._id;

      const payload = isStandalone
        ? {
            trial: trialPayload,
            polls: normalizedPolls,
            ...(usedTrialDraftId && { usedTrialDraftId }),
          }
        : {
            campaignId,
            trial: trialPayload,
            polls: normalizedPolls,
            ...(usedTrialDraftId && { usedTrialDraftId }),
          };
      createTrial(payload);
    } catch (e: unknown) {
      console.error(e);
      alert(
        (e as Error)?.message || "Failed to upload media / create trial",
      );
    }
      },
    );
  };

  const busy = creating || imageUploading || videoUploading || savingMedia || savingDraftEdit;
  const hasPollIssues = (polls ?? []).some((p) => getPollIssues(p).length > 0);
  const formInvalid = !isValid || hasPollIssues;

  const buildDraftPayloadLenient = async (): Promise<Record<string, unknown>> => {
    let trialNormalized: { type: "image" | "youtube" | "video"; value: string } | null = null;
    if (trialAsset?.value) {
      try {
        if (trialAsset.type === "image") {
          trialNormalized = { type: "image", value: await normalizeTrialAssetImage() };
        } else {
          trialNormalized = await normalizeResourceAsset(trialAsset);
        }
      } catch (e) {
        console.error(e);
      }
    }
    const normalizedPolls = await Promise.all(
      (polls ?? []).map(async (p: TrailPoll) => {
        const assets = (p.resourceAssets ?? []).filter((a: PollResourceAsset) => a?.value);
        const resourceAssets = await Promise.all(
          assets.map((a: PollResourceAsset) => normalizeResourceAsset(a).catch(() => ({ type: "image" as const, value: "" }))),
        ).then((arr) => arr.filter((a) => a.value));
        return {
          title: (p.pollName ?? "").trim() || null,
          description: (p.pollDescription ?? "").trim() || null,
          options: (p.options ?? []).map((t: string) => t.trim()).filter(Boolean),
          resourceAssets,
          rewards: [],
          targetGeo: {},
        };
      }),
    );
    return {
      title: (watch("trailName") ?? "").trim() || null,
      description: (watch("description") ?? "").trim() || null,
      resourceAssets: trialNormalized ? [trialNormalized] : [],
      rewards: (rewards ?? [])?.map((r) => ({
        assetId: String(r.assetId),
        amount: Number(r.amount),
        rewardAmountCap: Number(r.rewardAmountCap),
        rewardType: r.rewardType === "max" ? "max" : "min",
      })),
      expireRewardAt: null,
      targetGeo: {},
      polls: normalizedPolls,
    };
  };

  const onSaveDraftChanges = async () => {
    const payload = await withAssetUploadProgressBatch(
      { label: "Saving draft media", files: collectPendingTrailMediaFiles() },
      buildDraftPayloadLenient,
    );
    if (!draftId) return;
    redirectDraftRef.current = "list";
    setPendingDraftAction("list");
    (updateDraftTrial as (p: unknown) => void)(payload);
  };

  const onLoadToCreateClick = async () => {
    if (!draftId) return;
    const payload = await withAssetUploadProgressBatch(
      { label: "Saving draft media", files: collectPendingTrailMediaFiles() },
      buildDraftPayloadLenient,
    );
    redirectDraftRef.current = "create";
    loadToCreatePayloadRef.current = payload;
    setPendingDraftAction("create");
    (updateDraftTrial as (p: unknown) => void)(payload);
  };

  const onSaveMediaOnly = async () => {
    if (!trialAsset?.value || !trialId) return;
    await withAssetUploadProgressBatch(
      { label: "Saving trail media", files: collectPendingTrailMediaFiles() },
      async () => {
    try {
      const normalized = trialAsset.type === "image"
        ? { type: "image" as const, value: await normalizeTrialAssetImage() }
        : await normalizeResourceAsset(trialAsset);
      (updateTrial as (p: unknown) => void)({ resourceAssets: [normalized] });
    } catch (e) {
      console.error(e);
      appToast.error((e as Error)?.message ?? "Failed to update media");
    }
      },
    );
  };

  const effectiveBelongsToForDraft = isStandalone ? "standalone" : campaignId;

  const onSaveDraft = async () => {
    if (!effectiveBelongsToForDraft) return;
    const title = (watch("trailName") ?? "").trim();
    if (!title) {
      setError("trailName", { type: "manual", message: "Trail name is required to save draft" });
      return;
    }
    if (title.length < 3) {
      setError("trailName", { type: "manual", message: "Trail name must be at least 3 characters" });
      return;
    }
    setSaveDraftInProgress(true);
    try {
      const payload = await withAssetUploadProgressBatch(
        { label: "Saving draft media", files: collectPendingTrailMediaFiles() },
        buildDraftPayloadLenient,
      );
      (createDraftTrial as (p: unknown) => void)({
        belongsToCampaignId: effectiveBelongsToForDraft,
        ...payload,
      });
    } catch (e) {
      console.error(e);
      setSaveDraftInProgress(false);
      appToast.error((e as Error)?.message ?? "Failed to prepare draft");
    }
  };

  const trailNameTrimmed = (watch("trailName") ?? "").trim();
  const canSaveDraft =
    effectiveBelongsToForDraft &&
    trailNameTrimmed.length >= 3 &&
    (mode !== "create" ||
      draftCount < (isStandalone ? MAX_DRAFT_TRAILS_STANDALONE : MAX_DRAFT_TRAILS_CAMPAIGN));
  const maxDraftLimit = isStandalone ? MAX_DRAFT_TRAILS_STANDALONE : MAX_DRAFT_TRAILS_CAMPAIGN;
  const atMaxDraftLimit = mode === "create" && draftCount >= maxDraftLimit;

  const handleSelectMediaType = (type: "image" | "video" | "youtube") => {
    setTrialAsset(null);
    setTrialPendingType(type);
    setTrialYoutubeInput("");
  };

  return (
    <>
      <section className="rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5 p-4 font-poppins">
        <header className="flex items-center justify-between mb-7 w-full">
          <button
            type="button"
            onClick={onViewAllTrails}
            className="inline-flex items-center gap-2 text-[#315326] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {mode === "edit-draft"  ? "Back to drafts" : "Back to Manage Trails"}
          </button>
          <section className="flex items-center gap-3">
            {mode === "create" && allowAiSuggestions && (
              <button
                type="button"
                onClick={() => setShowLlmSuggestion((prev) => !prev)}
                disabled={(!isStandalone && !campaignId) || !canEditRest || busy}
                className={`py-2 px-3 rounded-full text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  showLlmSuggestion
                    ? "bg-[#0EA5A5] text-white border-[#0EA5A5]"
                    : "bg-white text-[#0EA5A5] border-[#0EA5A5]"
                }`}
                aria-pressed={showLlmSuggestion}
                aria-label="Toggle AI suggestion panel"
                title="AI Suggestions"
              >
                XPOLL AI
              </button>
            )}
            {showExcelUpload && (
              <TrailExcelPatchButton
                onPatch={applyExcelPatchToForm}
                disabled={!canEditMedia || busy}
              />
            )}
            {mode === "edit-draft" && (
              <button
                type="button"
                onClick={onSaveDraftChanges}
                disabled={
                  !trailNameTrimmed ||
                  trailNameTrimmed.length < 3 ||
                  imageUploading ||
                  videoUploading ||
                  (savingDraftEdit && pendingDraftAction === "list")
                }
                className="min-w-[180px] rounded-full bg-[#0EA5A5] text-white px-6 py-2 font-semibold tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {savingDraftEdit && pendingDraftAction === "list"
                  ? "SAVING..."
                  : imageUploading || videoUploading
                    ? "SAVING..."
                    : "SAVE CHANGES"}
              </button>
            )}
            {mode === "create" && (
              <>
                {!canDraftCreate ? (
                  <PermissionDisabledTooltip hasPermission={false}>
                    <button
                      type="button"
                      disabled
                      className="min-w-[180px] rounded-full bg-[#0EA5A5] text-white px-6 py-2 font-semibold tracking-wide opacity-60 cursor-not-allowed"
                    >
                      SAVE CHANGES
                    </button>
                  </PermissionDisabledTooltip>
                ) : atMaxDraftLimit ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-not-allowed">
                          <button
                            type="button"
                            disabled
                            className="min-w-[180px] rounded-full bg-[#0EA5A5] text-white px-6 py-2 font-semibold tracking-wide opacity-60 cursor-not-allowed"
                          >
                            SAVE CHANGES
                          </button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="center"
                        className="text-red-600 bg-gray-100 border border-gray-300 rounded-lg shadow-inner max-w-52"
                      >
                        <p className="max-w-[260px] text-xs leading-4">You already reached max draft limit of {maxDraftLimit}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <button
                    type="button"
                    onClick={onSaveDraft}
                    disabled={!canSaveDraft || savingDraft || saveDraftInProgress || isSubmitting || !canEdit}
                    className="min-w-[180px] rounded-full bg-[#0EA5A5] text-white px-6 py-2 font-semibold tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {(savingDraft || saveDraftInProgress) ? "Saving..." : "SAVE DRAFT"}
                  </button>
                )}
              </>
            )}
          </section>
        </header>
        {mode === "create" && allowAiSuggestions && (
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showLlmSuggestion
                ? "grid-rows-[1fr] opacity-100 mb-5"
                : "grid-rows-[0fr] opacity-0 mb-0"
            }`}
          >
            <div className="overflow-hidden">
              <TrailLlmSuggestionBox
                campaignId={campaignId || undefined}
                isStandalone={isStandalone}
                onApply={applyTrailContentPatchToForm}
                disabled={!canEditRest || busy}
              />
            </div>
          </div>
        )}
        <section className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <TrailCreateNameField
              register={register}
              errors={errors}
              canEdit={canEditRest}
            />
            <TrailCreateDescriptionField
              control={control}
              errors={errors}
              canEdit={canEditRest}
            />
            <TrailCreateMediaSection
              canEdit={canEditMedia}
              trialAsset={trialAsset}
              trialPendingType={trialPendingType}
              trialYoutubeInput={trialYoutubeInput}
              trialResourceAssetsError={trialResourceAssetsError}
              fileRef={fileRef}
              videoRef={videoRef}
              cropperRef={cropperRef}
              onRemove={removeTrialAsset}
              onSelectType={handleSelectMediaType}
              onImagePick={onPickTrialImage}
              onVideoPick={onPickTrialVideo}
              onYoutubeAdd={addTrialYoutube}
              setTrialYoutubeInput={setTrialYoutubeInput}
              openTrialImagePicker={openTrialImagePicker}
              openTrialVideoPicker={openTrialVideoPicker}
              cropUIOpen={cropUIOpen}
              cropperImageUrl={cropperImageUrl}
              onSaveCrop={handleSaveCrop}
              onCloseCropper={closeCropper}
              onImageDrop={onTrialImageDrop as (e: DragEvent) => void}
              dragOver={dragOver}
              onDragOverChange={setDragOver}
              dragCounterRef={dragCounterRef}
            />
          </div>

          <aside className="space-y-5">
            <TrailCreatePollsSection
              polls={polls}
              errors={errors}
              canEdit={canEditRest}
              onAddPoll={() => {
                if (polls.length >= 50) return;
                setEditingPollId(null);
                setEditingPollMediaOnly(false);
                setActiveModal("ADD_POLL");
              }}
              onEditPoll={canEditRest ? handleEditPoll : undefined}
              onEditPollMedia={mode === "edit-launched" ? handleEditPollMedia : undefined}
              canEditPollMediaOnly={mode === "edit-launched"}
              setValue={setValue}
            />
            <TrailCreateRewardsSection
              rewards={rewards}
              errors={errors}
              canEdit={canEditRest}
              onAddReward={openAddReward}
              onEditReward={canEditRest ? handleEditReward : undefined}
              setValue={setValue}
            />
          </aside>
        </section>

      </section>

      <TrailCreateFooter
        onViewAllTrails={onViewAllTrails}
        onSaveTrail={
          mode === "edit-draft"
            ? onSaveDraftChanges
            : mode === "edit-launched"
              ? onSaveMediaOnly
              : onSaveTrail
        }
        canEdit={canEditMedia}
        busy={busy}
        formInvalid={
          mode === "edit-launched"
            ? !trialAsset?.value
            : mode === "edit-draft"
              ? formInvalid
              : formInvalid
        }
        isSubmitting={
          mode === "edit-launched" ? savingMedia : mode === "edit-draft" ? savingDraftEdit && pendingDraftAction === "list" : isSubmitting
        }
        saveButtonLabel={
          mode === "edit-launched" ? "SAVE MEDIA" : mode === "edit-draft" ? "SAVE CHANGES" : undefined
        }
        secondaryButtonLabel={mode === "edit-draft" ? "LOAD TO CREATE" : undefined}
        secondaryButtonBusy={mode === "edit-draft" && savingDraftEdit && pendingDraftAction === "create"}
        saveButtonIgnoreInvalid={mode === "edit-draft"}
        hidePrimaryButton={mode === "edit-draft"}
        onSecondaryClick={mode === "edit-draft" ? onLoadToCreateClick : undefined}
        secondaryButtonAlwaysEnabled={mode === "edit-draft"}
        hideOverviewMessage={isStandalone}
      />

      <TrailModals
        active={activeModal}
        onClose={closeModals}
        rewardModalInit={rewardModalInit}
        initialPoll={
          activeModal === "ADD_POLL" && editingPollId
            ? polls.find((p) => p.id === editingPollId) ?? null
            : null
        }
        mediaOnlyPoll={editingPollMediaOnly}
        pollMediaSaving={savingPollMedia}
        onPollSaved={async (poll) => {
          if (editingPollMediaOnly && mode === "edit-launched" && editingPollId) {
            setSavingPollMedia(true);
            await withAssetUploadProgressBatch(
              { label: "Saving poll media", files: collectPollMediaFiles(poll) },
              async () => {
            try {
              const assets = (poll.resourceAssets ?? []).filter(
                (a: PollResourceAsset) => a?.value,
              );
              const normalized = await Promise.all(
                assets.map((a: PollResourceAsset) =>
                  normalizeResourceAsset(a).catch(() => ({ type: "image" as const, value: "" })),
                ),
              ).then((arr) => arr.filter((a) => a.value));
              await apiInstance.patch(
                isStandalone
                  ? endpoints.standaloneTrail.editPoll(editingPollId)
                  : endpoints.campaigns.updateTrialPolls(editingPollId),
                { resourceAssets: normalized },
              );
              appToast.success("Poll media updated");
              setValue(
                "polls",
                polls.map((p) =>
                  p.id === editingPollId
                    ? { ...p, resourceAssets: normalized.map((n) => ({ type: n.type, value: n.value })) }
                    : p,
                ),
                { shouldDirty: true, shouldValidate: true },
              );
            } catch (e) {
              appToast.error((e as Error)?.message ?? "Failed to update poll media");
            } finally {
              setSavingPollMedia(false);
              closeModals();
            }
              },
            );
            return;
          }
          if (editingPollId) {
            setValue(
              "polls",
              polls.map((p) =>
                p.id === editingPollId ? { ...poll, id: editingPollId } : p,
              ),
              { shouldDirty: true, shouldValidate: true },
            );
          } else {
            setValue("polls", [...polls, poll], {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
          closeModals();
        }}
        onRewardsSaved={({ rewards: newRewards }) => {
          if (editingRewardId && newRewards.length > 0) {
            setValue(
              "rewards",
              rewards.map((r) =>
                r.id === editingRewardId
                  ? { ...newRewards[0], id: editingRewardId }
                  : r,
              ),
              { shouldDirty: true, shouldValidate: true },
            );
          } else {
            const map = new Map<string, TrailReward>();
            for (const r of rewards) map.set(String(r.assetId), r);
            for (const r of newRewards) map.set(String(r.assetId), r);
            setValue("rewards", Array.from(map.values()), {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
          closeModals();
        }}
      />
    </>
  );
}
