import { create } from "zustand";
import type { CampaignType } from "@/types/campaigns";
import type { AssetType } from "@/utils/currency-assets/asset";
import { CAMPAIGN_STATUS, type CampaignStatus } from "@/utils/campaign-status";
import type { CampaignAddInfoValues } from "@/schema/campaign.schemas";

export type AddInfoLinks = {
  x: string;
  instagram: string;
  telegram: string;
  email: string;
  website: string;
};

export type DonationConfig = {
  enabled: boolean;
  startDate: string;
  endDate: string;
};

export type AddInfoState = {
  description: string;
  location: string;
  videoLink: string;
  imageLinks: (string | null)[];
  uploadedVideoLinks: (string | null)[];
  links: AddInfoLinks;
  donation: DonationConfig;
  targetGeo?: {
    countries: any;
    states: any;
    cities: any;
  };
};

export type TrailReward = {
  id: string;
  assetId: AssetType;
  rewardAmountCap: number;
  amount: number;
  rewardType: "min" | "max";
  expireRewardAt?: string;
};

export type PollResourceAsset = {
  type: "image" | "youtube" | "video";
  value: string | File;
};

export type TrailPoll = {
  id: string;
  pollName: string;
  pollDescription: string;
  resourceAssets: PollResourceAsset[];
  options: string[];
};

export type Trail = {
  id: string;
  trailName: string;
  description: string;
  videoUrl?: string;
  images: (string | null)[];
  polls: TrailPoll[];
  rewards: TrailReward[];
};

type CreateCampaignBasics = {
  campaignId: string | null;
  campaignName: string;
  goal: string;
  getDataAccess: boolean;
  campaignType: CampaignType;
  duration: string;
};

export type AddInfoDraftPayload = {
  campaignId: string;
  expiresAt: number;
  addInfo: CampaignAddInfoValues;
  /** Display-only city name (from API or user selection); not sent in payload. */
  targetGeoCityLabel?: string;
  /** Display-only country name (from API or user selection); not sent in payload. */
  targetGeoCountryLabel?: string;
  /** Display-only industry names for linkedIndustries; not sent in payload. */
  linkedIndustryNames?: Record<string, string>;
};

export type AddInfoPersistValue = {
  campaignId: string;
  addInfo: CampaignAddInfoValues;
  updatedAt: number;
  expiresAt: number;
  targetGeoCityLabel?: string;
  targetGeoCountryLabel?: string;
  linkedIndustryNames?: Record<string, string>;
};

/** Patch for setAddInfoPatch: form fields + optional display labels. */
export type AddInfoPatch = Partial<CampaignAddInfoValues> & {
  targetGeoCityLabel?: string;
  targetGeoCountryLabel?: string;
  linkedIndustryNames?: Record<string, string>;
};

type CreateCampaignStore = CreateCampaignBasics & {
  campaignStatus: CampaignStatus;
  setCampaignStatus: (s: CampaignStatus) => void;

  addInfo: AddInfoState;

  /** Current userId used for add-info persist */
  persistUserId: string | null;
  /** Per-user add-info drafts; persisted in main store so refresh keeps data */
  addInfoDraftByUser: Record<string, AddInfoDraftPayload>;
  /** In-memory add-info draft for current user (addInfoDraftByUser[persistUserId]) */
  addInfoDraft: AddInfoDraftPayload | null;
  /** Links validation error when modal closed with invalid data (not persisted) */
  addInfoDraftLinksError: string | null;
  /** Sets current user and restores addInfoDraft from addInfoDraftByUser[userId] */
  setPersistUserId: (userId: string) => void;
  setAddInfoDraftFromPersisted: (data: AddInfoDraftPayload) => void;
  setAddInfoDraftLinksError: (error: string | null) => void;
  hydrateFromCampaign: (
    campaignId: string,
    data: CampaignAddInfoValues,
    userId?: string,
    linkedIndustryNames?: Record<string, string>,
  ) => void;
  /** Persist add-info for user (call from add-info page on every edit). Patch may include targetGeoCityLabel for display. */
  setAddInfoPatch: (userId: string, patch: AddInfoPatch) => void;
  /** @deprecated use setAddInfoPatch(userId, patch) */
  setField: (patch: Partial<CampaignAddInfoValues>) => void;
  clearAddInfoDraft: () => void;
  clearPersisted: () => void;
  isExpired: () => boolean;
  clearIfExpired: () => void;
  getAddInfoDraft: () => AddInfoDraftPayload | null;
  getHasValidPersistedData: (now: number) => boolean;
  loadPersistedForUser: (userId: string) => void;

  trails: Trail[];
  setCampaignId: (id: string | null) => void;
  setBasics: (v: Partial<CreateCampaignBasics>) => void;

  setAddInfo: (v: Partial<Omit<AddInfoState, "links" | "donation" | "imageLinks" | "uploadedVideoLinks">>) => void;
  setLinks: (v: Partial<AddInfoLinks>) => void;
  setDonation: (v: Partial<DonationConfig>) => void;

  setImageLinks: (imageLinks: (string | null)[]) => void;
  setUploadedVideoLinks: (videos: (string | null)[]) => void;

  addTrail: (trail: Trail) => void;
  removeTrail: (id: string) => void;
  updateTrail: (trail: Trail) => void;
  setTrails: (next: Trail[]) => void;

  resetAll: () => void;
};

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ADD_INFO_DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ADD_INFO_PERSIST_KEY_PREFIX = "xpoll-create-campaign";
 
export function getAddInfoPersistKey(userId: string): string {
  return `${ADD_INFO_PERSIST_KEY_PREFIX}/${userId}`;
}

/** Normalize array that may contain IDs or populated objects to string[] (IDs only). */
function toIdList(arr: unknown, max: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object" && "_id" in item) return String((item as { _id: unknown })._id);
      return null;
    })
    .filter((id): id is string => id != null)
    .slice(0, max);
}

function normalizeTargetGeoToIds(tg: unknown): { countries: string[]; states: string[]; cities: string[] } {
  if (!tg || typeof tg !== "object") return { countries: [], states: [], cities: [] };
  const o = tg as { countries?: unknown[]; states?: unknown[]; cities?: unknown[] };
  return {
    countries: toIdList(o.countries, 999),
    states: toIdList(o.states, 999),
    cities: toIdList(o.cities, 1),
  };
}

/** Sanitize add-info for persist. Never store imageLinks/uploadedVideoLinks in store — always map from GET API. */
function sanitizeCampaignAddInfoValues(v: CampaignAddInfoValues): CampaignAddInfoValues {
  const targetGeo = normalizeTargetGeoToIds(v?.targetGeo);
  return {
    ...v,
    imageLinks: [null, null, null],
    uploadedVideoLinks: [],
    videoLink: typeof v?.videoLink === "string" ? v.videoLink : "",
    targetGeo,
  };
}

function safeLocalStorageSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

function safeLocalStorageRemoveItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** Read persisted add-info for user from localStorage (key = xpoll-create-campaign/<userId>). Value must include campaignId. */
export function readAddInfoFromLocalStorage(userId: string): AddInfoPersistValue | null {
  try {
    const key = getAddInfoPersistKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AddInfoPersistValue | null;

    if (
      !parsed ||
      typeof parsed.campaignId !== "string" ||
      !parsed.addInfo ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    const linkedIndustryNames =
      parsed.linkedIndustryNames &&
      typeof parsed.linkedIndustryNames === "object" &&
      !Array.isArray(parsed.linkedIndustryNames)
        ? (parsed.linkedIndustryNames as Record<string, string>)
        : undefined;

    return {
      campaignId: parsed.campaignId,
      addInfo: sanitizeCampaignAddInfoValues(parsed.addInfo),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      expiresAt: parsed.expiresAt,
      targetGeoCityLabel: typeof parsed.targetGeoCityLabel === "string" ? parsed.targetGeoCityLabel : undefined,
      targetGeoCountryLabel: typeof parsed.targetGeoCountryLabel === "string" ? parsed.targetGeoCountryLabel : undefined,
      linkedIndustryNames,
    };
  } catch {
    return null;
  }
}

/** Write persisted add-info to localStorage (key = xpoll-create-campaign/<userId>). Value includes campaignId, addInfo, updatedAt, expiresAt, optional targetGeoCityLabel. */
export function writeAddInfoToLocalStorage(userId: string, payload: AddInfoPersistValue): void {
  try {
    const key = getAddInfoPersistKey(userId);
    const safePayload: AddInfoPersistValue = {
      ...payload,
      addInfo: sanitizeCampaignAddInfoValues(payload.addInfo),
      targetGeoCityLabel: payload.targetGeoCityLabel,
      targetGeoCountryLabel: payload.targetGeoCountryLabel,
    };
    safeLocalStorageSetItem(key, JSON.stringify(safePayload));
  } catch {
    // swallow
  }
}

export const DEFAULT_STATE: Omit<
  CreateCampaignStore,
  | "setBasics"
  | "setAddInfo"
  | "setLinks"
  | "setDonation"
  | "setImageLinks"
  | "setUploadedVideoLinks"
  | "addTrail"
  | "removeTrail"
  | "updateTrail"
  | "setTrails"
  | "resetAll"
  | "setCampaignId"
  | "setCampaignStatus"
  | "setPersistUserId"
  | "setAddInfoDraftFromPersisted"
  | "hydrateFromCampaign"
  | "setAddInfoPatch"
  | "setField"
  | "clearAddInfoDraft"
  | "clearPersisted"
  | "isExpired"
  | "clearIfExpired"
  | "getAddInfoDraft"
  | "getHasValidPersistedData"
  | "loadPersistedForUser"
  | "setAddInfoDraftLinksError"
> = {
  campaignId: null,
  campaignName: "",
  goal: "",
  getDataAccess: false,
  campaignType: "non_political",
  duration: "",

  campaignStatus: CAMPAIGN_STATUS.DRAFT,

  persistUserId: null,
  addInfoDraftByUser: {},
  addInfoDraft: null,
  addInfoDraftLinksError: null,

  addInfo: {
    description: "",
    location: "",
    videoLink: "",
    imageLinks: [null, null, null],
    uploadedVideoLinks: [],
    links: { x: "", instagram: "", telegram: "", email: "", website: "" },
    donation: {
      enabled: false,
      startDate: todayISO(),
      endDate: todayISO(),
    },
    targetGeo: { countries: [], states: [], cities: [] },
  },

  trails: [],
};

function normalizeImages3(v: any): (string | null)[] {
  const arr = Array.isArray(v) ? v : [];
  return [arr?.[0] ?? null, arr?.[1] ?? null, arr?.[2] ?? null];
}

function normalizeVideos1(v: any): (string | null)[] {
  const arr = Array.isArray(v) ? v : [];
  return [arr?.[0] ?? null];
}

type SetState = (partial: Partial<CreateCampaignStore> | ((s: CreateCampaignStore) => Partial<CreateCampaignStore>)) => void;

export const useCreateCampaignStore = create<CreateCampaignStore>()(((set: SetState): CreateCampaignStore => ({
    ...DEFAULT_STATE,

    setCampaignStatus: (campaignStatus) => set(() => ({ campaignStatus })),
      setCampaignId: (id) => set(() => ({ campaignId: id })),

    setPersistUserId: (userId) =>
        set((s: CreateCampaignStore) => ({
          persistUserId: userId,
          addInfoDraft: s.addInfoDraftByUser[userId] ?? null,
        })),

      setAddInfoDraftFromPersisted: (data) => set(() => ({ addInfoDraft: data })),

      setAddInfoDraftLinksError: (error) => set(() => ({ addInfoDraftLinksError: error })),

    hydrateFromCampaign: (campaignId, data, userIdForStorage, linkedIndustryNames) =>
        set((s: CreateCampaignStore) => {
          const uid = userIdForStorage ?? s.persistUserId;
          const expiresAt = Date.now() + ADD_INFO_DRAFT_TTL_MS;
          const updatedAt = Date.now();

          const safeData = sanitizeCampaignAddInfoValues(data);

          const payload: AddInfoDraftPayload = {
            campaignId,
            expiresAt,
            addInfo: safeData,
            linkedIndustryNames,
          };

          const byUser =
            uid != null ? { ...s.addInfoDraftByUser, [uid]: payload } : s.addInfoDraftByUser;

          if (uid) {
            writeAddInfoToLocalStorage(uid, {
              campaignId,
              addInfo: safeData,
              updatedAt,
              expiresAt,
              linkedIndustryNames,
            });
          }

          return { addInfoDraft: payload, addInfoDraftByUser: byUser };
        }),

      setAddInfoPatch: (userId, patch) =>
        set((s) => {
          const existing = s.addInfoDraftByUser[userId] ?? null;
          if (!existing) return s;

          const expiresAt = Date.now() + ADD_INFO_DRAFT_TTL_MS;
          const updatedAt = Date.now();
          const {
            targetGeoCityLabel: patchLabel,
            targetGeoCountryLabel: patchCountryLabel,
            linkedIndustryNames: patchNames,
            ...addInfoPatch
          } = patch as AddInfoPatch;
          const merged = { ...existing.addInfo, ...addInfoPatch } as CampaignAddInfoValues;
          merged.imageLinks = [null, null, null];
          merged.uploadedVideoLinks = [];
          const citiesEmpty = !Array.isArray(merged.targetGeo?.cities) || merged.targetGeo.cities.length === 0;
          const targetGeoCityLabel = citiesEmpty ? undefined : (patchLabel !== undefined ? patchLabel : existing.targetGeoCityLabel);
          const countriesEmpty = !Array.isArray(merged.targetGeo?.countries) || merged.targetGeo.countries.length === 0;
          const targetGeoCountryLabel =
            countriesEmpty ? undefined : (patchCountryLabel !== undefined ? patchCountryLabel : existing.targetGeoCountryLabel);
          const linkedIndustryNames =
            patchNames !== undefined ? patchNames : existing.linkedIndustryNames;

          const nextDraft: AddInfoDraftPayload = {
            ...existing,
            expiresAt,
            addInfo: merged,
            targetGeoCityLabel,
            targetGeoCountryLabel,
            linkedIndustryNames,
          };

          const byUser = { ...s.addInfoDraftByUser, [userId]: nextDraft };
          const draftForCurrent = s.persistUserId === userId ? nextDraft : s.addInfoDraft;

          writeAddInfoToLocalStorage(userId, {
            campaignId: nextDraft.campaignId,
            addInfo: sanitizeCampaignAddInfoValues(merged),
            updatedAt,
            expiresAt,
            targetGeoCityLabel,
            targetGeoCountryLabel,
            linkedIndustryNames,
          });

          return {
            addInfoDraft: draftForCurrent,
            addInfoDraftByUser: byUser,
          };
        }),

      setField: (patch) => {
        const s = useCreateCampaignStore.getState();
        if (s.persistUserId) s.setAddInfoPatch(s.persistUserId, patch);
      },

      clearAddInfoDraft: () =>
        set((s) => {
          const byUser =
            s.persistUserId != null
              ? (() => {
                  const next = { ...s.addInfoDraftByUser };
                  delete next[s.persistUserId];
                  return next;
                })()
              : s.addInfoDraftByUser;
          return {
            addInfoDraft: null,
            addInfoDraftLinksError: null,
            addInfoDraftByUser: byUser,
          };
        }),

      clearPersisted: () =>
        set((s) => {
          if (s.persistUserId) {
            safeLocalStorageRemoveItem(getAddInfoPersistKey(s.persistUserId));
            const byUser = { ...s.addInfoDraftByUser };
            delete byUser[s.persistUserId];
            return { addInfoDraft: null, addInfoDraftByUser: byUser };
          }
          return { addInfoDraft: null };
        }),

      isExpired: () => {
        const s = useCreateCampaignStore.getState();
        if (!s.addInfoDraft) return true;
        return Date.now() > s.addInfoDraft.expiresAt;
      },

      clearIfExpired: () =>
        set((s) => {
          if (!s.addInfoDraft) return s;
          if (Date.now() > s.addInfoDraft.expiresAt) {
            if (s.persistUserId) {
              safeLocalStorageRemoveItem(getAddInfoPersistKey(s.persistUserId));
              const byUser = { ...s.addInfoDraftByUser };
              delete byUser[s.persistUserId];
              return { addInfoDraft: null, addInfoDraftByUser: byUser };
            }
            return { addInfoDraft: null };
          }
          return s;
        }),

      getAddInfoDraft: () => useCreateCampaignStore.getState().addInfoDraft,

      getHasValidPersistedData: (now) => {
        const s = useCreateCampaignStore.getState();
        return !!(s.addInfoDraft && s.addInfoDraft.expiresAt >= now && s.addInfoDraft.addInfo);
      },

      /** Read from localStorage key xpoll-create-campaign/<userId> and hydrate store. Value must include campaignId. */
      loadPersistedForUser: (userId) => {
        const raw = readAddInfoFromLocalStorage(userId);
        if (!raw) return;
        if (raw.expiresAt < Date.now()) return;

        const payload: AddInfoDraftPayload = {
          campaignId: raw.campaignId,
          expiresAt: raw.expiresAt,
          addInfo: raw.addInfo,
          targetGeoCityLabel: raw.targetGeoCityLabel,
          targetGeoCountryLabel: raw.targetGeoCountryLabel,
          linkedIndustryNames: raw.linkedIndustryNames,
        };

        useCreateCampaignStore.setState((s) => ({
          addInfoDraft: payload,
          addInfoDraftByUser: { ...s.addInfoDraftByUser, [userId]: payload },
        }));
      },

      setBasics: (v) =>
        set((s) => ({
          campaignId: v.campaignId ?? s.campaignId,
          campaignName: v.campaignName ?? s.campaignName,
          goal: v.goal ?? s.goal,
          getDataAccess: v.getDataAccess ?? s.getDataAccess,
          campaignType: v.campaignType ?? s.campaignType,
          duration: v.duration ?? s.duration,
        })),

      setAddInfo: (v) => set((s) => ({ addInfo: { ...s.addInfo, ...v } })),

      setLinks: (v) =>
        set((s) => ({
          addInfo: { ...s.addInfo, links: { ...s.addInfo.links, ...v } },
        })),

      setDonation: (v) =>
        set((s) => ({
          addInfo: {
            ...s.addInfo,
            donation: { ...s.addInfo.donation, ...v },
          },
        })),

      setImageLinks: (imageLinks) =>
        set((s) => ({
          addInfo: { ...s.addInfo, imageLinks: normalizeImages3(imageLinks) },
        })),

      setUploadedVideoLinks: (videos) =>
        set((s) => ({
          addInfo: { ...s.addInfo, uploadedVideoLinks: normalizeVideos1(videos) },
        })),

      addTrail: (trail) => set((s) => ({ trails: [trail, ...s.trails] })),
      removeTrail: (id) =>
        set((s) => ({ trails: s.trails.filter((t) => t.id !== id) })),
      updateTrail: (trail) =>
        set((s) => ({
          trails: s.trails.map((t) => (t.id === trail.id ? trail : t)),
        })),
      setTrails: (next) => set(() => ({ trails: next })),

    resetAll: () => set({ ...DEFAULT_STATE }),
  })),
);

export function hardResetCreateCampaignStore() {
  useCreateCampaignStore.setState({ ...DEFAULT_STATE } as any);
}

export function clearAddInfoDraftForCampaign(campaignId: string) {
  const targetCampaignId = String(campaignId ?? "").trim();
  if (!targetCampaignId) return;

  useCreateCampaignStore.setState((s) => {
    const nextByUser = Object.fromEntries(
      Object.entries(s.addInfoDraftByUser).filter(
        ([, draft]) => draft?.campaignId !== targetCampaignId,
      ),
    );
    const currentDraft =
      s.addInfoDraft?.campaignId === targetCampaignId ? null : s.addInfoDraft;
    return {
      addInfoDraftByUser: nextByUser,
      addInfoDraft: currentDraft,
    };
  });

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(`${ADD_INFO_PERSIST_KEY_PREFIX}/`)) {
        continue;
      }

      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { campaignId?: unknown } | null;
      if (parsed?.campaignId === targetCampaignId) {
        safeLocalStorageRemoveItem(key);
      }
    }
  } catch {
    // Storage can fail in private mode; query refresh still keeps server state authoritative.
  }
}
