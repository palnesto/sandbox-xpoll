import { queryClient } from "@/api/queryClient";
import apiInstance from "@/api/queryClient";
import { useMutation, InfiniteData } from "@tanstack/react-query";
import { UIComment } from "./types";

type PageShape = {
  ok: boolean;
  items: UIComment[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

type ToggleInput = {
  commentId: string;
  nextLiked: boolean;
  // If the comment lives inside a replies list, pass its rootId to also update that cache.
  rootId?: string | null;
};

export function useLikeUnlikeComment(
  entityType: "poll" | "trial",
  entityId: string,
  rootsPageSize = 20,
  repliesPageSize = 20
) {
  const rootsKey = [
    "/external/comments/roots",
    { entityType, entityId, pageSize: rootsPageSize },
  ] as const;

  // track the user's LAST intent per comment; prevents stale updates overriding UI
  const latestOp = new Map<string, "like" | "unlike">();

  const applyOptimistic = (
    data: InfiniteData<PageShape> | undefined,
    commentId: string,
    nextLiked: boolean
  ) => {
    if (!data) return data;
    const delta = nextLiked ? 1 : -1;
    return {
      pageParams: data.pageParams,
      pages: data.pages.map((p) => ({
        ...p,
        items: p.items.map((it) =>
          it.id === commentId
            ? {
                ...it,
                likedByMe: nextLiked,
                likeCount: Math.max(0, (it.likeCount ?? 0) + delta),
              }
            : it
        ),
      })),
    };
  };

  return useMutation({
    mutationFn: async ({ commentId, nextLiked }: ToggleInput) => {
      const op = nextLiked ? "like" : "unlike";
      const { data } = await apiInstance.post<{ ok: boolean }>(
        `/external/comments/${commentId}/like`,
        { op }
      );
      return data;
    },

    onMutate: async (vars) => {
      const { commentId, nextLiked, rootId } = vars;
      const op: "like" | "unlike" = nextLiked ? "like" : "unlike";
      latestOp.set(commentId, op);

      // cancel roots + replies(rootId) queries to avoid races
      await Promise.all([
        queryClient.cancelQueries({ queryKey: rootsKey }),
        rootId
          ? queryClient.cancelQueries({
              queryKey: [
                "/external/comments/:rootId/replies",
                { rootId, pageSize: repliesPageSize },
              ],
            })
          : Promise.resolve(),
      ]);

      const prevRoots =
        queryClient.getQueryData<InfiniteData<PageShape>>(rootsKey);
      const prevReplies = rootId
        ? queryClient.getQueryData<InfiniteData<PageShape>>([
            "/external/comments/:rootId/replies",
            { rootId, pageSize: repliesPageSize },
          ])
        : undefined;

      // apply optimistic to roots
      queryClient.setQueryData<InfiniteData<PageShape>>(rootsKey, (curr) =>
        applyOptimistic(curr, commentId, nextLiked)
      );

      // apply optimistic to replies (if we know which root list it's in)
      if (rootId) {
        const repliesKey = [
          "/external/comments/:rootId/replies",
          { rootId, pageSize: repliesPageSize },
        ] as const;
        queryClient.setQueryData<InfiniteData<PageShape>>(repliesKey, (curr) =>
          applyOptimistic(curr, commentId, nextLiked)
        );
      }

      return { prevRoots, prevReplies, commentId, op, rootId };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      const { prevRoots, prevReplies, rootId } = ctx;

      if (prevRoots) {
        queryClient.setQueryData(rootsKey, prevRoots);
      }
      if (rootId && prevReplies) {
        const repliesKey = [
          "/external/comments/:rootId/replies",
          { rootId, pageSize: repliesPageSize },
        ] as const;
        queryClient.setQueryData(repliesKey, prevReplies);
      }
    },

    // Never let an older request override the user's latest intent.
    onSettled: (_res, _err, _vars, ctx) => {
      if (!ctx) return;
      const { commentId, op, rootId } = ctx;

      // only revalidate if this mutation's op is STILL the latest we know
      if (latestOp.get(commentId) === op) {
        queryClient.invalidateQueries({ queryKey: rootsKey, exact: true });
        if (rootId) {
          queryClient.invalidateQueries({
            queryKey: [
              "/external/comments/:rootId/replies",
              { rootId, pageSize: repliesPageSize },
            ],
            exact: true,
          });
        }
      }
    },
  });
}
