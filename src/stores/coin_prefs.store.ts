import { create } from "zustand";
import { persist } from "zustand/middleware";

type CoinPrefsState = {
  selectedSymbols: string[];
  setSelected: (symbols: string[]) => void;
  toggle: (sym: string, max: number) => void;
  clear: () => void;
};

export const useCoinPrefsStore = create<CoinPrefsState>()(
  persist(
    (set, get) => ({
      selectedSymbols: [],
      setSelected: (symbols) => set({ selectedSymbols: [...symbols] }),
      toggle: (sym, max) => {
        const curr = get().selectedSymbols;
        const has = curr.includes(sym);
        if (has) {
          set({ selectedSymbols: curr.filter((s) => s !== sym) });
        } else if (curr.length < max) {
          set({ selectedSymbols: [...curr, sym] });
        }
      },
      clear: () => set({ selectedSymbols: [] }),
    }),
    { name: "coin-prefs-v1" }
  )
);
