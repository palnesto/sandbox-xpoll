import { create } from "zustand";

type EventCardMenuStore = {
  openEventId: string | null;
  open: (eventId: string) => void;
  close: () => void;
  toggle: (eventId: string) => void;
};

export const useEventCardMenuStore = create<EventCardMenuStore>((set, get) => ({
  openEventId: null,
  open: (eventId) => set({ openEventId: eventId }),
  close: () => set({ openEventId: null }),
  toggle: (eventId) =>
    set({ openEventId: get().openEventId === eventId ? null : eventId }),
}));
