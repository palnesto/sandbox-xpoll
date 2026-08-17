import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultPollValues, type PollForm } from "@/schema/create-user-poll";

type PollStore = {
  data: PollForm;
  setPartial: (patch: Partial<PollForm>) => void;
  reset: () => void;
  hardReset: () => void;
};

const STORAGE_KEY = "add-poll-form";

export const useAddPollFormStore = create<PollStore>()(
  persist(
    (set, get) => ({
      data: defaultPollValues,

      setPartial: (patch) => {
        const next = { ...get().data, ...patch };
        set({ data: next });
      },

      reset: () => set({ data: defaultPollValues }),

      hardReset: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        set({ data: defaultPollValues });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2, // bump if you had a previous shape
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ data: state.data }),
      migrate: (persisted, _version) => persisted as any,
    }
  )
);
