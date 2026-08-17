import { create } from "zustand";
import type { BlogCreateValues } from "@/schema/blog.schemas";

/** TTL for draft; when reading, if Date.now() > expireAt we reset store and use defaults. */
export const BLOG_CREATE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Key prefix for localStorage. Full key = xpoll-campaign-blog-create-{userId}. Visible in Application > Local Storage. */
export const PERSIST_KEY_PREFIX = "xpoll-campaign-blog-create";

export function getCampaignBlogCreatePersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

/** Stored in draft for display (name, image) when loading from persistence */
export type LinkedTrialStored = { id: string; name?: string; image?: string };

export type BlogCreateDraft = Partial<BlogCreateValues> & {
  linkedTrialsDetail?: LinkedTrialStored[];
};

export type CampaignBlogCreateDraftPayload = {
  campaignId: string;
  expireAt: number;
  draft: BlogCreateDraft;
};

type CampaignBlogCreateStore = {
  campaignId: string | null;
  expireAt: number;
  draft: BlogCreateDraft | null;
  setDraft: (payload: CampaignBlogCreateDraftPayload | null) => void;
  getDraft: () => CampaignBlogCreateDraftPayload | null;
  setPatch: (userId: string, patch: Partial<BlogCreateValues> & { linkedTrialsDetail?: LinkedTrialStored[] }) => void;
  resetForCampaign: (
    userId: string,
    campaignId: string,
    defaults: BlogCreateDraft,
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

export const useCampaignBlogCreateStore = create<CampaignBlogCreateStore>()((set, get) => ({
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
    const key = getCampaignBlogCreatePersistKey(userId);
    const current = get();
    const expireAt = Date.now() + BLOG_CREATE_TTL_MS;
    const merged: BlogCreateDraft = {
      ...(current.draft ?? {}),
      ...patch,
      ...(patch.linkedTrialsDetail !== undefined ? { linkedTrialsDetail: patch.linkedTrialsDetail } : {}),
    };
    const payload: CampaignBlogCreateDraftPayload = {
      campaignId: current.campaignId ?? "",
      expireAt,
      draft: merged,
    };
    set({ campaignId: payload.campaignId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload)); // Writes to Application > Local Storage
  },

  resetForCampaign: (userId, campaignId, defaults) => {
    const key = getCampaignBlogCreatePersistKey(userId);
    const expireAt = Date.now() + BLOG_CREATE_TTL_MS;
    const payload: CampaignBlogCreateDraftPayload = {
      campaignId,
      expireAt,
      draft: defaults,
    };
    set({ campaignId, expireAt, draft: defaults });
    safeSet(key, JSON.stringify(payload)); // Ensures key appears in Application > Local Storage
  },

  clear: (userId) => {
    const key = getCampaignBlogCreatePersistKey(userId);
    safeRemove(key); // Remove from Application > Local Storage on submit success
    set({ campaignId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getCampaignBlogCreatePersistKey(userId);
    const raw = safeGet(key); // Read from Application > Local Storage
    if (!raw) {
      set({ campaignId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CampaignBlogCreateDraftPayload | null;
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
