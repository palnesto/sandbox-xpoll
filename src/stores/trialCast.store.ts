import { create } from "zustand";

type TrialCastState = {
  trialId: string | null;
  votes: Record<string, string>; // pollId -> optionId

  setTrial: (id: string) => void;
  setVote: (pollId: string, optionId: string) => void;
  clearVotes: () => void;
};

export const useTrialCastStore = create<TrialCastState>((set) => ({
  trialId: null,
  votes: {},

  setTrial: (id) =>
    set((s) => (s.trialId === id ? s : { trialId: id, votes: {} })),

  setVote: (pollId, optionId) =>
    set((s) => ({ votes: { ...s.votes, [pollId]: optionId } })),

  clearVotes: () => set({ votes: {} }),
}));
