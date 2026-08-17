import { create } from "zustand";
import type { EventCreateFormValues } from "@/schema/event.schemas";

export const EVENT_CREATE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PERSIST_KEY_PREFIX = "xpoll-campaign-event-create";

export function getEventCreatePersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

export type EventCreateDraftPayload = {
  campaignId: string;
  expireAt: number;
  draft: Partial<EventCreateFormValues>;
};

type EventCreateStore = {
  campaignId: string | null;
  expireAt: number;
  draft: Partial<EventCreateFormValues> | null;

  setPatch: (
    userId: string,
    campaignId: string,
    patch: Partial<EventCreateFormValues>,
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

export const useEventCreateStore = create<EventCreateStore>()((set, get) => ({
  campaignId: null,
  expireAt: 0,
  draft: null,

  setPatch: (userId, campaignId, patch) => {
    const key = getEventCreatePersistKey(userId);
    const current = get();
    const expireAt = Date.now() + EVENT_CREATE_TTL_MS;
    const merged = {
      ...(current.campaignId === campaignId ? current.draft ?? {} : {}),
      ...patch,
    };
    const payload: EventCreateDraftPayload = {
      campaignId,
      expireAt,
      draft: merged,
    };
    set({ campaignId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload));
  },

  clear: (userId) => {
    const key = getEventCreatePersistKey(userId);
    safeRemove(key);
    set({ campaignId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getEventCreatePersistKey(userId);
    const raw = safeGet(key);
    if (!raw) {
      set({ campaignId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as EventCreateDraftPayload | null;
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
