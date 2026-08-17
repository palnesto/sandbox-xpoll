export type UIComment = {
  id: string;
  level: 1 | 2;
  rootId: string | null;
  replyToId: string | null;
  type: "text" | "gif";
  text: string | null;
  gifUrl: string | null;
  likeCount: number;
  replyCount: number;
  likedByMe?: boolean;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  replyToUsername?: string | null;
  rootAuthorUsername?: string | null;

  createdAt: string | Date;
};

export type CommentAuthor = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};
