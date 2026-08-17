import { create } from "zustand";
import type { EventEditFormValues } from "@/schema/event.schemas";

export const EVENT_EDIT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PERSIST_KEY_PREFIX = "xpoll-campaign-event-edit";

export function getEventEditPersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

export type EventEditDraftPayload = {
  eventId: string;
  expireAt: number;
  draft: Partial<EventEditFormValues> | EventEditFormValues;
};

type EventEditStore = {
  eventId: string | null;
  expireAt: number;
  draft: Partial<EventEditFormValues> | EventEditFormValues | null;

  setDraft: (payload: EventEditDraftPayload | null) => void;
  getDraft: () => EventEditDraftPayload | null;
  setPatch: (userId: string, patch: Partial<EventEditFormValues>) => void;
  resetForEvent: (
    userId: string,
    eventId: string,
    defaults: Partial<EventEditFormValues> | EventEditFormValues,
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

export const useEventEditStore = create<EventEditStore>()((set, get) => ({
  eventId: null,
  expireAt: 0,
  draft: null,

  setDraft: (payload) =>
    set({
      eventId: payload?.eventId ?? null,
      expireAt: payload?.expireAt ?? 0,
      draft: payload?.draft ?? null,
    }),

  getDraft: () => {
    const s = get();
    if (!s.draft) return null;
    return {
      eventId: s.eventId!,
      expireAt: s.expireAt,
      draft: s.draft,
    };
  },

  setPatch: (userId, patch) => {
    const key = getEventEditPersistKey(userId);
    const current = get();
    const expireAt = Date.now() + EVENT_EDIT_TTL_MS;
    const merged = {
      ...(current.draft ?? {}),
      ...patch,
    } as Partial<EventEditFormValues>;
    const payload: EventEditDraftPayload = {
      eventId: current.eventId ?? "",
      expireAt,
      draft: merged,
    };
    set({ eventId: payload.eventId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload));
  },

  resetForEvent: (userId, eventId, defaults) => {
    const key = getEventEditPersistKey(userId);
    const expireAt = Date.now() + EVENT_EDIT_TTL_MS;
    const payload: EventEditDraftPayload = {
      eventId,
      expireAt,
      draft: defaults,
    };
    set({ eventId, expireAt, draft: defaults });
    safeSet(key, JSON.stringify(payload));
  },

  clear: (userId) => {
    const key = getEventEditPersistKey(userId);
    safeRemove(key);
    set({ eventId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getEventEditPersistKey(userId);
    const raw = safeGet(key);
    if (!raw) {
      set({ eventId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as EventEditDraftPayload | null;
      if (
        !parsed ||
        typeof parsed.eventId !== "string" ||
        typeof parsed.expireAt !== "number" ||
        !parsed.draft
      ) {
        set({ eventId: null, expireAt: 0, draft: null });
        return;
      }
      if (Date.now() > parsed.expireAt) {
        safeRemove(key);
        set({ eventId: null, expireAt: 0, draft: null });
        return;
      }
      set({
        eventId: parsed.eventId,
        expireAt: parsed.expireAt,
        draft: parsed.draft,
      });
    } catch {
      set({ eventId: null, expireAt: 0, draft: null });
    }
  },
}));
