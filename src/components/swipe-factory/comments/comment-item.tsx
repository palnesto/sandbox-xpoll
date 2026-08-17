import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle } from "lucide-react";
import { UIComment } from "./types";
import { timeAgo } from "@/utils/time";

type CommentItemProps = {
  data: UIComment;
  onReplyClick?: (c: UIComment) => void;
  onToggleLike?: (c: UIComment, nextLiked: boolean) => void;
  className?: string;
  /** When true, apply a temporary highlight style */
  isHighlighted?: boolean;
};

export const CommentItem: React.FC<CommentItemProps> = ({
  data,
  onReplyClick,
  onToggleLike,
  className,
  isHighlighted = false,
}) => {
  const [liked, setLiked] = React.useState<boolean>(!!data.likedByMe);
  const [likeCount, setLikeCount] = React.useState<number>(data.likeCount);

  React.useEffect(() => {
    setLiked(!!data.likedByMe);
    setLikeCount(data.likeCount);
  }, [data.likedByMe, data.likeCount]);

  const handleToggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((prev) => Math.max(0, prev + (next ? 1 : -1)));
    onToggleLike?.(data, next);
  };

  const displayUsername =
    (data.author?.username && data.author.username.trim()) ||
    (data.author?.id ? `user-${String(data.author.id).slice(-4)}` : "user");

  const initials = (displayUsername[0] || "?").toUpperCase();

  const mentionName =
    data.level === 2
      ? (data.replyToUsername && data.replyToUsername.trim()) ||
        (data.rootAuthorUsername && data.rootAuthorUsername.trim()) ||
        "someone"
      : null;

  return (
    <div
      id={`comment-${data.id}`}
      className={cn(
        "flex gap-3 py-3 transition-colors",
        isHighlighted && "bg-cyan-100/50 rounded-md ease-out",
        className
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {data.author?.avatarUrl ? (
          <AvatarImage src={data.author.avatarUrl} alt={displayUsername} />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <div className="font-medium">{displayUsername}</div>
          <div className="text-muted-foreground">
            • {timeAgo(data.createdAt)}
          </div>
        </div>

        {data.level === 2 && mentionName ? (
          <div className="mt-0.5 text-xs text-muted-foreground">
            Replying to <span className="font-medium">@{mentionName}</span>
          </div>
        ) : null}

        <div className="mt-1 whitespace-pre-wrap break-words">
          {data.type === "text" && data.text ? (
            <p className="text-sm leading-6">{data.text}</p>
          ) : null}
          {data.type === "gif" && data.gifUrl ? (
            <img
              src={data.gifUrl}
              alt="gif"
              className="mt-1 max-h-60 w-auto rounded-lg"
            />
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleToggleLike}
            className={cn(
              "inline-flex items-center gap-1 transition",
              liked ? "text-red-600" : "hover:text-foreground"
            )}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={cn("h-4 w-4", liked && "fill-red-600 stroke-red-600")}
            />
            <span>
              {likeCount} {likeCount === 1 ? "like" : "likes"}
            </span>
          </button>

          <Button
            type="button"
            onClick={() => onReplyClick?.(data)}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <MessageCircle className="mr-1 h-4 w-4" />
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
};
