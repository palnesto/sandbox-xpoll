import { useInfiniteQuery } from "@tanstack/react-query";
import apiInstance from "@/api/queryClient";
import { UIComment } from "./types";

type ServerComment = {
  id: string;
  entityType: "poll" | "trial";
  entityId: string;
  level: 1 | 2;
  rootId: string | null;
  replyToId: string | null;
  type: "text" | "gif";
  text: string | null;
  gifUrl: string | null;
  likeCount: number;
  replyCount: number;
  authorId: string; // <-- server field
  createdAt: string;
  likedByMe?: boolean; // if server adds it later; fallback below
  authorUsername?: string; // if you add later; fallback below
  authorAvatarUrl?: string | null; // if you add later; fallback below
};

type ServerPage = {
  ok: boolean;
  items: ServerComment[];
  page: number;
  pageSize: number;
  hasNext: boolean;
};

function mapToUI(c: ServerComment): UIComment {
  return {
    id: c.id,
    level: c.level,
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
      username: c.authorUsername ?? c.authorId, // prefer username
      avatarUrl: c.authorAvatarUrl ?? null,
    },
    createdAt: c.createdAt,
  };
}

export function useRootCommentsInfinite(
  entityType: "poll" | "trial",
  entityId: string,
  pageSize = 20
) {
  return useInfiniteQuery<{
    ok: boolean;
    items: UIComment[];
    page: number;
    pageSize: number;
    hasNext: boolean;
  }>({
    queryKey: ["/external/comments/roots", { entityType, entityId, pageSize }],
    queryFn: async ({ pageParam = 1, signal }) => {
      const { data } = await apiInstance.get<ServerPage>(
        "/external/comments/roots",
        { params: { entityType, entityId, page: pageParam, pageSize }, signal }
      );
      return { ...data, items: data.items.map(mapToUI) };
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
