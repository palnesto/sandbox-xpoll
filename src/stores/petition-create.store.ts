import { create } from "zustand";
import type { PetitionCreateValues } from "@/schema/petition.schemas";

export const PETITION_CREATE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const PERSIST_KEY_PREFIX = "xpoll-campaign-petition-create";

export function getPetitionCreatePersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

export type PetitionCreateDraftPayload = {
  campaignId: string;
  expireAt: number;
  draft: Partial<PetitionCreateValues> | PetitionCreateValues;
};

type PetitionCreateStore = {
  campaignId: string | null;
  expireAt: number;
  draft: Partial<PetitionCreateValues> | PetitionCreateValues | null;
  setDraft: (payload: PetitionCreateDraftPayload | null) => void;
  getDraft: () => PetitionCreateDraftPayload | null;
  setPatch: (userId: string, patch: Partial<PetitionCreateValues>) => void;
  resetForCampaign: (
    userId: string,
    campaignId: string,
    defaults: Partial<PetitionCreateValues> | PetitionCreateValues,
  ) => void;
  clear: (userId: string) => void;
  isExpired: () => boolean;
  loadFromLocalStorage: (userId: string) => void;
};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export const usePetitionCreateStore = create<PetitionCreateStore>()((set, get) => ({
  campaignId: null,
  expireAt: 0,
  draft: null,

  setDraft: (payload) =>
    set({
      campaignId: payload?.campaignId ?? null,
      expireAt: payload?.expireAt ?? 0,
      draft: payload?.draft ?? null,
    }),

  getDraft: () => {
    const s = get();
    if (!s.draft) return null;
    return {
      campaignId: s.campaignId!,
      expireAt: s.expireAt,
      draft: s.draft,
    };
  },

  setPatch: (userId, patch) => {
    const key = getPetitionCreatePersistKey(userId);
    const current = get();
    const expireAt = Date.now() + PETITION_CREATE_TTL_MS;
    const merged = {
      ...(current.draft ?? {}),
      ...patch,
    } as Partial<PetitionCreateValues> & PetitionCreateValues;
    const payload: PetitionCreateDraftPayload = {
      campaignId: current.campaignId ?? "",
      expireAt,
      draft: merged,
    };
    set({ campaignId: payload.campaignId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload));
  },

  resetForCampaign: (userId, campaignId, defaults) => {
    const key = getPetitionCreatePersistKey(userId);
    const expireAt = Date.now() + PETITION_CREATE_TTL_MS;
    const payload: PetitionCreateDraftPayload = {
      campaignId,
      expireAt,
      draft: defaults,
    };
    set({ campaignId, expireAt, draft: defaults });
    safeSet(key, JSON.stringify(payload));
  },

  clear: (userId) => {
    const key = getPetitionCreatePersistKey(userId);
    safeRemove(key);
    set({ campaignId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getPetitionCreatePersistKey(userId);
    const raw = safeGet(key);
    if (!raw) {
      set({ campaignId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PetitionCreateDraftPayload | null;
      if (
        !parsed ||
        typeof parsed.campaignId !== "string" ||
        typeof parsed.expireAt !== "number" ||
        !parsed.draft
      ) {
        set({ campaignId: null, expireAt: 0, draft: null });
        return;
      }
      if (Date.now() > parsed.expireAt) {
        safeRemove(key);
        set({ campaignId: null, expireAt: 0, draft: null });
        return;
      }
      set({
        campaignId: parsed.campaignId,
        expireAt: parsed.expireAt,
        draft: parsed.draft,
      });
    } catch {
      set({ campaignId: null, expireAt: 0, draft: null });
    }
  },
}));
