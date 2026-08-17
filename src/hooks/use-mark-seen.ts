import { useMutation } from "@tanstack/react-query";
import api from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { useEffect, useRef } from "react";

type MarkSeenResult = {
  pollId: string;
  status: "seen-set" | "already-seen" | "soft-error";
  message?: string;
};

export function usePollMarkSeen() {
  return useMutation({
    mutationFn: async (pollId: string): Promise<MarkSeenResult> => {
      const { data } = await api.post(endpoints.poll.pollMarkSeen, { pollId });
      // ApiResponse shape: { statusCode, data }
      return (data?.data ?? data) as MarkSeenResult;
    },
  });
}

export function useTrialMarkSeen() {
  return useMutation({
    mutationFn: async (trialId: string) => {
      const { data } = await api.post(endpoints.trial.trialMarkSeen, {
        trialId,
      });
      return data?.data ?? data;
    },
  });
}

export function useCampaignMarkSeen() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await api.post(endpoints.campaigns.campaignMarkSeen, {
        campaignId,
      });
      return data?.data ?? data;
    },
  });
}

export function useInkDBlogMarkSeen() {
  return useMutation({
    mutationFn: async (inkdBlogId: string) => {
      const { data } = await api.post(endpoints.inkd.markSeen(inkdBlogId));
      return data?.data ?? data;
    },
  });
}

// mark seen once utility

type UseMarkSeenFn = () => {
  mutate: (id: string, opts?: { onError?: () => void }) => void;
};

export function useMarkEntitySeenOnce(
  entityId: string | null | undefined,
  seenAt: string | null | undefined,
  useMarkSeen: UseMarkSeenFn
) {
  const mutation = useMarkSeen();

  const stateRef = useRef<{ lastId: string | null; seen: boolean }>({
    lastId: null,
    seen: false,
  });

  useEffect(() => {
    if (!entityId) return;

    // If id changed, reset local state
    if (stateRef.current.lastId !== entityId) {
      stateRef.current.lastId = entityId;
      stateRef.current.seen = false;
    }

    // If server already says it is seen, just mark as seen locally
    if (seenAt) {
      stateRef.current.seen = true;
      return;
    }

    // If we already fired the mutation for this id, stop
    if (stateRef.current.seen) return;

    // Fire mutation once
    stateRef.current.seen = true;

    mutation.mutate(entityId, {
      onError: () => {
        // Only reset if we are still looking at the same id
        if (stateRef.current.lastId === entityId) {
          stateRef.current.seen = false;
        }
      },
    });
  }, [entityId, seenAt, mutation]);
}
