import { queryClient } from "@/api/queryClient";
import apiInstance from "@/api/queryClient";
import { useMutation, InfiniteData } from "@tanstack/react-query";
import { UIComment, CommentAuthor } from "./types";

type Page = {
  ok: boolean;
  items: UIComment[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

type CreateReplyBody =
  | { type: "text"; text: string }
  | { type: "gif"; gifUrl: string };

type CreateReplyVars = {
  /** Comment id you’re replying to (root or reply) – API target */
  targetCommentId: string;
  /** Root id to optimistically insert into the correct replies thread */
  rootId: string;
  /** for optimistic author */
  currentUser: CommentAuthor;
  /** payload */
  item: CreateReplyBody;
  /** replies page size (keying) */
  repliesPageSize: number;
  /** roots key context (for bumping replyCount visually) */
  rootsKey: readonly [
    string,
    { entityType: "poll" | "trial"; entityId: string; pageSize: number }
  ];
};

type HookOpts = {
  /** called after we optimistically add; gives tempId + rootId */
  onOptimisticInsert?: (tempId: string, rootId: string) => void;
  /** called when server id arrives; gives finalId + tempId + rootId */
  onServerId?: (finalId: string, tempId: string, rootId: string) => void;
};

export function useCreateReplyComment(opts?: HookOpts) {
  return useMutation({
    mutationFn: async ({ targetCommentId, item }: CreateReplyVars) => {
      const { data } = await apiInstance.post<{ ok: boolean; id: string }>(
        `/external/comments/${targetCommentId}/replies`,
        item
      );
      return data;
    },

    onMutate: async ({
      rootId,
      currentUser,
      item,
      repliesPageSize,
      rootsKey,
    }) => {
      const repliesKey = [
        "/external/comments/:rootId/replies",
        { rootId, pageSize: repliesPageSize },
      ] as const;

      // cancel to avoid races
      await Promise.all([
        queryClient.cancelQueries({ queryKey: repliesKey }),
        queryClient.cancelQueries({ queryKey: rootsKey }),
      ]);

      const prevReplies =
        queryClient.getQueryData<InfiniteData<Page>>(repliesKey);
      const prevRoots = queryClient.getQueryData<InfiniteData<Page>>(rootsKey);

      // optimistic reply
      const tempId = `optimistic-reply-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
      const optimistic: UIComment = {
        id: tempId,
        level: 2,
        rootId,
        replyToId: null, // UI doesn’t need it for rendering; backend derives real value anyway
        type: item.type,
        text: item.type === "text" ? item.text : null,
        gifUrl: item.type === "gif" ? item.gifUrl : null,
        likeCount: 0,
        replyCount: 0,
        likedByMe: false,
        author: currentUser,
        createdAt: new Date().toISOString(),
      };

      // put at the top of page 1 (newest-first)
      const nextReplies: InfiniteData<Page> | undefined = prevReplies
        ? {
            pageParams: prevReplies.pageParams,
            pages: prevReplies.pages.map((p, idx) =>
              idx === 0 ? { ...p, items: [optimistic, ...p.items] } : p
            ),
          }
        : {
            pageParams: [1],
            pages: [
              {
                ok: true,
                items: [optimistic],
                page: 1,
                pageSize: repliesPageSize,
                hasNext: false,
              },
            ],
          };

      queryClient.setQueryData(repliesKey, nextReplies);

      // bump replyCount on the root (so the “View more replies (N)” and total stay correct)
      if (prevRoots) {
        const bumped: InfiniteData<Page> = {
          pageParams: prevRoots.pageParams,
          pages: prevRoots.pages.map((p) => ({
            ...p,
            items: p.items.map((it) =>
              it.id === rootId
                ? { ...it, replyCount: (it.replyCount ?? 0) + 1 }
                : it
            ),
          })),
        };
        queryClient.setQueryData(rootsKey, bumped);
      }

      // notify consumer about the optimistic item
      opts?.onOptimisticInsert?.(tempId, rootId);

      return { prevReplies, prevRoots, repliesKey, rootsKey, tempId, rootId };
    },

    onSuccess: (data, _vars, ctx) => {
      if (!ctx) return;
      const { repliesKey, tempId, rootId } = ctx;

      // swap optimistic id with real id
      queryClient.setQueryData<InfiniteData<Page>>(repliesKey, (curr) => {
        if (!curr) return curr;
        return {
          pageParams: curr.pageParams,
          pages: curr.pages.map((p, idx) =>
            idx === 0
              ? {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === tempId ? { ...it, id: data.id } : it
                  ),
                }
              : p
          ),
        };
      });

      // notify consumer with final id too
      opts?.onServerId?.(data.id, tempId, rootId);
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      const { prevReplies, prevRoots, repliesKey, rootsKey } = ctx;
      if (prevReplies) queryClient.setQueryData(repliesKey, prevReplies);
      if (prevRoots) queryClient.setQueryData(rootsKey, prevRoots);
    },

    onSettled: (_res, _err, vars, ctx) => {
      if (!ctx) return;
      const { repliesKey, rootsKey } = ctx;
      // softly refetch to confirm counts & authoritative data
      queryClient.invalidateQueries({ queryKey: repliesKey, exact: true });
      queryClient.invalidateQueries({ queryKey: rootsKey, exact: true });
    },
  });
}
