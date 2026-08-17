import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import CampaignLayout, { CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import {
  useCreateCampaignStore,
  hardResetCreateCampaignStore,
  getAddInfoPersistKey,
  readAddInfoFromLocalStorage,
} from "@/stores/create-campaign.store";
import { cn } from "@/lib/utils";
import xIcon from "@/assets/x.svg";
import {
  Instagram,
  Send,
  Mail,
  Globe,
  FileText,
  TriangleAlert,
  X,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  campaignAddInfoZ,
  campaignAddInfoBaseZ,
  type CampaignAddInfoValues,
} from "@/schema/campaign.schemas";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import { endpoints } from "@/api/endpoints";
import { CitySelect } from "@/components/commons/selects/city-select";
import CountrySelect from "@/components/commons/selects/country-select";
import { Controller } from "react-hook-form";
import {
  CAMPAIGN_STATUS,
  campaignStatuses,
  type CampaignStatus,
} from "@/utils/campaign-status";
import { type ApiCampaignById } from "@/types/campaigns";
import { queryClient } from "@/api/queryClient";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { ImageSlot } from "@/components/campaign/petition/CampaignImageSlot";
import { normalizeFormDataBySchema } from "@/components/commons/form/utils/normalizeFormData";
import EasyReactCropper from "@/components/commons/image-cropper";
import { MediaDropzone } from "@/components/commons/media/MediaDropzone";
import { cropImage } from "@/utils/media/cropImage";
import { COMPRESS_QUALITY } from "@/utils/media/compressImage";
import {
  VIDEO_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_HELPER_TEXT,
  VIDEO_UPLOAD_MAX_INPUT_BYTES,
  VIDEO_UPLOAD_MAX_INPUT_MB,
  isAcceptedVideoUploadFile,
} from "@/utils/media/video-upload.constants";
import { Button } from "@/components/ui/button";
import AddInfoFlowModal, {
  type AddInfoModalKey,
} from "@/components/modals/add-info-modal";
import { PreventLeaveGuard } from "@/utils/prevent-leave-guard";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import { RichTextEditor } from "@/components/commons/editor/RichTextEditor";
import { withAssetUploadProgressBatch } from "@/stores/asset-upload-progress.store";

const MAX_IMAGE_MB = 20;
/** Cropper viewport dimensions for add-info inline crop UI. */
const ADD_INFO_CROP_VIEW_W = 600;
const ADD_INFO_CROP_VIEW_H = 300;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp,image/gif";
const MAX_VIDEO_MB = VIDEO_UPLOAD_MAX_INPUT_MB;
const MAX_VIDEO_BYTES = VIDEO_UPLOAD_MAX_INPUT_BYTES;

const API_BASE = import.meta.env.VITE_BACKEND_URL;

function debugAddInfoSave(label: string, data?: unknown) {
  if (import.meta.env.PROD) return;
  console.log(`[CampaignAddInfo:save] ${label}`, data ?? "");
}

function logFileSize(tag: string, file: File) {
  const kb = file.size / 1024;
  const mb = file.size / (1024 * 1024);
  console.log(`[ADD-INFO][MEDIA] ${tag}`, {
    name: file.name,
    type: file.type,
    bytes: file.size,
    kb: Number(kb.toFixed(2)),
    mb: Number(mb.toFixed(2)),
  });
}

function parseCampaignStatus(s: unknown): CampaignStatus {
  const v = String(s ?? "")
    .toLowerCase()
    .trim();
  return (campaignStatuses as readonly string[]).includes(v as never)
    ? (v as CampaignStatus)
    : CAMPAIGN_STATUS.DRAFT;
}

function imagesToSlots(
  links?: string[] | null,
): [string | null, string | null, string | null] {
  const arr = Array.isArray(links) ? links : [];
  return [arr[0] ?? null, arr[1] ?? null, arr[2] ?? null];
}

type CityObj = { _id?: string; id?: string; name?: string };

/** Normalize array that may contain IDs or populated objects to string[] (IDs only). */
function normalizeCityIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") {
        const o = v as CityObj;
        if (typeof o._id === "string") return o._id;
        if (typeof o.id === "string") return o.id;
      }
      return null;
    })
    .filter(Boolean) as string[];
}

function normalizeLinkedIndustriesToIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .slice(0, 3)
      .map((item) => {
        if (typeof item === "string" && item.trim()) return item.trim();
        if (item && typeof item === "object" && "_id" in item)
          return String((item as { _id: unknown })._id);
        return null;
      })
      .filter((id): id is string => id != null);
  }
  if (raw && typeof raw === "object") {
    const o = raw as { industryIds?: unknown[]; industries?: unknown[] };
    if (Array.isArray(o.industryIds)) {
      return o.industryIds
        .slice(0, 3)
        .map((id) => (typeof id === "string" && id.trim() ? id.trim() : null))
        .filter((id): id is string => id != null);
    }
    if (Array.isArray(o.industries)) {
      return o.industries
        .slice(0, 3)
        .map((item) =>
          item && typeof item === "object" && "_id" in item
            ? String((item as { _id: unknown })._id)
            : null,
        )
        .filter((id): id is string => id != null);
    }
  }
  return [];
}

/**
 * Extract id->name map from API linkedIndustries.
 * API returns object with industries: [{ _id, name, ... }] or array of objects.
 */
function extractLinkedIndustryNamesFromApi(
  raw: unknown,
): Record<string, string> {
  const out: Record<string, string> = {};
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object") {
    const o = raw as { industries?: unknown[] };
    if (Array.isArray(o.industries)) arr = o.industries;
  }
  for (const item of arr) {
    if (item && typeof item === "object" && "_id" in item) {
      const id = String((item as { _id: unknown })._id);
      const name =
        typeof (item as { name?: unknown }).name === "string"
          ? (item as { name: string }).name
          : id;
      out[id] = name;
    }
  }
  return out;
}

/** Extract city display name from GET API targetGeo.cities (populated objects). */
function extractCityLabelFromApi(input: unknown): string | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const v = input[0];
  if (
    v &&
    typeof v === "object" &&
    typeof (v as { name?: unknown }).name === "string"
  )
    return (v as { name: string }).name;
  return null;
}

/** Extract country display name from GET API targetGeo.countries (populated objects). */
function extractCountryLabelFromApi(input: unknown): string | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const v = input[0];
  if (
    v &&
    typeof v === "object" &&
    typeof (v as { name?: unknown }).name === "string"
  )
    return (v as { name: string }).name;
  return null;
}

function apiToFormValues(api: ApiCampaignById): CampaignAddInfoValues {
  const imgs = imagesToSlots(api.imageLinks ?? []);
  const apiTargetGeo = (
    api as {
      targetGeo?: {
        countries?: unknown[];
        states?: unknown[];
        cities?: unknown[];
      };
    }
  )?.targetGeo;
  const countries = normalizeCityIds(apiTargetGeo?.countries).slice(0, 999);
  const states = normalizeCityIds(apiTargetGeo?.states).slice(0, 999);
  const cities = normalizeCityIds(apiTargetGeo?.cities).slice(0, 1);
  const uploadedVideoUrl =
    (api as { uploadedVideoLinks?: string[] })?.uploadedVideoLinks?.[0] ?? null;
  const rawLinked = (api as { linkedIndustries?: unknown[] }).linkedIndustries;
  const linkedIndustries = normalizeLinkedIndustriesToIds(rawLinked);

  return {
    description: api.description ?? "",
    targetGeo: { countries, states, cities },
    links: {
      x: String(api.twitterLink ?? ""),
      instagram: String(api.instagramLink ?? ""),
      telegram: String(api.telegramLink ?? ""),
      email: String((api as { emailLink?: string }).emailLink ?? ""),
      website: String(api.websiteLink ?? ""),
    },
    imageLinks: [imgs[0], imgs[1], imgs[2]],
    uploadedVideoLinks: uploadedVideoUrl ? [uploadedVideoUrl] : [],
    videoLink: String((api as { videoLink?: string })?.videoLink ?? ""),
    linkedIndustries,
  };
}

/** Normalize stored addInfo (e.g. targetGeo as object or legacy) to form shape; IDs only. */
function draftAddInfoToFormValues(
  raw: Record<string, unknown>,
): CampaignAddInfoValues {
  const rawTg = raw?.targetGeo;
  let countries: string[] = [];
  let states: string[] = [];
  let cities: string[] = [];
  if (rawTg && typeof rawTg === "object") {
    const o = rawTg as {
      countries?: unknown[];
      states?: unknown[];
      cities?: unknown[];
    };
    countries = normalizeCityIds(o.countries).slice(0, 999);
    states = normalizeCityIds(o.states).slice(0, 999);
    cities = normalizeCityIds(o.cities).slice(0, 1);
  } else if (typeof rawTg === "string" && (rawTg as string).trim()) {
    cities = [(rawTg as string).trim()];
  }
  return {
    description: typeof raw?.description === "string" ? raw.description : "",
    targetGeo: { countries, states, cities },
    links:
      raw?.links && typeof raw.links === "object"
        ? {
            x: String((raw.links as any).x ?? ""),
            instagram: String((raw.links as any).instagram ?? ""),
            telegram: String((raw.links as any).telegram ?? ""),
            email: String((raw.links as any).email ?? ""),
            website: String((raw.links as any).website ?? ""),
          }
        : { x: "", instagram: "", telegram: "", email: "", website: "" },
    imageLinks: (Array.isArray(raw?.imageLinks)
      ? [
          raw.imageLinks[0] ?? null,
          raw.imageLinks[1] ?? null,
          raw.imageLinks[2] ?? null,
        ]
      : [null, null, null]) as [string | null, string | null, string | null],
    uploadedVideoLinks:
      Array.isArray(raw?.uploadedVideoLinks) &&
      raw.uploadedVideoLinks.length > 0
        ? [
            typeof raw.uploadedVideoLinks[0] === "string"
              ? raw.uploadedVideoLinks[0]
              : null,
          ]
        : [],
    videoLink: typeof raw?.videoLink === "string" ? raw.videoLink : "",
    linkedIndustries: normalizeLinkedIndustriesToIds(raw?.linkedIndustries),
  };
}

// ----------------- COPIED (Add Share Rewards + Donation toggle + Petitions) helpers -----------------

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toYMDFromISO(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ymdToLocalISOStart(ymd: string) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return dt.toISOString();
}

function ymdToLocalISOEnd(ymd: string) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return dt.toISOString();
}

function clampYMD(val: string, minYMD: string, maxYMD: string) {
  if (!val) return minYMD;
  if (val < minYMD) return minYMD;
  if (val > maxYMD) return maxYMD;
  return val;
}

function getShareFeatureSummary(apiCampaign: any) {
  const sf = apiCampaign?.shareFeatureField;
  const lvl = sf?.referral_levels?.[0];
  const rewards = Array.isArray(lvl?.rewards) ? lvl.rewards : [];
  const rw =
    rewards.find((r: any) => String(r?.assetId ?? "") === "xPoll") ??
    rewards[0] ??
    null;

  return {
    enabled: Boolean(sf?.isEnabled),
    shares: Number(lvl?.totalUniqueVisitsRequired ?? 0),
    amount: String(rw?.amount ?? "0"),
    payoutCap: String(rw?.payoutCap ?? "0"),
    assetId: String(rw?.assetId ?? "xPoll"),
  };
}

function intStr(v: any) {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(n)) return "0";
  return String(Math.max(0, Math.trunc(n)));
}

// -----------------------------------------------------------------------------------------------

export default function AddInfo() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentCampaignId = String(id ?? "");

  const campaignRoute =
    endpoints.campaigns.getCampaignByIdOwner(currentCampaignId);
  const {
    data: campaignResp,
    isLoading: isCampaignLoading,
    isError: isCampaignError,
    refetch: refetchCampaign,
  } = useApiQuery(campaignRoute, {
    queryKey: [campaignRoute],
    enabled: !!currentCampaignId,
  });
  const { data: meResp } = useApiQuery(endpoints.profile.me);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as { __addInfoRefetch?: () => Promise<unknown> }
      ).__addInfoRefetch = () => refetchCampaign();
    }
    return () => {
      if (typeof window !== "undefined")
        delete (window as { __addInfoRefetch?: () => Promise<unknown> })
          .__addInfoRefetch;
    };
  }, [refetchCampaign]);

  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("dragover", prevent, false);
    document.addEventListener("drop", prevent, false);
    return () => {
      document.removeEventListener("dragover", prevent, false);
      document.removeEventListener("drop", prevent, false);
    };
  }, []);

  const apiCampaign = useMemo(
    () => campaignResp?.data?.data as ApiCampaignById | undefined,
    [campaignResp],
  );
  const { permissions, isBasic } = useCampaignByOwner(currentCampaignId);
  const userId = useMemo(() => meResp?.data?.data?.id ?? "", [meResp]);

  const status = useMemo(
    () => parseCampaignStatus(apiCampaign?.status),
    [apiCampaign?.status],
  );
  const canEditMain =
    status === CAMPAIGN_STATUS.DRAFT || status === CAMPAIGN_STATUS.PAUSED;

  const { uploadImage } = useImageUpload();
  const { uploadVideo } = useVideoUpload();

  const storeCampaignId = useCreateCampaignStore((s) => s.campaignId);
  const storeCampaignName = useCreateCampaignStore((s) => s.campaignName);
  const setBasics = useCreateCampaignStore((s) => s.setBasics);
  const setCampaignStatus = useCreateCampaignStore((s) => s.setCampaignStatus);
  const setPersistUserId = useCreateCampaignStore((s) => s.setPersistUserId);
  const hydrateFromCampaign = useCreateCampaignStore(
    (s) => s.hydrateFromCampaign,
  );
  const setAddInfoPatch = useCreateCampaignStore((s) => s.setAddInfoPatch);
  const clearAddInfoDraft = useCreateCampaignStore((s) => s.clearAddInfoDraft);
  const clearPersisted = useCreateCampaignStore((s) => s.clearPersisted);
  const getAddInfoDraft = useCreateCampaignStore((s) => s.getAddInfoDraft);
  const getHasValidPersistedData = useCreateCampaignStore(
    (s) => s.getHasValidPersistedData,
  );
  const loadPersistedForUser = useCreateCampaignStore(
    (s) => s.loadPersistedForUser,
  );
  const clearIfExpired = useCreateCampaignStore((s) => s.clearIfExpired);
  const isExpired = useCreateCampaignStore((s) => s.isExpired);
  const addInfoDraftLinksError = useCreateCampaignStore(
    (s) => s.addInfoDraftLinksError,
  );
  const setAddInfoDraftLinksError = useCreateCampaignStore(
    (s) => s.setAddInfoDraftLinksError,
  );

  const [activeTab, setActiveTab] = useState<CampaignTabKey>("add-info");
  const [activeModal, setActiveModal] = useState<AddInfoModalKey>(null);
  type CityOption = { value: string; label: string; data?: unknown };
  type CountryOption = { value: string; label: string; data?: unknown };
  const [activeImageSlot, setActiveImageSlot] = useState<number | null>(null);
  /** Slot index for inline crop UI; when set, show cropper below images grid. GIF skips crop. */
  const [cropUISlot, setCropUISlot] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const dragCounterRef = useRef<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const cropperRef = useRef<{
    getCroppedAreaPixels: () => {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  }>(null);
  const pickedFilesRef = useRef<Record<number, File | null>>({});
  const pickedVideoRef = useRef<File | null>(null);
  /** Crop coords per slot; null = no crop (use original file). Cleared when image removed. */
  const cropBySlotRef = useRef<
    Record<
      number,
      { x: number; y: number; width: number; height: number } | null
    >
  >({
    0: null,
    1: null,
    2: null,
  });
  /** Tracks last (campaignId, userId) we ran hydration for; avoid resetting on every effect run. Cleared on unmount so returning to add-info re-runs. */
  const lastHydrationKeyRef = useRef<string | null>(null);

  // ----------------- COPIED (Add Share Rewards + Donation toggle + Petitions) state/logic -----------------

  const shareSummaryFromApi = useMemo(
    () => getShareFeatureSummary(apiCampaign),
    [apiCampaign],
  );

  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareRuleUI, setShareRuleUI] = useState<{
    shares: number;
    payoutCap: string;
    amount: string;
  }>({ shares: 0, payoutCap: "0", amount: "0" });

  const shareSavedRef = useRef(false);

  useEffect(() => {
    shareSavedRef.current = false;

    setShareEnabled(Boolean(shareSummaryFromApi.enabled));
    setShareRuleUI({
      shares: Number(shareSummaryFromApi.shares ?? 0),
      payoutCap: String(shareSummaryFromApi.payoutCap ?? "0"),
      amount: String(shareSummaryFromApi.amount ?? "0"),
    });
  }, [
    shareSummaryFromApi.enabled,
    shareSummaryFromApi.shares,
    shareSummaryFromApi.payoutCap,
    shareSummaryFromApi.amount,
    (apiCampaign as any)?._id,
  ]);

  const disableShareRewards = async () => {
    if (!currentCampaignId) return;

    const res = await fetch(
      `${API_BASE}${endpoints.campaigns.shareRewards(currentCampaignId)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: false }),
      },
    );

    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) {
      console.error("Disable share rewards failed:", json);
      setShareEnabled(true);
      return;
    }

    setShareEnabled(false);

    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.getCampaignByIdOwner(currentCampaignId)],
    });
  };

  const donationSupported = Boolean((apiCampaign as any)?.isDonationSupported);
  const isPaused = status === CAMPAIGN_STATUS.PAUSED;
  const showDonationToggle = donationSupported && isPaused;
  const canEditDonation = showDonationToggle;

  const donationPlanEndsAtISO =
    (apiCampaign as any)?.currentPlan?.endsAt ?? null;
  const donationPlanEndYMD = donationPlanEndsAtISO
    ? toYMDFromISO(donationPlanEndsAtISO)
    : todayYMD();

  const donationMinStartYMD = todayYMD();

  const apiDonation = (apiCampaign as any)?.currentPlan?.donation ?? null;
  const apiDonationEnabled = Boolean(apiDonation?.enabled);

  const apiStartYMD = toYMDFromISO(apiDonation?.startAt ?? null);
  const apiEndYMD = toYMDFromISO(apiDonation?.endAt ?? null);

  const initialDonationStart =
    apiStartYMD && apiStartYMD >= donationMinStartYMD
      ? apiStartYMD
      : donationMinStartYMD;
  const initialDonationEndRaw = apiEndYMD || donationPlanEndYMD;
  const initialDonationEnd = clampYMD(
    initialDonationEndRaw,
    initialDonationStart,
    donationPlanEndYMD,
  );

  const [donationEnabled, setDonationEnabled] =
    useState<boolean>(apiDonationEnabled);
  const [donationStartDate, setDonationStartDate] =
    useState<string>(initialDonationStart);
  const [donationEndDate, setDonationEndDate] =
    useState<string>(initialDonationEnd);

  useEffect(() => {
    // re-sync on campaign load/id change
    const tdy = todayYMD();
    const planEnd = donationPlanEndsAtISO
      ? toYMDFromISO(donationPlanEndsAtISO)
      : tdy;

    const ad = (apiCampaign as any)?.currentPlan?.donation ?? null;
    const enabled = Boolean(ad?.enabled);

    const sYMD = toYMDFromISO(ad?.startAt ?? null);
    const eYMD = toYMDFromISO(ad?.endAt ?? null);

    const start = sYMD && sYMD >= tdy ? sYMD : tdy;
    const endRaw = eYMD || planEnd;
    const end = clampYMD(endRaw, start, planEnd);

    setDonationEnabled(enabled);
    setDonationStartDate(start);
    setDonationEndDate(end);
  }, [(apiCampaign as any)?._id, donationPlanEndsAtISO]);

  // ---------- DONATION API (debounced) ----------
  const donationDebounceMs = 650;
  const donationTimerRef = useRef<number | null>(null);
  const donationPendingRef = useRef<{
    enabled: boolean;
    startAt: string;
    endAt: string;
  } | null>(null);

  const fireDonationUpdate = async (payload: {
    enabled: boolean;
    startAt: string;
    endAt: string;
  }) => {
    if (!currentCampaignId) return;

    const res = await fetch(
      `${API_BASE}${endpoints.campaigns.setDonation(currentCampaignId)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) {
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getCampaignByIdOwner(currentCampaignId)],
      });
      return;
    }

    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.getCampaignByIdOwner(currentCampaignId)],
    });
  };

  const queueDonationUpdate = (payload: {
    enabled: boolean;
    startAt: string;
    endAt: string;
  }) => {
    donationPendingRef.current = payload;

    if (donationTimerRef.current) {
      window.clearTimeout(donationTimerRef.current);
    }

    donationTimerRef.current = window.setTimeout(async () => {
      const p = donationPendingRef.current;
      donationPendingRef.current = null;
      donationTimerRef.current = null;
      if (!p) return;
      await fireDonationUpdate(p);
    }, donationDebounceMs);
  };

  useEffect(() => {
    return () => {
      if (donationTimerRef.current) {
        window.clearTimeout(donationTimerRef.current);
      }
    };
  }, []);

  const makeDonationPayload = (
    enabled: boolean,
    startYMD: string,
    endYMD: string,
  ) => {
    const minStart = donationMinStartYMD;
    const maxEnd = donationPlanEndYMD;

    const startClamped = clampYMD(startYMD || minStart, minStart, maxEnd);
    const endClamped = clampYMD(endYMD || maxEnd, startClamped, maxEnd);

    const startAt = ymdToLocalISOStart(startClamped);

    const endAt =
      donationPlanEndsAtISO && endClamped === maxEnd
        ? new Date(donationPlanEndsAtISO).toISOString()
        : ymdToLocalISOEnd(endClamped);

    return { enabled, startAt, endAt, startClamped, endClamped };
  };

  const openDonationFlow = () => {
    if (!canEditDonation) return;
    setActiveModal("DONATION_SETTINGS");
  };

  const onToggleDonation = () => {
    if (!canEditDonation) return;

    if (donationEnabled) {
      const built = makeDonationPayload(
        false,
        donationStartDate || donationMinStartYMD,
        donationEndDate || donationPlanEndYMD,
      );

      setDonationEnabled(false);
      setDonationStartDate(built.startClamped);
      setDonationEndDate(built.endClamped);

      queueDonationUpdate({
        enabled: false,
        startAt: built.startAt,
        endAt: built.endAt,
      });

      return;
    }

    openDonationFlow();
  };

  const [petitionEnabled, setPetitionEnabled] = useState<boolean>(
    Boolean((apiCampaign as any)?.isPetitionEnabled),
  );
  const [petitionToggling, setPetitionToggling] = useState(false);
  const petitionToggleRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setPetitionEnabled(Boolean((apiCampaign as any)?.isPetitionEnabled));
  }, [(apiCampaign as any)?._id, (apiCampaign as any)?.isPetitionEnabled]);

  // When redirected from petition create with ?blink=petition, scroll to toggle and blink
  useEffect(() => {
    if (searchParams.get("blink") !== "petition") return;
    const el = petitionToggleRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("animate-pulse");
      const t = setTimeout(() => {
        el.classList.remove("animate-pulse");
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("blink");
            return next;
          },
          { replace: true },
        );
      }, 2000);
      return () => clearTimeout(t);
    } else {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("blink");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const togglePetitions = async (next: boolean) => {
    if (!currentCampaignId) return;

    setPetitionToggling(true);
    const prev = petitionEnabled;

    setPetitionEnabled(next);

    try {
      const res = await fetch(
        `${API_BASE}${endpoints.campaigns.petitionToggle(currentCampaignId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPetitionEnabled: next }),
        },
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.success === false) {
        setPetitionEnabled(prev);
        queryClient.invalidateQueries({
          queryKey: [
            endpoints.campaigns.getCampaignByIdOwner(currentCampaignId),
          ],
        });
        return;
      }

      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getCampaignByIdOwner(currentCampaignId)],
      });
    } catch (e) {
      setPetitionEnabled(prev);
      queryClient.invalidateQueries({
        queryKey: [endpoints.campaigns.getCampaignByIdOwner(currentCampaignId)],
      });
    } finally {
      setPetitionToggling(false);
    }
  };

  // --------------------------------------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      lastHydrationKeyRef.current = null;
    };
  }, []);

  const defaultFormValues: CampaignAddInfoValues = useMemo(
    () => ({
      description: "",
      targetGeo: { countries: [], states: [], cities: [] },
      links: { x: "", instagram: "", telegram: "", email: "", website: "" },
      imageLinks: [null, null, null],
      uploadedVideoLinks: [],
      videoLink: "",
      linkedIndustries: [],
    }),
    [],
  );

  const form = useForm<CampaignAddInfoValues>({
    mode: "onChange",
    resolver: zodResolver(campaignAddInfoZ),
    defaultValues: defaultFormValues,
  });

  const {
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isValid, isSubmitting, isDirty },
  } = form;

  const hasUnsavedChanges = canEditMain && isDirty;

  const imageLinks = watch("imageLinks") ?? [null, null, null];
  const imageCount = imageLinks.filter(Boolean).length;
  const uploadedVideoLinks = watch("uploadedVideoLinks") ?? [];
  const uploadedVideoVal = uploadedVideoLinks[0] ?? null;
  const targetGeo = watch("targetGeo");
  const links = watch("links");
  const linkFilled = useMemo(
    () => ({
      x: Boolean(links?.x?.trim()),
      instagram: Boolean(links?.instagram?.trim()),
      telegram: Boolean(links?.telegram?.trim()),
      email: Boolean(links?.email?.trim()),
      website: Boolean(links?.website?.trim()),
    }),
    [links?.x, links?.instagram, links?.telegram, links?.email, links?.website],
  );

  const iconCls = (on: boolean) =>
    cn("h-6 w-6 transition", on ? "text-[#22C55E]" : "text-black/80");

  const draft = getAddInfoDraft();
  const cityDisplayLabel =
    draft?.targetGeoCityLabel ??
    extractCityLabelFromApi(
      (apiCampaign as { targetGeo?: { cities?: unknown[] } })?.targetGeo
        ?.cities,
    ) ??
    null;
  const countryDisplayLabel =
    draft?.targetGeoCountryLabel ??
    extractCountryLabelFromApi(
      (apiCampaign as { targetGeo?: { countries?: unknown[] } })?.targetGeo
        ?.countries,
    ) ??
    null;

  const uploadedVideoLinksErr = (
    errors as {
      uploadedVideoLinks?: { message?: string } | unknown[];
    }
  )?.uploadedVideoLinks;
  const videoErr =
    typeof uploadedVideoLinksErr === "object" &&
    uploadedVideoLinksErr !== null &&
    !Array.isArray(uploadedVideoLinksErr)
      ? (uploadedVideoLinksErr as { message?: string }).message
      : Array.isArray(uploadedVideoLinksErr) && uploadedVideoLinksErr[0]
        ? (uploadedVideoLinksErr[0] as { message?: string }).message
        : undefined;
  const imgErr0 = (errors.imageLinks as unknown[])?.[0] as
    | { message?: string }
    | undefined;
  const imgErr1 = (errors.imageLinks as unknown[])?.[1] as
    | { message?: string }
    | undefined;
  const imgErr2 = (errors.imageLinks as unknown[])?.[2] as
    | { message?: string }
    | undefined;
  const anySlotError = imgErr0?.message ?? imgErr1?.message ?? imgErr2?.message;

  // ---------- Hydration: persist only on add-info; form.reset exactly once per decision ----------
  useEffect(() => {
    if (!apiCampaign?._id || !currentCampaignId) return;

    const apiFormValues = apiToFormValues(apiCampaign);

    // If NOT DRAFT/PAUSED: block store write; form shows API only
    if (!canEditMain) {
      clearIfExpired();
      lastHydrationKeyRef.current = null;
      reset(apiFormValues, { keepDirty: false });
      return;
    }

    // Wait for both me (userId) and campaign
    if (!userId) {
      reset(apiFormValues, { keepDirty: false });
      return;
    }

    // keep the storageKey call (side-effect / parity), but no logs
    getAddInfoPersistKey(userId);
    readAddInfoFromLocalStorage(userId);

    const hydrationKey = `${currentCampaignId}:${userId}`;
    if (lastHydrationKeyRef.current === hydrationKey) return;
    lastHydrationKeyRef.current = hydrationKey;

    setPersistUserId(userId);
    loadPersistedForUser(userId);
    if (isExpired()) {
      clearPersisted();
    }

    const now = Date.now();
    const draft = getAddInfoDraft();
    const persistedCampaignId = draft?.campaignId ?? null;

    const linkedIndustryNames = extractLinkedIndustryNamesFromApi(
      (apiCampaign as { linkedIndustries?: unknown[] }).linkedIndustries,
    );

    // A) No persisted data → seed from API, write store + localStorage
    if (!getHasValidPersistedData(now)) {
      hydrateFromCampaign(
        currentCampaignId,
        apiFormValues,
        userId,
        linkedIndustryNames,
      );
      reset(apiFormValues, { keepDirty: false });
      return;
    }

    // B) Persisted campaignId !== current → overwrite from API
    if (persistedCampaignId !== currentCampaignId) {
      hydrateFromCampaign(
        currentCampaignId,
        apiFormValues,
        userId,
        linkedIndustryNames,
      );
      reset(apiFormValues, { keepDirty: false });
      return;
    }

    // C) Same campaignId → use persisted; images and video always from GET API
    const formValues = draft?.addInfo
      ? draftAddInfoToFormValues(draft.addInfo as Record<string, unknown>)
      : apiFormValues;
    formValues.imageLinks = apiFormValues.imageLinks;
    formValues.uploadedVideoLinks = apiFormValues.uploadedVideoLinks;
    reset(formValues, { keepDirty: false });
  }, [
    apiCampaign,
    currentCampaignId,
    userId,
    canEditMain,
    reset,
    clearIfExpired,
    clearPersisted,
    isExpired,
    setPersistUserId,
    loadPersistedForUser,
    getAddInfoDraft,
    getHasValidPersistedData,
    hydrateFromCampaign,
  ]);

  // ---------- Persist every edit to store (add-info only); no form.reset here ----------
  const watchLogThrottleRef = useRef<number>(0);
  useEffect(() => {
    if (!userId || !canEditMain) return;
    const sub = watch((values) => {
      const now = Date.now();
      if (now - watchLogThrottleRef.current > 800) {
        watchLogThrottleRef.current = now;
      }
      const countries = normalizeCityIds(values.targetGeo?.countries).slice(
        0,
        isBasic ? 1 : 999,
      );
      const states = isBasic
        ? []
        : normalizeCityIds(values.targetGeo?.states).slice(0, 999);
      const cities = isBasic
        ? []
        : normalizeCityIds(values.targetGeo?.cities).slice(0, 1);
      const patch: Partial<CampaignAddInfoValues> = {
        description: values.description,
        targetGeo: { countries, states, cities },
        links: values.links,
        videoLink: values.videoLink ?? "",
        linkedIndustries: values.linkedIndustries ?? [],
      };
      setAddInfoPatch(userId, patch);
    });
    return () => sub.unsubscribe();
  }, [watch, userId, canEditMain, isBasic, setAddInfoPatch]);

  const displayCampaignName =
    storeCampaignId === currentCampaignId && storeCampaignName
      ? storeCampaignName
      : String(apiCampaign?.name ?? "");

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    navigateCampaignEditTab(navigate, currentCampaignId, tab);
  };

  const openImagePicker = (slotIndex: number) => {
    if (!canEditMain) return;
    setActiveImageSlot(slotIndex);
    fileRef.current?.click();
  };

  const revokeBlobUrlIfNeeded = (url: string | null) => {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
  };

  const removeImage = (slotIndex: number) => {
    if (!canEditMain) return;
    revokeBlobUrlIfNeeded(imageLinks[slotIndex] ?? null);
    const next: [string | null, string | null, string | null] = [
      slotIndex === 0 ? null : (imageLinks[0] ?? null),
      slotIndex === 1 ? null : (imageLinks[1] ?? null),
      slotIndex === 2 ? null : (imageLinks[2] ?? null),
    ];
    pickedFilesRef.current[slotIndex] = null;
    cropBySlotRef.current[slotIndex] = null;
    if (cropUISlot === slotIndex) {
      handleCloseCropper();
    }
    setValue("imageLinks", next, { shouldDirty: true, shouldValidate: true });
    clearErrors(`imageLinks.${slotIndex}` as "imageLinks.0");
  };

  const applyImageToSlot = async (file: File, slotIndex: number) => {
    logFileSize("original (selected/dropped)", file);
    const current = (getValues("imageLinks") ?? [null, null, null]) as [
      string | null,
      string | null,
      string | null,
    ];
    const isAllowed = ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    );
    if (!isAllowed) {
      setError(`imageLinks.${slotIndex}` as "imageLinks.0", {
        type: "manual",
        message: "Only JPG, PNG, WEBP, and GIF are allowed",
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`imageLinks.${slotIndex}` as "imageLinks.0", {
        type: "manual",
        message: `Image is ${mb} MB. Max allowed is ${MAX_IMAGE_MB} MB.`,
      });
      return;
    }
    clearErrors(`imageLinks.${slotIndex}` as "imageLinks.0");

    const isGif = file.type === "image/gif";
    if (isGif) {
      revokeBlobUrlIfNeeded(current[slotIndex] ?? null);
      pickedFilesRef.current[slotIndex] = file;
      cropBySlotRef.current[slotIndex] = null;
      const dataUrl = await fileToDataUrl(file);
      const next: [string | null, string | null, string | null] = [
        slotIndex === 0 ? dataUrl : (current[0] ?? null),
        slotIndex === 1 ? dataUrl : (current[1] ?? null),
        slotIndex === 2 ? dataUrl : (current[2] ?? null),
      ];
      setValue("imageLinks", next, { shouldDirty: true, shouldValidate: true });
      return;
    }

    revokeBlobUrlIfNeeded(current[slotIndex] ?? null);
    pickedFilesRef.current[slotIndex] = file;
    const blobUrl = URL.createObjectURL(file);
    setCropperImageUrl(blobUrl);
    setCropUISlot(slotIndex);
    setActiveImageSlot(slotIndex);
    const dataUrl = await fileToDataUrl(file);
    const next: [string | null, string | null, string | null] = [
      slotIndex === 0 ? dataUrl : (current[0] ?? null),
      slotIndex === 1 ? dataUrl : (current[1] ?? null),
      slotIndex === 2 ? dataUrl : (current[2] ?? null),
    ];
    setValue("imageLinks", next, { shouldDirty: true, shouldValidate: true });
  };

  const onPickFile = async (file: File | null) => {
    if (!canEditMain || !file || activeImageSlot === null) return;
    await applyImageToSlot(file, activeImageSlot);
  };

  const onImgDragEnter = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEditMain) return;
    dragCounterRef.current[idx] = (dragCounterRef.current[idx] ?? 0) + 1;
    if (e.dataTransfer?.types?.includes("Files")) {
      setDragOverSlot(idx);
    }
  };

  const onImgDragLeave = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[idx] = Math.max(
      0,
      (dragCounterRef.current[idx] ?? 1) - 1,
    );
    if (dragCounterRef.current[idx] === 0) {
      setDragOverSlot(null);
    }
  };

  const onImgDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEditMain) return;
    e.dataTransfer.dropEffect = "copy";
    setDragOverSlot(idx);
  };

  const onImgDrop = async (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current[0] = 0;
    dragCounterRef.current[1] = 0;
    dragCounterRef.current[2] = 0;
    setDragOverSlot(null);
    if (!canEditMain) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setActiveImageSlot(idx);
    await applyImageToSlot(file, idx);
  };

  const handleSaveCrop = async () => {
    const slot = cropUISlot;
    if (slot === null || !cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.();
    if (!area) return;

    const pendingFile = pickedFilesRef.current[slot];
    const currentMime = pendingFile?.type;

    try {
      const { file: croppedFile, url } = await cropImage(
        cropperImageUrl,
        area,
        {
          mime: currentMime,
          fileName: `add-info-slot-${slot}`,
          quality: COMPRESS_QUALITY,
        },
      );
      logFileSize("cropped (preview)", croppedFile);

      if (croppedFile.size > MAX_IMAGE_BYTES) {
        setError(`imageLinks.${slot}` as "imageLinks.0", {
          type: "manual",
          message: `Cropped image exceeds ${MAX_IMAGE_MB} MB.`,
        });
        return;
      }

      cropBySlotRef.current[slot] = area;
      revokeBlobUrlIfNeeded(imageLinks[slot] ?? null);
      setValue(
        "imageLinks",
        [
          slot === 0 ? url : (imageLinks[0] ?? null),
          slot === 1 ? url : (imageLinks[1] ?? null),
          slot === 2 ? url : (imageLinks[2] ?? null),
        ] as [string | null, string | null, string | null],
        { shouldDirty: true, shouldValidate: true },
      );
      clearErrors(`imageLinks.${slot}` as "imageLinks.0");
    } catch (err) {
      console.error("Cropping failed:", err);
    } finally {
      handleCloseCropper();
    }
  };

  const handleCloseCropper = () => {
    if (cropperImageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(cropperImageUrl);
    }
    setCropperImageUrl(null);
    setCropUISlot(null);
  };

  const openVideoPicker = () => {
    if (!canEditMain) return;
    videoRef.current?.click();
  };

  const removeVideo = () => {
    if (!canEditMain) return;
    pickedVideoRef.current = null;
    if (
      typeof uploadedVideoVal === "string" &&
      uploadedVideoVal.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(uploadedVideoVal);
      } catch {}
    }
    setValue("uploadedVideoLinks", [], {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("uploadedVideoLinks");
  };

  const onPickVideoFile = async (file: File | null) => {
    if (!canEditMain || !file) return;
    if (!isAcceptedVideoUploadFile(file)) {
      setError("uploadedVideoLinks", {
        type: "manual",
        message: "Use MP4, MOV, WEBM, MKV, AVI, or M4V.",
      });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      setError("uploadedVideoLinks", {
        type: "manual",
        message: `Video is ${mb} MB. Max allowed is ${MAX_VIDEO_MB} MB.`,
      });
      return;
    }
    clearErrors("uploadedVideoLinks");
    pickedVideoRef.current = file;
    const blobUrl = URL.createObjectURL(file);
    if (
      typeof uploadedVideoVal === "string" &&
      uploadedVideoVal.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(uploadedVideoVal);
      } catch {}
    }
    setValue("uploadedVideoLinks", [blobUrl], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const { mutateAsync: updateCampaignAsync, isPending: isSaving } =
    useApiMutation<Record<string, unknown>, unknown>({
      route: endpoints.campaigns.edit(currentCampaignId),
      method: "PUT",
    });

  const saveDisabledReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!canEditMain) reasons.push("cannot-edit-main");
    if (!isValid) reasons.push("form-invalid");
    if (isSubmitting) reasons.push("form-submitting");
    if (isSaving) reasons.push("mutation-saving");
    if (addInfoDraftLinksError) reasons.push("link-validation-error");
    return reasons;
  }, [addInfoDraftLinksError, canEditMain, isSaving, isSubmitting, isValid]);

  const linkedIndustries = watch("linkedIndustries") ?? [];
  const linkedIndustryNames = (getAddInfoDraft()?.linkedIndustryNames ??
    {}) as Record<string, string>;

  const putLinkedIndustries = async (ids: string[]) => {
    if (!currentCampaignId || !canEditMain) return;
    await (
      updateCampaignAsync as unknown as (
        p: Record<string, unknown>,
      ) => Promise<unknown>
    )({
      linkedIndustries: ids,
    });
    queryClient.invalidateQueries({
      queryKey: [endpoints.campaigns.getCampaignByIdOwner(currentCampaignId)],
    });
  };

  const onIndustrySelect = async (
    opt: {
      value: string;
      label: string;
      data?: { _id: string; name: string };
    } | null,
  ) => {
    if (!opt || !canEditMain || !userId) return;
    const current = getValues("linkedIndustries") ?? [];
    if (current.includes(opt.value)) return;
    if (current.length >= 3) return;
    const next = [...current, opt.value];
    setValue("linkedIndustries", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const nextNames = { ...linkedIndustryNames, [opt.value]: opt.label };
    setAddInfoPatch(userId, {
      linkedIndustries: next,
      linkedIndustryNames: nextNames,
    });
    await putLinkedIndustries(next);
  };

  const onRemoveLinkedIndustry = async (id: string) => {
    if (!canEditMain || !userId) return;
    const current = getValues("linkedIndustries") ?? [];
    const next = current.filter((x) => x !== id);
    setValue("linkedIndustries", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const { [id]: _, ...restNames } = linkedIndustryNames;
    setAddInfoPatch(userId, {
      linkedIndustries: next,
      linkedIndustryNames: restNames,
    });
    await putLinkedIndustries(next);
  };

  const onSubmit = async (v: CampaignAddInfoValues) => {
    const pickedImageFiles = [0, 1, 2].map(
      (slotIndex) => pickedFilesRef.current[slotIndex] ?? null,
    );

    debugAddInfoSave("submit:start", {
      canEditMain,
      currentCampaignId,
      values: v,
      pickedImageFiles: pickedImageFiles.map((file) =>
        file
          ? { name: file.name, type: file.type, size: file.size }
          : null,
      ),
      pickedVideo: pickedVideoRef.current
        ? {
            name: pickedVideoRef.current.name,
            type: pickedVideoRef.current.type,
            size: pickedVideoRef.current.size,
          }
        : null,
    });

    if (!canEditMain || !currentCampaignId) {
      debugAddInfoSave("submit:blocked", { canEditMain, currentCampaignId });
      return;
    }

    await withAssetUploadProgressBatch(
      {
        label: "Saving campaign media",
        files: [...pickedImageFiles, pickedVideoRef.current],
      },
      async () => {
        const uploadedImageLinks = (
          await Promise.all(
            (v.imageLinks ?? [null, null, null]).map(async (img, idx) => {
          if (!img) return null;
          if (typeof img === "string" && img.trim().startsWith("http")) {
            debugAddInfoSave("image:reuse-remote", { idx, value: img.trim() });
            return img.trim();
          }
          let file = pickedFilesRef.current[idx];
          if (!file) {
            debugAddInfoSave("image:missing-picked-file", { idx, img });
            return null;
          }
          const crop = cropBySlotRef.current[idx];
          if (crop) {
            debugAddInfoSave("image:crop-start", {
              idx,
              file: { name: file.name, type: file.type, size: file.size },
              crop,
            });
            const srcUrl = URL.createObjectURL(file);
            try {
              const { file: croppedFile } = await cropImage(srcUrl, crop, {
                    mime: file.type,
                    fileName: `add-info-slot-${idx}`,
                    quality: COMPRESS_QUALITY,
                  });
                  logFileSize("cropped", croppedFile);
                  file = croppedFile;
                } finally {
                  URL.revokeObjectURL(srcUrl);
                }
          }
          debugAddInfoSave("image:upload-start", {
            idx,
            file: { name: file.name, type: file.type, size: file.size },
          });
          const url = await uploadImage(file);
          debugAddInfoSave("image:upload-done", { idx, url });
          return url ?? null;
        }),
      )
    ).filter(Boolean) as string[];

        debugAddInfoSave("images:normalized", { uploadedImageLinks });

    let uploadedVideoLink: string | null = null;
    const formVideo = v.uploadedVideoLinks?.[0];
        if (formVideo) {
      const file = pickedVideoRef.current;
      if (file) {
        debugAddInfoSave("video:upload-start", {
          file: { name: file.name, type: file.type, size: file.size },
        });
        uploadedVideoLink = await uploadVideo(file);
        debugAddInfoSave("video:upload-done", { uploadedVideoLink });
      } else if (
        typeof formVideo === "string" &&
        formVideo.trim().startsWith("http")
      ) {
        uploadedVideoLink = formVideo.trim();
        debugAddInfoSave("video:reuse-remote", { uploadedVideoLink });
      } else {
        debugAddInfoSave("video:missing-picked-file", { formVideo });
      }
    }

        const countries = normalizeCityIds(v.targetGeo?.countries).slice(
          0,
          isBasic ? 1 : 999,
        );
        const states = isBasic
          ? []
          : normalizeCityIds(v.targetGeo?.states).slice(0, 999);
        const cities = isBasic
          ? []
          : normalizeCityIds(v.targetGeo?.cities).slice(0, 1);
        const payload: Record<string, unknown> = {
          description: v.description?.trim() || null,
          imageLinks: uploadedImageLinks,
          uploadedVideoLinks: uploadedVideoLink ? [uploadedVideoLink] : [],
          targetGeo: { countries, states, cities },
          websiteLink: v.links?.website?.trim() || undefined,
          twitterLink: v.links?.x?.trim() || undefined,
          instagramLink: v.links?.instagram?.trim() || undefined,
          telegramLink: v.links?.telegram?.trim() || undefined,
          emailLink: v.links?.email?.trim() || undefined,
          videoLink: v.videoLink?.trim() || undefined,
          linkedIndustries: (v.linkedIndustries ?? []).filter(
            (x): x is string => Boolean(x),
          ),
        };

        debugAddInfoSave("mutation:start", { payload });

        try {
          const submit = updateCampaignAsync as unknown as (
            p: Record<string, unknown>,
          ) => Promise<unknown>;
          const result = await submit(payload);
          debugAddInfoSave("mutation:success", result);
          clearPersisted();
          clearAddInfoDraft();
          hardResetCreateCampaignStore();
          queryClient.invalidateQueries({
            queryKey: [
              endpoints.campaigns.getCampaignByIdOwner(currentCampaignId),
            ],
          });
          navigate(`/campaigns/edit/${currentCampaignId}/overview`);
        } catch (error) {
          debugAddInfoSave("mutation:error", error);
          // keep behavior: swallow/log removal only
        }
      },
    );
  };

  const onSubmitNormalizedWithLogs = form.handleSubmit(
    async (data) => {
      const normalized = normalizeFormDataBySchema(
        campaignAddInfoBaseZ,
        data,
      );
      debugAddInfoSave("submit:valid", {
        raw: data,
        normalized,
        saveDisabledReasons,
      });
      try {
        await onSubmit(normalized);
        debugAddInfoSave("submit:handler-complete");
      } catch (error) {
        debugAddInfoSave("submit:handler-error", error);
        throw error;
      }
    },
    (submitErrors) => {
      debugAddInfoSave("submit:invalid", {
        submitErrors,
        saveDisabledReasons,
        values: getValues(),
      });
    },
  );

  useEffect(() => {
    if (!apiCampaign?._id) return;
    setBasics({
      campaignId: currentCampaignId,
      campaignName: String(apiCampaign.name ?? ""),
      goal: String(apiCampaign.goal ?? ""),
    } as Parameters<typeof setBasics>[0]);
    setCampaignStatus(status);
  }, [apiCampaign, currentCampaignId, status, setBasics, setCampaignStatus]);

  return (
    <PreventLeaveGuard when={hasUnsavedChanges}>
      {({ requestLeave }) => (
        <CampaignLayout
          campaignId={currentCampaignId}
          campaignName={displayCampaignName}
          activeTab={activeTab}
          onTabChange={(tab) =>
            requestLeave(() => {
              setActiveTab(tab);
              goTab(tab);
            })
          }
          onBack={() => requestLeave(() => navigate(-1))}
        >
          {isCampaignError && (
            <div className="text-red-500">Error loading campaign</div>
          )}

          {isCampaignLoading && (
            <div className="text-gray-500">Loading campaign...</div>
          )}

          {!isCampaignLoading &&
            !isCampaignError &&
            campaignResp?.data?.data && (
              <>
                <div className="">
                  <div className="p-4 rounded-2xl bg-[#F5F5F5] shadow-sm border border-black/5">
                    <form
                      onSubmit={onSubmitNormalizedWithLogs}
                      className="space-y-6"
                      noValidate
                    >
                      <div className="grid grid-cols-2 gap-6">
                        <section className="space-y-6">
                          <Controller
                            control={form.control}
                            name="description"
                            render={({ field, fieldState }) => (
                              <div className="space-y-2">
                                <label className="font-semibold text-[#111]">
                                  Campaign description
                                  <span className="text-red-600"> *</span>
                                </label>
                                <RichTextEditor
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  placeholder="Describe your campaign..."
                                  error={fieldState.error?.message}
                                  helperText="Min 3, max 350 characters"
                                  showCounter
                                  maxLength={350}
                                  disabled={!canEditMain}
                                />
                              </div>
                            )}
                          />

                          {/* ----------------- COPIED: Add Share Rewards ----------------- */}
                          <div className="rounded-lg bg-white border border-black/10 px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[#535353] font-medium">
                                Add Share Rewards
                              </div>

                              <PermissionDisabledTooltip
                                hasPermission={permissions.campaign.shareReward}
                              >
                                <button
                                  type="button"
                                  disabled={!canEditMain}
                                  onClick={() => {
                                    if (!canEditMain) return;

                                    if (!shareEnabled) {
                                      shareSavedRef.current = false;
                                      setShareEnabled(true);
                                      setActiveModal("SHARE_REWARDS");
                                      return;
                                    }

                                    setShareEnabled(false);
                                    disableShareRewards();
                                  }}
                                  className={cn(
                                    "relative h-6 w-11 rounded-full transition",
                                    shareEnabled
                                      ? "bg-[#CFF3CF]"
                                      : "bg-[#E6E6E6]",
                                    !canEditMain
                                      ? "opacity-60 cursor-not-allowed"
                                      : "",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition",
                                      shareEnabled
                                        ? "right-1 bg-[#22C55E]"
                                        : "left-1 bg-[#BFBFBF]",
                                    )}
                                  />
                                </button>
                              </PermissionDisabledTooltip>
                            </div>

                            {shareEnabled ? (
                              <div className="mt-3 text-xs text-[#6E6E6E]">
                                <div className="font-semibold text-[#3A3A3A]">
                                  SHARE REWARD RULE
                                </div>
                                <div className="mt-1">
                                  Every{" "}
                                  <span className="font-semibold tabular-nums">
                                    {shareRuleUI.shares || 0}
                                  </span>{" "}
                                  Shares ={" "}
                                  <span className="font-semibold tabular-nums">
                                    {intStr(shareRuleUI.amount)}
                                  </span>{" "}
                                  XPOLL • Pool{" "}
                                  <span className="font-semibold tabular-nums">
                                    {intStr(shareRuleUI.payoutCap)}
                                  </span>{" "}
                                  XPOLL
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="font-medium text-[#5E6366]">
                              Target Geo
                            </label>
                            <Controller
                              control={form.control}
                              name="targetGeo"
                              render={({ field }) => {
                                const countries = Array.isArray(
                                  field.value?.countries,
                                )
                                  ? field.value.countries
                                  : [];
                                const states = Array.isArray(
                                  field.value?.states,
                                )
                                  ? field.value.states
                                  : [];
                                const cities = Array.isArray(
                                  field.value?.cities,
                                )
                                  ? field.value.cities
                                  : [];
                                const cityId =
                                  typeof cities[0] === "string"
                                    ? cities[0]
                                    : null;
                                const singleValue = cityId
                                  ? {
                                      value: cityId,
                                      label:
                                        cityDisplayLabel ?? "Selected city",
                                    }
                                  : null;
                                const countryId =
                                  typeof countries[0] === "string"
                                    ? countries[0]
                                    : null;
                                const countryValue = countryId
                                  ? {
                                      value: countryId,
                                      label:
                                        countryDisplayLabel ??
                                        "Selected country",
                                    }
                                  : null;

                                if (isBasic) {
                                  return (
                                    <CountrySelect
                                      placeholder="Search country..."
                                      selectProps={{
                                        isMulti: false,
                                        closeMenuOnSelect: true,
                                        isClearable: true,
                                        isDisabled: !canEditMain,
                                        value: countryValue as never,
                                        onChange: (
                                          opt: CountryOption | null,
                                        ) => {
                                          const ids = opt ? [opt.value] : [];
                                          const nextTargetGeo = {
                                            countries: ids,
                                            states: [],
                                            cities: [],
                                          };
                                          field.onChange(nextTargetGeo);
                                          setAddInfoPatch(userId, {
                                            targetGeo: nextTargetGeo,
                                            targetGeoCountryLabel: opt?.label,
                                            targetGeoCityLabel: undefined,
                                          });
                                        },
                                      }}
                                      onChange={(opt) => {
                                        const o = opt as CountryOption | null;
                                        const ids = o ? [o.value] : [];
                                        const nextTargetGeo = {
                                          countries: ids,
                                          states: [],
                                          cities: [],
                                        };
                                        field.onChange(nextTargetGeo);
                                        setAddInfoPatch(userId, {
                                          targetGeo: nextTargetGeo,
                                          targetGeoCountryLabel: o?.label,
                                          targetGeoCityLabel: undefined,
                                        });
                                      }}
                                    />
                                  );
                                }

                                return (
                                  <CitySelect
                                    placeholder="Search city..."
                                    selectProps={{
                                      isMulti: false,
                                      closeMenuOnSelect: true,
                                      isClearable: true,
                                      isDisabled: !canEditMain,
                                      value: singleValue as never,
                                      onChange: (opt: CityOption | null) => {
                                        const ids = opt ? [opt.value] : [];
                                        field.onChange({
                                          countries,
                                          states,
                                          cities: ids,
                                        });
                                        setAddInfoPatch(userId, {
                                          targetGeo: {
                                            countries,
                                            states,
                                            cities: ids,
                                          },
                                          targetGeoCityLabel: opt?.label,
                                          targetGeoCountryLabel: undefined,
                                        });
                                      },
                                    }}
                                    onChange={(opt) => {
                                      const o = opt as CityOption | null;
                                      const ids = o ? [o.value] : [];
                                      field.onChange({
                                        countries,
                                        states,
                                        cities: ids,
                                      });
                                      setAddInfoPatch(userId, {
                                        targetGeo: {
                                          countries,
                                          states,
                                          cities: ids,
                                        },
                                        targetGeoCityLabel: o?.label,
                                        targetGeoCountryLabel: undefined,
                                      });
                                    }}
                                  />
                                );
                              }}
                            />
                            {isBasic &&
                            ((Array.isArray(targetGeo?.countries) &&
                              targetGeo.countries[0]) ||
                              countryDisplayLabel) ? (
                              <p className="text-xl font-semibold text-[#1B1B1B] mt-2">
                                {countryDisplayLabel ?? "Selected country"}
                              </p>
                            ) : !isBasic &&
                              ((Array.isArray(targetGeo?.cities) &&
                                targetGeo.cities[0]) ||
                                cityDisplayLabel) ? (
                              <p className="text-xl font-semibold text-[#1B1B1B] mt-2">
                                {cityDisplayLabel ?? "Selected city"}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <div className="flex items-center justify-between pb-2">
                              <div className="font-medium text-[#5E6366]">
                                Add Links
                              </div>
                              <button
                                type="button"
                                disabled={!canEditMain}
                                onClick={() =>
                                  canEditMain && setActiveModal("ADD_LINKS")
                                }
                                className={cn(
                                  "rounded-full bg-[#E4F2DF] px-3 py-1 text-sm font-medium text-[#315326]",
                                  !canEditMain
                                    ? "opacity-60 cursor-not-allowed"
                                    : "",
                                )}
                              >
                                + Add Link
                              </button>
                            </div>
                            <button
                              type="button"
                              disabled={!canEditMain}
                              onClick={() =>
                                canEditMain && setActiveModal("ADD_LINKS")
                              }
                              className={cn(
                                "w-full rounded-lg bg-white border border-black/10 px-3 py-3 flex items-center gap-7",
                                !canEditMain
                                  ? "opacity-60 cursor-not-allowed"
                                  : "",
                              )}
                            >
                              {/* X icon is an <img>; tint to match Lucide icons (#22C55E) when link exists */}
                              <img
                                src={xIcon}
                                alt="X"
                                className={cn(
                                  "h-6 w-6 transition",
                                  linkFilled.x ? "text-[#22C55E]" : "",
                                )}
                                style={
                                  linkFilled.x
                                    ? {
                                        filter:
                                          "invert(70%) sepia(20%) saturate(2420%) hue-rotate(86deg) brightness(95%) contrast(105%)",
                                      }
                                    : undefined
                                }
                              />

                              <Instagram
                                className={iconCls(linkFilled.instagram)}
                              />
                              <Send className={iconCls(linkFilled.telegram)} />
                              <Mail className={iconCls(linkFilled.email)} />
                              <Globe className={iconCls(linkFilled.website)} />
                            </button>
                            {addInfoDraftLinksError ? (
                              <p className="mt-2 text-xs text-red-600">
                                {addInfoDraftLinksError}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-2">
                            <h2 className="font-medium text-[#5E6366]">
                              Linked Industries{" "}
                              <span className="text-[#7A7A7A] text-sm font-normal">
                                (max 3)
                              </span>
                            </h2>
                            <IndustryInfiniteSelect
                              placeholder="Search industries…"
                              queryParams={{
                                ...(linkedIndustries.length > 0
                                  ? { excludeIds: linkedIndustries.join(",") }
                                  : {}),
                              }}
                              onChange={onIndustrySelect}
                              selectProps={{
                                isDisabled:
                                  !canEditMain || linkedIndustries.length >= 3,
                              }}
                            />
                            {linkedIndustries.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {linkedIndustries.map((id) => (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1 rounded-full bg-[#E4F2DF] px-3 py-1 text-sm text-[#315326]"
                                  >
                                    {linkedIndustryNames[id] ?? id}
                                    {canEditMain && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onRemoveLinkedIndustry(id)
                                        }
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-[#78BC61]/20 transition"
                                        aria-label={`Remove ${linkedIndustryNames[id] ?? id}`}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </section>

                        <section className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-[#5E6366]">
                                Add Images{" "}
                                <span className="text-red-600">*</span>
                              </p>
                              <p className="text-[#7A7A7A] text-sm">
                                (JPG, PNG, WEBP, GIF, max {MAX_IMAGE_MB} MB
                                each) {imageCount}/3
                              </p>
                            </div>
                            <div className="grid grid-cols-[1fr_160px] gap-2">
                              <div
                                onDragEnter={(e) => onImgDragEnter(e, 0)}
                                onDragLeave={(e) => onImgDragLeave(e, 0)}
                                onDragOver={(e) => onImgDragOver(e, 0)}
                                onDrop={(e) => onImgDrop(e, 0)}
                                className={cn(
                                  "relative rounded-xl transition-all",
                                  dragOverSlot === 0 &&
                                    "ring-2 ring-[#78BC61] ring-dashed",
                                )}
                              >
                                <ImageSlot
                                  size="big"
                                  value={imageLinks[0] as string | null}
                                  onPick={() => openImagePicker(0)}
                                  onRemove={() => removeImage(0)}
                                  error={imgErr0?.message}
                                />
                                {dragOverSlot === 0 && (
                                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                                    <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium">
                                      Drop to upload
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-rows-2 gap-2">
                                <div
                                  onDragEnter={(e) => onImgDragEnter(e, 1)}
                                  onDragLeave={(e) => onImgDragLeave(e, 1)}
                                  onDragOver={(e) => onImgDragOver(e, 1)}
                                  onDrop={(e) => onImgDrop(e, 1)}
                                  className={cn(
                                    "relative rounded-xl transition-all",
                                    dragOverSlot === 1 &&
                                      "ring-2 ring-[#78BC61] ring-dashed",
                                  )}
                                >
                                  <ImageSlot
                                    size="sm"
                                    value={imageLinks[1] as string | null}
                                    onPick={() => openImagePicker(1)}
                                    onRemove={() => removeImage(1)}
                                    error={imgErr1?.message}
                                  />
                                  {dragOverSlot === 1 && (
                                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                                      <div className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
                                        Drop to upload
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div
                                  onDragEnter={(e) => onImgDragEnter(e, 2)}
                                  onDragLeave={(e) => onImgDragLeave(e, 2)}
                                  onDragOver={(e) => onImgDragOver(e, 2)}
                                  onDrop={(e) => onImgDrop(e, 2)}
                                  className={cn(
                                    "relative rounded-xl transition-all",
                                    dragOverSlot === 2 &&
                                      "ring-2 ring-[#78BC61] ring-dashed",
                                  )}
                                >
                                  <ImageSlot
                                    size="sm"
                                    value={imageLinks[2] as string | null}
                                    onPick={() => openImagePicker(2)}
                                    onRemove={() => removeImage(2)}
                                    error={imgErr2?.message}
                                  />
                                  {dragOverSlot === 2 && (
                                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                                      <div className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
                                        Drop to upload
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <input
                              ref={fileRef}
                              type="file"
                              accept={ACCEPT_IMAGE}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                onPickFile(f);
                                e.currentTarget.value = "";
                              }}
                            />
                            {cropUISlot !== null && cropperImageUrl && (
                              <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                                <p className="mb-2 text-sm font-medium text-[#5E6366]">
                                  Crop image (slot {cropUISlot + 1})
                                </p>
                                <div
                                  className="relative w-full overflow-hidden rounded-lg bg-[#dfd7d7]"
                                  style={{ height: ADD_INFO_CROP_VIEW_H }}
                                >
                                  <EasyReactCropper
                                    key={cropperImageUrl}
                                    image={cropperImageUrl}
                                    ref={cropperRef}
                                    width={ADD_INFO_CROP_VIEW_W}
                                    height={ADD_INFO_CROP_VIEW_H}
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
                                  <Button
                                    type="button"
                                    onClick={handleSaveCrop}
                                  >
                                    Apply Crop
                                  </Button>
                                </div>
                              </div>
                            )}
                            {anySlotError ? (
                              <p className="mt-2 text-[11px] text-red-600">
                                {String(anySlotError)}
                              </p>
                            ) : null}
                            {errors.imageLinks?.message ? (
                              <p className="mt-2 text-[11px] text-red-600">
                                {String(errors.imageLinks.message)}
                              </p>
                            ) : imageCount < 3 ? (
                              <p className="mt-2 text-[11px] text-[#7A7A7A]">
                                Add {3 - imageCount} more image
                                {3 - imageCount === 1 ? "" : "s"} (JPG, PNG,
                                WEBP, GIF, max {MAX_IMAGE_MB} MB each)
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-[#5E6366]">
                                Upload Video
                              </p>
                              <p className="text-[#7A7A7A] text-sm">
                                {VIDEO_UPLOAD_HELPER_TEXT}
                              </p>
                            </div>
                            <MediaDropzone
                              slotIndex={undefined}
                              accept={VIDEO_UPLOAD_ACCEPT}
                              disabled={!canEditMain}
                              onFiles={(files) => {
                                const f = files[0];
                                if (f) onPickVideoFile(f);
                              }}
                              onPickClick={openVideoPicker}
                              className={cn(
                                "rounded-xl bg-white border border-black/10 p-3",
                                !uploadedVideoVal &&
                                  "min-h-[300px] flex flex-col",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex-1",
                                  !uploadedVideoVal && "flex min-h-[300px]",
                                )}
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
                                      autoPlay
                                      muted
                                      loop
                                      className="w-full rounded-lg h-[300px] object-cover bg-black/5"
                                    />
                                    <button
                                      type="button"
                                      onClick={removeVideo}
                                      disabled={!canEditMain}
                                      className={cn(
                                        "absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow hover:bg-white",
                                        !canEditMain
                                          ? "opacity-60 cursor-not-allowed"
                                          : "",
                                      )}
                                      aria-label="Remove video"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openVideoPicker();
                                      }}
                                      disabled={!canEditMain}
                                      className={cn(
                                        "mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-[12px] font-medium",
                                        !canEditMain
                                          ? "opacity-60 cursor-not-allowed"
                                          : "",
                                      )}
                                    >
                                      Replace video
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openVideoPicker();
                                    }}
                                    disabled={!canEditMain}
                                    className={cn(
                                      "w-full min-h-[300px] rounded-lg border border-dashed border-black/15 px-3 py-6 flex items-center justify-center",
                                      !canEditMain
                                        ? "opacity-60 cursor-not-allowed"
                                        : "",
                                    )}
                                  >
                                    <div className="flex items-center gap-2 text-xs text-[#315326]">
                                      <FileText className="h-4 w-4 text-[#78BC61]" />
                                      <span>
                                        + Upload video ({MAX_VIDEO_MB} MB max)
                                      </span>
                                    </div>
                                  </button>
                                )}
                              </div>
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
                              {videoErr ? (
                                <p className="mt-2 text-[11px] text-red-600">
                                  {String(videoErr)}
                                </p>
                              ) : null}
                            </MediaDropzone>
                          </div>

                          {/* ----------------- COPIED: Donation toggle ----------------- */}
                          {showDonationToggle && (
                            <div className="rounded-lg bg-white border border-black/10 px-4 py-3 flex items-center justify-between">
                              <div className="text-[#535353]">
                                Donation button
                              </div>

                              <PermissionDisabledTooltip
                                hasPermission={
                                  permissions.campaign.toggleDonation
                                }
                              >
                                <button
                                  type="button"
                                  onClick={onToggleDonation}
                                  disabled={!canEditDonation}
                                  className={cn(
                                    "relative h-6 w-11 rounded-full transition",
                                    donationEnabled
                                      ? "bg-[#CFF3CF]"
                                      : "bg-[#E6E6E6]",
                                    !canEditDonation
                                      ? "opacity-60 cursor-not-allowed"
                                      : "",
                                  )}
                                  title={
                                    !donationSupported
                                      ? "Donation not supported by current plan"
                                      : status !== "paused"
                                        ? "Pause campaign to edit donation"
                                        : ""
                                  }
                                >
                                  <div
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition",
                                      donationEnabled
                                        ? "right-1 bg-[#22C55E]"
                                        : "left-1 bg-[#BFBFBF]",
                                    )}
                                  />
                                </button>
                              </PermissionDisabledTooltip>
                            </div>
                          )}
                          {/* ---------------------------------------------------------- */}

                          {/* ----------------- COPIED: Petitions toggle ----------------- */}
                          {!isBasic ? (
                            <div
                              ref={petitionToggleRef}
                              className="rounded-lg bg-white border border-black/10 px-4 py-3 flex items-center justify-between"
                            >
                              <div className="text-[#535353]">Petitions</div>

                              <PermissionDisabledTooltip
                                hasPermission={
                                  permissions.campaignPetition.toggleGlobalEnable
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (petitionToggling) return;
                                    togglePetitions(!petitionEnabled);
                                  }}
                                  disabled={petitionToggling}
                                  className={cn(
                                    "relative h-6 w-11 rounded-full transition",
                                    petitionEnabled
                                      ? "bg-[#CFF3CF]"
                                      : "bg-[#E6E6E6]",
                                    petitionToggling
                                      ? "opacity-60 cursor-not-allowed"
                                      : "",
                                  )}
                                  title="Enable/disable petitions for this campaign"
                                >
                                  <div
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition",
                                      petitionEnabled
                                        ? "right-1 bg-[#22C55E]"
                                        : "left-1 bg-[#BFBFBF]",
                                    )}
                                  />
                                </button>
                              </PermissionDisabledTooltip>
                            </div>
                          ) : null}
                          {/* ---------------------------------------------------------- */}
                        </section>
                      </div>

                      <div className="px-6 pb-4 pt-10 flex justify-between">
                        <div className="flex items-center gap-2 font-medium text-[#ED0C1D]">
                          <TriangleAlert className="h-4 w-4" />
                          <span>
                            To save draft or to publish go to overview dashboard
                          </span>
                        </div>
                        <button
                          type="submit"
                          onClick={() => {
                            debugAddInfoSave("button:click", {
                              saveDisabledReasons,
                              canEditMain,
                              isValid,
                              isSubmitting,
                              isSaving,
                              addInfoDraftLinksError,
                              errors,
                              values: getValues(),
                            });
                          }}
                          disabled={
                            !canEditMain ||
                            !isValid ||
                            isSubmitting ||
                            isSaving ||
                            !!addInfoDraftLinksError
                          }
                          className={cn(
                            "min-w-[170px] rounded-full bg-blue px-8 py-3 tracking-wide text-white",
                            !canEditMain ||
                              !isValid ||
                              isSubmitting ||
                              isSaving ||
                              !!addInfoDraftLinksError
                              ? "opacity-60 cursor-not-allowed"
                              : "",
                          )}
                        >
                          {isSubmitting || isSaving ? "Saving..." : "SAVE INFO"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <AddInfoFlowModal
                  campaignId={currentCampaignId}
                  active={activeModal}
                  onClose={() => {
                    if (
                      activeModal === "SHARE_REWARDS" &&
                      shareEnabled &&
                      !shareSavedRef.current
                    ) {
                      setShareEnabled(false);
                    }
                    setActiveModal(null);
                  }}
                  donationStartDate={donationStartDate}
                  donationEndDate={donationEndDate}
                  donationMinStartDate={donationMinStartYMD}
                  donationMaxEndDate={donationPlanEndYMD}
                  links={{
                    x: links?.x ?? "",
                    instagram: links?.instagram ?? "",
                    telegram: links?.telegram ?? "",
                    email: links?.email ?? "",
                    website: links?.website ?? "",
                  }}
                  onPaid={() => setActiveModal("DONATION_SETTINGS")}
                  onDonationSaved={(v) => {
                    if (!canEditDonation) return;

                    const built = makeDonationPayload(
                      true,
                      (v as any).startDate,
                      (v as any).endDate,
                    );

                    setDonationStartDate(built.startClamped);
                    setDonationEndDate(built.endClamped);
                    setDonationEnabled(true);

                    queueDonationUpdate({
                      enabled: true,
                      startAt: built.startAt,
                      endAt: built.endAt,
                    });

                    setActiveModal(null);
                  }}
                  onLinksSaved={(v) => {
                    setValue("links", {
                      x: v.twitterLink ?? "",
                      instagram: v.instagramLink ?? "",
                      telegram: v.telegramLink ?? "",
                      email: v.emailLink ?? "",
                      website: v.websiteLink ?? "",
                    });
                    setAddInfoDraftLinksError(null);
                    setActiveModal(null);
                  }}
                  onLinksClose={(hasError, message) => {
                    setAddInfoDraftLinksError(
                      hasError
                        ? (message ?? "Fix or remove invalid link(s).")
                        : null,
                    );
                  }}
                  shareRewardsInitial={{
                    shares: shareRuleUI.shares,
                    payoutCap: intStr(shareRuleUI.payoutCap),
                    amount: intStr(shareRuleUI.amount),
                  }}
                  onShareRewardsSaved={(saved) => {
                    shareSavedRef.current = true;
                    setShareEnabled(true);
                    setShareRuleUI({
                      shares: (saved as any).shares,
                      payoutCap: (saved as any).payoutCap,
                      amount: (saved as any).amount,
                    });

                    setActiveModal(null);

                    queryClient.invalidateQueries({
                      queryKey: [
                        endpoints.campaigns.getCampaignByIdOwner(
                          currentCampaignId,
                        ),
                      ],
                    });
                  }}
                />
              </>
            )}
        </CampaignLayout>
      )}
    </PreventLeaveGuard>
  );
}
