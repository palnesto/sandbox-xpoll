import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";

type Vars = { pollId: string; optionId: string };

export function useVotePoll(filters?: Record<string, unknown>) {
  const qc = useQueryClient();
  const queryKey = [endpoints.poll.getPolls, filters] as const;

  return useMutation({
    mutationFn: async ({ pollId, optionId }: Vars) => {
      const { data } = await api.post(endpoints.poll.pollCast, {
        pollId,
        optionId,
      });
      return data;
    },
    onMutate: async ({ pollId, optionId }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<any>(queryKey);

      const next = prev && {
        ...prev,
        pages: prev.pages.map((pg: any) => ({
          ...pg,
          entries: pg.entries.map((e: any) => {
            if (e._id !== pollId) return e;

            if (e?.myVote?.optionId) return e; // already voted

            const counts = new Map<string, number>();
            const stats = e.details?.optionStats ?? [];
            for (const s of stats)
              counts.set(String(s._id), Number(s.numVotes) || 0);
            for (const o of e.options)
              if (!counts.has(o._id)) counts.set(o._id, 0);

            counts.set(optionId, (counts.get(optionId) || 0) + 1);

            const optionStats = e.options.map((o: any) => ({
              _id: o._id,
              numVotes: counts.get(o._id) || 0,
              archivedAt: null,
            }));

            return {
              ...e,
              myVote: { optionId },
              details: { ...(e.details ?? {}), optionStats },
            };
          }),
        })),
      };

      qc.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSuccess: () => {
      // optimistic state already shows the vote
    },
  });
}
