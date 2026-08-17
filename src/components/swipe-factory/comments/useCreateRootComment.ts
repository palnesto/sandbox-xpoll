import { queryClient } from "@/api/queryClient";
import apiInstance from "@/api/queryClient";
import { useMutation, InfiniteData } from "@tanstack/react-query";
import { UIComment, CommentAuthor } from "./types";

type ServerPage = {
  ok: boolean;
  items: UIComment[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

type CreatePayload =
  | { type: "text"; text: string }
  | { type: "gif"; gifUrl: string };

type HookOpts = {
  /** called right after we optimistically insert; gives you the temp id */
  onOptimisticInsert?: (tempId: string) => void;
  /** called after server returns; gives you final and temp id */
  onServerId?: (finalId: string, tempId: string) => void;
};

export function useCreateRootComment(
  entityType: "poll" | "trial",
  entityId: string,
  currentUser: CommentAuthor,
  pageSize = 20,
  opts?: HookOpts
) {
  const rootsKey = [
    "/external/comments/roots",
    { entityType, entityId, pageSize },
  ] as const;

  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const body =
        payload.type === "text"
          ? { entityType, entityId, type: "text", text: payload.text }
          : { entityType, entityId, type: "gif", gifUrl: payload.gifUrl };

      const { data } = await apiInstance.post<{ ok: boolean; id: string }>(
        "/external/comments",
        body
      );
      return data;
    },

    // optimistic insert into first page
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: rootsKey });

      const prev = queryClient.getQueryData<InfiniteData<ServerPage>>(rootsKey);

      const tempId = `optimistic-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

      const optimistic: UIComment = {
        id: tempId,
        level: 1,
        rootId: null,
        replyToId: null,
        type: payload.type,
        text: payload.type === "text" ? payload.text : null,
        gifUrl: payload.type === "gif" ? payload.gifUrl : null,
        likeCount: 0,
        replyCount: 0,
        likedByMe: false,
        author: currentUser,
        createdAt: new Date().toISOString(),
      };

      // put new comment at top of first page
      const next: InfiniteData<ServerPage> = prev
        ? {
            pageParams: prev.pageParams,
            pages: prev.pages.map((p, idx) =>
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
                pageSize,
                hasNext: false,
              },
            ],
          };

      queryClient.setQueryData(rootsKey, next);

      // notify consumer with temp id
      opts?.onOptimisticInsert?.(tempId);

      return { prev, tempId };
    },

    // swap temp id with server id on success (no flicker)
    onSuccess: (data, _payload, ctx) => {
      if (!ctx) return;
      const { tempId } = ctx;

      queryClient.setQueryData<InfiniteData<ServerPage>>(rootsKey, (curr) => {
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

      // notify consumer with final + temp id
      opts?.onServerId?.(data.id, tempId);
    },

    // rollback on error
    onError: (_err, _payload, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(rootsKey, ctx.prev);
    },

    // softly revalidate first page; keeps optimistic item but gets server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rootsKey, exact: true });
    },
  });
}
