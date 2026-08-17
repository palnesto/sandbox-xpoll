import { create } from "zustand";
import type { PetitionForm } from "@/types/petition";
 
export const PETITION_EDIT_TTL_MS = 30 * 60 * 1000;
const PERSIST_KEY_PREFIX = "xpoll-campaign-petition-edit";

export function getPetitionEditPersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

export type PetitionEditDraftPayload = {
  petitionId: string;
  expireAt: number;
  draft: Partial<PetitionForm> | PetitionForm;
};

type PetitionEditStore = {
  petitionId: string | null;
  expireAt: number;
  draft: Partial<PetitionForm> | PetitionForm | null;
  setDraft: (payload: PetitionEditDraftPayload | null) => void;
  getDraft: () => PetitionEditDraftPayload | null;
  setPatch: (userId: string, patch: Partial<PetitionForm>) => void;
  resetForPetition: (
    userId: string,
    petitionId: string,
    defaults: Partial<PetitionForm> | PetitionForm,
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

export const usePetitionEditStore = create<PetitionEditStore>()((set, get) => ({
  petitionId: null,
  expireAt: 0,
  draft: null,

  setDraft: (payload) =>
    set({
      petitionId: payload?.petitionId ?? null,
      expireAt: payload?.expireAt ?? 0,
      draft: payload?.draft ?? null,
    }),

  getDraft: () => {
    const s = get();
    if (!s.draft) return null;
    return {
      petitionId: s.petitionId!,
      expireAt: s.expireAt,
      draft: s.draft,
    };
  },

  setPatch: (userId, patch) => {
    const key = getPetitionEditPersistKey(userId);
    const current = get();
    const expireAt = Date.now() + PETITION_EDIT_TTL_MS;
    const merged = {
      ...(current.draft ?? {}),
      ...patch,
    } as Partial<PetitionForm> & PetitionForm;
    const payload: PetitionEditDraftPayload = {
      petitionId: current.petitionId ?? "",
      expireAt,
      draft: merged,
    };
    set({ petitionId: payload.petitionId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload));
  },

  resetForPetition: (userId, petitionId, defaults) => {
    const key = getPetitionEditPersistKey(userId);
    const expireAt = Date.now() + PETITION_EDIT_TTL_MS;
    const payload: PetitionEditDraftPayload = {
      petitionId,
      expireAt,
      draft: defaults,
    };
    set({ petitionId, expireAt, draft: defaults });
    safeSet(key, JSON.stringify(payload));
  },

  clear: (userId) => {
    const key = getPetitionEditPersistKey(userId);
    safeRemove(key);
    set({ petitionId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getPetitionEditPersistKey(userId);
    const raw = safeGet(key);
    if (!raw) {
      set({ petitionId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PetitionEditDraftPayload | null;
      if (
        !parsed ||
        typeof parsed.petitionId !== "string" ||
        typeof parsed.expireAt !== "number" ||
        !parsed.draft
      ) {
        set({ petitionId: null, expireAt: 0, draft: null });
        return;
      }
      if (Date.now() > parsed.expireAt) {
        safeRemove(key);
        set({ petitionId: null, expireAt: 0, draft: null });
        return;
      }
      set({
        petitionId: parsed.petitionId,
        expireAt: parsed.expireAt,
        draft: parsed.draft,
      });
    } catch {
      set({ petitionId: null, expireAt: 0, draft: null });
    }
  },
}));
