import { useInfiniteQuery } from "@tanstack/react-query";
import apiInstance from "@/api/queryClient";
import { UIComment } from "./types";

type ServerReply = {
  id: string;
  level: 2;
  rootId: string;
  replyToId: string | null;
  type: "text" | "gif";
  text: string | null;
  gifUrl: string | null;
  likeCount: number;
  replyCount: number;
  authorId: string;
  createdAt: string;
  likedByMe?: boolean;
  authorUsername?: string | null;
  replyToUsername?: string | null;
  rootAuthorUsername?: string | null;
  authorAvatarUrl?: string | null;
};

type RepliesPage = {
  ok: boolean;
  items: ServerReply[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

function mapToUI(c: ServerReply): UIComment {
  return {
    id: c.id,
    level: 2,
    rootId: c.rootId,
    replyToId: c.replyToId,
    type: c.type,
    text: c.text,
    gifUrl: c.gifUrl,
    likeCount: c.likeCount ?? 0,
    replyCount: c.replyCount ?? 0,
    likedByMe: c.likedByMe ?? false,
    author: {
      id: c.authorId,
      username: c.authorUsername ?? c.authorId,
      avatarUrl: c.authorAvatarUrl ?? null,
    },
    replyToUsername: c.replyToUsername ?? null,
    rootAuthorUsername: c.rootAuthorUsername ?? null,
    createdAt: c.createdAt,
  };
}

export function useRepliesInfinite(rootId: string, pageSize = 20) {
  return useInfiniteQuery<{
    ok: boolean;
    items: UIComment[];
    page: number;
    pageSize: number;
    hasNext: boolean;
  }>({
    queryKey: ["/external/comments/:rootId/replies", { rootId, pageSize }],
    queryFn: async ({ pageParam = 1, signal }) => {
      const { data } = await apiInstance.get<RepliesPage>(
        `/external/comments/${rootId}/replies`,
        { params: { page: pageParam, pageSize }, signal }
      );
      return { ...data, items: data.items.map(mapToUI) };
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: !!rootId,
  });
}
