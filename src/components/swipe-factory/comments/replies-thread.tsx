import * as React from "react";
import { UIComment } from "./types";
import { useRepliesInfinite } from "./useRepliesInfinite";
import { CommentItem } from "./comment-item";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RepliesThreadProps = {
  root: UIComment;
  pageSize?: number;

  onReplyClick?: (c: UIComment) => void;
  onToggleLike?: (commentId: string, nextLiked: boolean) => void;
  className?: string;

  /** id to highlight within this thread (new reply) */
  highlightedId?: string | null;
};

/**
 * Renders replies for a single root with infinite paging.
 * Server returns pages newest-first (page 1 = latest N, page 2 = older N, ...).
 * We DISPLAY oldest->newest for the currently loaded window so the "View more replies (N)"
 * control always sits ABOVE the oldest loaded reply and prepends older pages on click.
 *
 * Example for total=100, pageSize=10:
 *  - After first load (page 1 = [100..91]): display [91..100] with "View more replies (90)" above.
 *  - After next load (page 2 = [90..81]): display [81..90, 91..100] with "View more replies (80)" above.
 */
export const RepliesThread: React.FC<RepliesThreadProps> = ({
  root,
  pageSize = 20,
  onReplyClick,
  onToggleLike,
  className,
  highlightedId = null,
}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useRepliesInfinite(root.id, pageSize);

  // server pages come newest-first; flatten, then reverse to show oldest->newest
  const allDesc = data?.pages.flatMap((p) => p.items) ?? [];
  const repliesAsc: UIComment[] = [...allDesc].reverse();

  const totalReplies =
    typeof root.replyCount === "number" ? root.replyCount : 0;
  const remaining = Math.max(0, totalReplies - repliesAsc.length);

  return (
    <div
      className={cn(
        // strong indent & subtle thread rule
        "ml-8 sm:ml-10 mt-1 border-l pl-4 sm:pl-6 border-muted/50",
        className
      )}
    >
      {/* Top loader or error (only when nothing is loaded yet) */}
      {isLoading && repliesAsc.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading replies…
        </div>
      ) : isError && repliesAsc.length === 0 ? (
        <div className="py-2 text-xs text-destructive">
          {(error as any)?.message ?? "Failed to load replies."}
        </div>
      ) : null}

      {/* "View more replies" always at the top; prepends older pages */}
      {hasNextPage ? (
        <div className="mb-2">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
            )}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            View more replies{remaining ? ` (${remaining})` : ""}
          </button>
        </div>
      ) : null}

      {/* Loaded replies, oldest -> newest */}
      {repliesAsc.length > 0 ? (
        <ul className="space-y-1">
          {repliesAsc.map((r) => (
            <li key={r.id}>
              <CommentItem
                data={r}
                onReplyClick={onReplyClick}
                onToggleLike={(c, liked) => onToggleLike?.(c.id, liked)}
                className="rounded-md hover:bg-muted/40 px-2"
                isHighlighted={highlightedId === r.id}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
