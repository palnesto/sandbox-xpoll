import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
import { endpoints } from "@/api/endpoints";

export type PollDTO = {
  _id: string;
  title: string;
  description: string;
  options: { _id: string; label: string; value: string }[];
  seenAt: string | null;
};

export function usePollsInfinite(
  filters?: Record<string, unknown>,
  pageSize = 20
) {
  return useApiInfiniteQuery<PollDTO>(
    endpoints.poll.getPolls,
    filters,
    pageSize,
    {
      // helpful if user returns after short time
      staleTime: 30_000,
    }
  );
}
