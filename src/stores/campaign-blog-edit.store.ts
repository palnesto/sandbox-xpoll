/**
 * Persists blog edit draft per user. When visiting a blog, we compare store's campaignId/blogId:
 * - No store or different campaign → save fetched blog and use as initial
 * - Same campaign (and same blog) → use stored draft so linked trials (name, image) show from storage
 * Key visible in Application > Local Storage: xpoll-campaign-blog-edit-{userId}
 */
import { create } from "zustand";

/** Key prefix for localStorage. Full key = xpoll-campaign-blog-edit-{userId}. Visible in Application > Local Storage. */
export const PERSIST_KEY_PREFIX = "xpoll-campaign-blog-edit";
export const BLOG_EDIT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type LinkedTrialStored = { id: string; name?: string; image?: string };

export type BlogEditDraft = {
  title?: string;
  description?: string;
  externalLinks?: string[];
  linkedTrials?: string[];
  linkedTrialsDetail?: LinkedTrialStored[];
};

export type CampaignBlogEditPayload = {
  campaignId: string;
  blogId: string;
  expireAt: number;
  draft: BlogEditDraft;
};

export function getCampaignBlogEditPersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

type CampaignBlogEditStore = {
  campaignId: string | null;
  blogId: string | null;
  expireAt: number;
  draft: BlogEditDraft | null;
  setDraft: (payload: CampaignBlogEditPayload | null) => void;
  getDraft: () => CampaignBlogEditPayload | null;
  setPatch: (userId: string, patch: Partial<BlogEditDraft>) => void;
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

export const useCampaignBlogEditStore = create<CampaignBlogEditStore>()((set, get) => ({
  campaignId: null,
  blogId: null,
  expireAt: 0,
  draft: null,

  setDraft: (payload) =>
    set({
      campaignId: payload?.campaignId ?? null,
      blogId: payload?.blogId ?? null,
      expireAt: payload?.expireAt ?? 0,
      draft: payload?.draft ?? null,
    }),

  getDraft: () => {
    const s = get();
    if (!s.draft) return null;
    return {
      campaignId: s.campaignId!,
      blogId: s.blogId!,
      expireAt: s.expireAt,
      draft: s.draft,
    };
  },

  setPatch: (userId, patch) => {
    const key = getCampaignBlogEditPersistKey(userId);
    const current = get();
    const expireAt = Date.now() + BLOG_EDIT_TTL_MS;
    const merged: BlogEditDraft = {
      ...(current.draft ?? {}),
      ...patch,
    };
    const payload: CampaignBlogEditPayload = {
      campaignId: current.campaignId ?? "",
      blogId: current.blogId ?? "",
      expireAt,
      draft: merged,
    };
    set({ campaignId: payload.campaignId, blogId: payload.blogId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload));
  },

  clear: (userId) => {
    const key = getCampaignBlogEditPersistKey(userId);
    safeRemove(key);
    set({ campaignId: null, blogId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getCampaignBlogEditPersistKey(userId);
    const raw = safeGet(key);
    if (!raw) {
      set({ campaignId: null, blogId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CampaignBlogEditPayload | null;
      if (
        !parsed ||
        typeof parsed.campaignId !== "string" ||
        typeof parsed.blogId !== "string" ||
        typeof parsed.expireAt !== "number" ||
        !parsed.draft
      ) {
        set({ campaignId: null, blogId: null, expireAt: 0, draft: null });
        return;
      }
      if (Date.now() > parsed.expireAt) {
        safeRemove(key);
        set({ campaignId: null, blogId: null, expireAt: 0, draft: null });
        return;
      }
      set({
        campaignId: parsed.campaignId,
        blogId: parsed.blogId,
        expireAt: parsed.expireAt,
        draft: parsed.draft,
      });
    } catch {
      set({ campaignId: null, blogId: null, expireAt: 0, draft: null });
    }
  },
}));
