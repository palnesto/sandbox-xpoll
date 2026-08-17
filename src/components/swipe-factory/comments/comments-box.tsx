import * as React from "react";
import { cn } from "@/lib/utils";
import { CommentInput, NewCommentPayload } from "./comment-input";
import { CommentItem } from "./comment-item";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useRootCommentsInfinite } from "./useRootComments";
import { RepliesThread } from "./replies-thread";
import { CommentAuthor, UIComment } from "./types";
import { useCreateRootComment } from "./useCreateRootComment";
import { useLikeUnlikeComment } from "./useLikeUnlikeComment";
import { useCreateReplyComment } from "./useCreateReplyComment";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";

/**
 * Fetches root comments for an entity (infinite scroll) and lazily mounts a per-root
 * RepliesThread that handles its own infinite pagination. Replies are newest-first,
 * with a top "View more replies (N)" to load older pages.
 */
export type CommentsBoxProps = {
  entityType: "poll" | "trial";
  entityId: string;
  heightClass?: string;
  pageSize?: number; // roots page size
  repliesPageSize?: number; // replies page size
  /** If provided, used for optimistic items. Otherwise we try /external/auth/me when showOptimisticUser=true */
  currentUser?: CommentAuthor;
  /** Auto-fetch /external/auth/me and use it for optimistic author */
  showOptimisticUser?: boolean;

  onSubmitRoot?: (payload: NewCommentPayload) => void | Promise<void>;
  onSubmitReply?: (
    rootId: string,
    payload: NewCommentPayload & { replyToId?: string | null },
  ) => void | Promise<void>;

  // (optional) legacy external toggle handler — will be called after our own optimistic update
  onToggleLike?: (
    commentId: string,
    nextLiked: boolean,
  ) => void | Promise<void>;

  className?: string;
};

type ReplyTarget = {
  rootId: string;
  replyToId?: string | null;
  username?: string;
} | null;

export const CommentsBox: React.FC<CommentsBoxProps> = ({
  entityType,
  entityId,
  heightClass = "h-96",
  pageSize = 20,
  repliesPageSize = 20,
  currentUser,
  showOptimisticUser = false,
  onSubmitRoot,
  onSubmitReply,
  onToggleLike,
  className,
}) => {
  const { data: meResp } = useApiQuery(endpoints.profile.me);
  const meData = React.useMemo(() => meResp?.data?.data, [meResp]);

  const meAuthor: CommentAuthor | null = React.useMemo(() => {
    if (!showOptimisticUser || currentUser) return null;
    if (!meData) return null;
    const id: string = meData.id;
    const username: string =
      meData?.profile?.apps?.xpoll?.username ??
      (id ? `user-${String(id).slice(-4)}` : "user");
    // avatar can be populated object OR null; prefer imageUrl if present
    const avatarObj = meData?.profile?.apps?.xpoll?.avatar;
    const avatarUrl: string | null =
      avatarObj && typeof avatarObj === "object" && "imageUrl" in avatarObj
        ? (avatarObj.imageUrl as string)
        : null;
    return { id, username, avatarUrl };
  }, [showOptimisticUser, currentUser, meData]);

  // Final optimistic author used by create mutations
  const optimisticAuthor: CommentAuthor = currentUser ??
    meAuthor ?? { id: "pending", username: "You", avatarUrl: null };

  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget>(null);
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const highlightTimerRef = React.useRef<number | null>(null);

  const clearHighlightLater = React.useCallback(() => {
    if (highlightTimerRef.current)
      window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedId(null);
      highlightTimerRef.current = null;
    }, 1000);
  }, []);

  const flash = React.useCallback(
    (id: string) => {
      setHighlightedId(id);
      clearHighlightLater();
    },
    [clearHighlightLater],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useRootCommentsInfinite(entityType, entityId, pageSize);

  const roots: UIComment[] = data?.pages.flatMap((p) => p.items) ?? [];

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // collapsed by default: rootId -> expanded?
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const handleReplyClick = (c: UIComment) => {
    const rootId = c.level === 1 ? c.id : (c.rootId as string);
    const replyToId = c.level === 2 ? c.id : null;
    setReplyTarget({ rootId, replyToId, username: c.author?.username });
    console.log("handleReplyClick");
  };

  // Root create hook with flashing + scroll to top
  const createRoot = useCreateRootComment(
    entityType,
    entityId,
    optimisticAuthor,
    pageSize,
    {
      onOptimisticInsert: (tempId) => {
        // scroll to top immediately
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        // flash the optimistic item
        // wait a tick so the element exists
        requestAnimationFrame(() => {
          flash(tempId);
          const el = document.getElementById(`comment-${tempId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
      onServerId: (finalId, _tempId) => {
        // also flash the final id so it persists after id swap
        requestAnimationFrame(() => {
          flash(finalId);
          const el = document.getElementById(`comment-${finalId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
    },
  );

  // Like toggle (unchanged)
  const likeToggle = useLikeUnlikeComment(
    entityType,
    entityId,
    pageSize,
    repliesPageSize,
  );

  // Reply create hook with expand + flash + scroll to reply
  const createReply = useCreateReplyComment({
    onOptimisticInsert: (tempId, rootId) => {
      // Ensure thread is expanded so user sees their reply
      setExpanded((prev) => ({ ...prev, [rootId]: true }));
      // flash and scroll the new reply into view
      // allow DOM to mount the optimistic item
      setTimeout(() => {
        flash(tempId);
        const el = document.getElementById(`comment-${tempId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    },
    onServerId: (finalId, _tempId, _rootId) => {
      // Flash again on final id and re-scroll (no-op if already on screen)
      setTimeout(() => {
        flash(finalId);
        const el = document.getElementById(`comment-${finalId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    },
  });

  const handleSubmit = async (payload: NewCommentPayload) => {
    if (replyTarget) {
      // derive target comment id for API (reply to reply OR reply to root)
      const targetCommentId = replyTarget.replyToId ?? replyTarget.rootId;

      // optimistic reply create (adds to replies top + bumps root.replyCount)
      await createReply.mutateAsync({
        targetCommentId,
        rootId: replyTarget.rootId,
        currentUser: optimisticAuthor,
        item: payload,
        repliesPageSize,
        rootsKey: [
          "/external/comments/roots",
          { entityType, entityId, pageSize },
        ] as const,
      });
      await queryClient.refetchQueries({
        predicate: (q) => {
          const k = q.queryKey as any[];
          return (
            k?.[0] === "/external/comments/:rootId/replies" &&
            k?.[1]?.rootId === replyTarget.rootId
          );
        },
        type: "active", // only refetch if RepliesThread is currently mounted
      });

      // optional external callback (telemetry etc.)
      await onSubmitReply?.(replyTarget.rootId, {
        ...payload,
        replyToId: replyTarget.replyToId ?? null,
      });

      setReplyTarget(null);
    } else {
      // optimistic root create
      await createRoot.mutateAsync(payload);
      await onSubmitRoot?.(payload);
      // scroll-to-top also happens inside createRoot.onOptimisticInsert
    }
    refetch();
  };

  const toggleRoot = (rootId: string) =>
    setExpanded((prev) => ({ ...prev, [rootId]: !prev[rootId] }));

  // IntersectionObserver for infinite roots within the scroll container
  React.useEffect(() => {
    if (!sentinelRef.current || !containerRef.current) return;

    const el = sentinelRef.current;
    const rootEl = containerRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: rootEl, rootMargin: "200px", threshold: 0 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, roots.length]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-background shadow-sm",
        className,
      )}
    >
      {/* Scrollable comments area */}
      <div
        ref={containerRef}
        className={cn("overflow-y-auto p-4", heightClass)}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading comments…
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            {(error as any)?.message ?? "Failed to load comments."}
          </p>
        ) : roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Be the first to comment.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {roots.map((root) => {
                const totalReplies =
                  typeof root.replyCount === "number" && root.replyCount >= 0
                    ? root.replyCount
                    : 0;
                const isExpanded = !!expanded[root.id];

                return (
                  <li key={root.id}>
                    <CommentItem
                      data={root}
                      onReplyClick={handleReplyClick}
                      onToggleLike={(c, liked) => {
                        // prevent calling API for optimistic temp ids until they’re swapped with real id
                        if (String(c.id).startsWith("optimistic-")) return;
                        likeToggle.mutate({
                          commentId: c.id,
                          nextLiked: liked,
                          rootId: null,
                        });
                        // optional legacy callback
                        onToggleLike?.(c.id, liked);
                      }}
                      className="rounded-md hover:bg-muted/40 px-2"
                      isHighlighted={highlightedId === root.id}
                    />

                    {/* Collapsible trigger */}
                    {totalReplies > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleRoot(root.id)}
                        className={cn(
                          "ml-2 mt-1 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs",
                          "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition",
                        )}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {isExpanded
                          ? `Hide ${totalReplies} ${
                              totalReplies === 1 ? "reply" : "replies"
                            }`
                          : `View all ${totalReplies} ${
                              totalReplies === 1 ? "reply" : "replies"
                            }`}
                      </button>
                    ) : null}

                    {/* Replies list (collapsed by default) */}
                    {isExpanded ? (
                      <RepliesThread
                        root={root}
                        pageSize={repliesPageSize}
                        onReplyClick={handleReplyClick}
                        onToggleLike={(commentId, nextLiked) => {
                          likeToggle.mutate({
                            commentId,
                            nextLiked,
                            rootId: root.id,
                          });
                          onToggleLike?.(commentId, nextLiked);
                        }}
                        highlightedId={highlightedId}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {/* bottom sentinel for infinite roots */}
            <div ref={sentinelRef} className="h-6" />

            {/* next-page loader */}
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more comments…
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 pt-2">
        <CommentInput
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onSubmit={handleSubmit}
          className="pt-2"
        />
      </div>
    </div>
  );
};
