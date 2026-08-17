import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileImage, X, Search, Loader2, Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { appToast } from "@/utils/toast";

/** ===== Keep frontend limits in sync with server ===== */
const COMMENT_TEXT_MAX = 2000;
const GIF_URL_MAX_LENGTH = 2048;
const isGifUrl = (u: string) => /\.gif(?:$|\?|\#)/i.test(u);

/** ===== Giphy config (Vite-safe) ===== */
const env: any =
  (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
const GIPHY_API_KEY: string =
  env.VITE_GIPHY_API_KEY ||
  env.NEXT_PUBLIC_GIPHY_API_KEY ||
  "H23buhOVg9F0slW2Z5eJKx6Ef2ogdmAX"; // fallback for local/dev
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";
const DEFAULT_RATING = "pg";
const PAGE_LIMIT = 24;

/** Desktop submit breakpoint (Tailwind lg >= 1024px) */
const DESKTOP_MEDIA = "(min-width: 1024px)";

/** ===== Types for onSubmit ===== */
export type NewCommentPayload =
  | { type: "text"; text: string }
  | { type: "gif"; gifUrl: string };

type ReplyTarget = {
  rootId: string;
  replyToId?: string | null;
  username?: string;
} | null;

/** ===== Form schema (text only; GIF is sent via picker) ===== */
const CommentFormZ = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Say something")
    .max(COMMENT_TEXT_MAX, `Max ${COMMENT_TEXT_MAX} characters`),
});

type FormValues = z.infer<typeof CommentFormZ>;

/** ===== Giphy response shapes (partial) ===== */
type GiphyImages = {
  original?: { url?: string };
  downsized?: { url?: string };
  fixed_width?: { url?: string };
  fixed_height?: { url?: string };
};
type GiphyGif = { id: string; title?: string; images: GiphyImages };
type GiphyResponse = {
  data: GiphyGif[];
  pagination?: { total_count?: number; count?: number; offset?: number };
};

function pickGifUrl(g: GiphyGif): string | null {
  const imgs = g.images || {};
  const candidates = [
    imgs.original?.url,
    imgs.downsized?.url,
    imgs.fixed_width?.url,
    imgs.fixed_height?.url,
  ];
  return candidates.find((u) => u && isGifUrl(u)) ?? null;
}

/** ===== Component ===== */
type CommentInputProps = {
  /** null = root mode; otherwise reply mode */
  replyTarget: ReplyTarget;
  onCancelReply: () => void;
  onSubmit: (payload: NewCommentPayload) => void | Promise<void>;
  className?: string;
};

export const CommentInput: React.FC<CommentInputProps> = ({
  replyTarget,
  onCancelReply,
  onSubmit,
  className,
}) => {
  // ----- form for text -----
  const form = useForm<FormValues>({
    resolver: zodResolver(CommentFormZ),
    mode: "onChange",
    defaultValues: { text: "" },
  });
  const text = form.watch("text") ?? "";

  // Keep a ref to the textarea to insert emojis at the caret.
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const textReg = form.register("text");

  React.useEffect(() => {
    form.reset({ text: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTarget?.rootId, replyTarget?.replyToId]);

  const submitText = async (values: FormValues) => {
    await onSubmit({ type: "text", text: values.text.trim() });
    form.reset({ text: "" });
  };

  const {
    handleSubmit,
    formState: { isValid, isSubmitting, errors },
  } = form;

  // Desktop breakpoint detection
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DESKTOP_MEDIA).matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(DESKTOP_MEDIA);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    // Older Safari support
    mql.addEventListener
      ? mql.addEventListener("change", listener)
      : mql.addListener(listener);
    return () => {
      mql.removeEventListener
        ? mql.removeEventListener("change", listener)
        : mql.removeListener(listener);
    };
  }, []);

  // ----- panel states -----
  const [gifOpen, setGifOpen] = React.useState(false);
  const [emojiOpen, setEmojiOpen] = React.useState(false);

  // Submit on Enter (desktop only, unless Shift held)
  // ✅ Allow submit even if emoji panel is open.
  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isDesktop && e.key === "Enter" && !e.shiftKey && !gifOpen) {
      const currentText = form.getValues("text")?.trim() ?? "";
      if (
        currentText.length > 0 &&
        currentText.length <= COMMENT_TEXT_MAX &&
        !isSubmitting
      ) {
        e.preventDefault();
        handleSubmit(submitText)();
      }
    }
  };

  // ----- GIF picker state -----
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [gifs, setGifs] = React.useState<GiphyGif[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);

  // debounce search query for GIFs
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchGifs = React.useCallback(
    async (reset = false) => {
      if (!GIPHY_API_KEY) return;

      setLoading(true);
      try {
        const endpoint =
          debouncedQ.length > 0
            ? `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
                debouncedQ
              )}&limit=${PAGE_LIMIT}&offset=${
                reset ? 0 : offset
              }&rating=${DEFAULT_RATING}&lang=en`
            : `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${PAGE_LIMIT}&offset=${
                reset ? 0 : offset
              }&rating=${DEFAULT_RATING}`;

        const res = await fetch(endpoint);
        const json: GiphyResponse = await res.json();

        const batch = json?.data ?? [];
        setGifs((prev) => (reset ? batch : [...prev, ...batch]));

        const count = json?.pagination?.count ?? batch.length ?? 0;
        const nextOffset = (reset ? 0 : offset) + count;
        setOffset(nextOffset);
        setHasMore(count === PAGE_LIMIT);
      } catch {
        // swallow – show empty
        if (reset) setGifs([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQ, offset]
  );

  // initial/trending load when opening GIF picker
  React.useEffect(() => {
    if (!gifOpen) return;
    setOffset(0);
    setHasMore(true);
    fetchGifs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifOpen, debouncedQ]);

  const loadMore = () => {
    if (!loading && hasMore) fetchGifs(false);
  };

  const sendGif = async (gif: GiphyGif) => {
    const url = pickGifUrl(gif);
    if (!url) return; // ignore non-gif
    const safeUrl =
      url.length > GIF_URL_MAX_LENGTH ? url.slice(0, GIF_URL_MAX_LENGTH) : url;
    await onSubmit({ type: "gif", gifUrl: safeUrl });
    setGifOpen(false);
  };

  const canSubmitText = isValid && !isSubmitting && text.trim().length > 0;

  // ----- Emoji insertion at caret -----
  const insertEmoji = (emoji: string) => {
    const current = form.getValues("text") ?? "";
    const el = textareaRef.current;
    const clamp = (s: string) =>
      s.length > COMMENT_TEXT_MAX ? s.slice(0, COMMENT_TEXT_MAX) : s;

    if (
      el &&
      typeof el.selectionStart === "number" &&
      typeof el.selectionEnd === "number"
    ) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = clamp(current.slice(0, start) + emoji + current.slice(end));
      form.setValue("text", next, { shouldValidate: true, shouldDirty: true });
      // restore focus & caret after DOM updates
      requestAnimationFrame(() => {
        el.focus();
        const pos = Math.min(next.length, start + emoji.length);
        el.setSelectionRange(pos, pos);
      });
    } else {
      const next = clamp(current + emoji);
      form.setValue("text", next, { shouldValidate: true, shouldDirty: true });
    }
  };

  const onEmojiClick = (data: EmojiClickData) => {
    insertEmoji(data.emoji);
  };

  return (
    <div className={cn("border-t pt-3", className)}>
      {/* Reply banner */}
      {replyTarget ? (
        <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
          <div className="truncate">
            Replying to{" "}
            <span className="font-medium">
              @{replyTarget?.username ?? "user"}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      ) : null}

      {/* Text form */}
      <form onSubmit={handleSubmit(submitText)} className="flex flex-col gap-2">
        <Textarea
          onFocus={() => {
            // appToast.success("Focus");
          }}
          {...textReg}
          ref={(el) => {
            textareaRef.current = el;
            if (typeof textReg.ref === "function") textReg.ref(el);
            // @ts-expect-error react-hook-form also accepts assigning .current
            else if (textReg.ref) textReg.ref.current = el;
          }}
          placeholder={replyTarget ? "Write a reply…" : "Write a comment…"}
          className="min-h-[44px] z-50"
          maxLength={COMMENT_TEXT_MAX}
          aria-invalid={!!errors?.text}
          aria-describedby="comment-text-help"
          onKeyDown={handleTextKeyDown}
        />

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span id="comment-text-help">
            {errors?.text?.message ? (
              <span className="text-destructive">
                {String(errors.text.message)}
              </span>
            ) : (
              "Be respectful. No spam."
            )}
          </span>

          <div className="flex items-center gap-2">
            <span>
              {text.length}/{COMMENT_TEXT_MAX}
            </span>

            {/* Emoji button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                setEmojiOpen((v) => !v);
                if (!emojiOpen && gifOpen) setGifOpen(false);
              }}
              title="Add emoji"
              aria-label="Add emoji"
              aria-expanded={emojiOpen}
            >
              <Smile className="h-4 w-4" />
            </Button>

            {/* GIF button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                setGifOpen(true);
                if (emojiOpen) setEmojiOpen(false);
              }}
              title="Add GIF"
              aria-label="Add GIF"
              aria-expanded={gifOpen}
            >
              <FileImage className="h-4 w-4" />
            </Button>

            <Button type="submit" disabled={!canSubmitText}>
              {replyTarget ? "Reply" : "Comment"}
            </Button>
          </div>
        </div>
      </form>

      {/* EMOJI Picker overlay */}
      {emojiOpen ? (
        <div className="relative z-50 mt-3 w-full rounded-md border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b p-2">
            <div className="text-xs font-medium">Pick emojis</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setEmojiOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="ml-1">Close</span>
            </Button>
          </div>
          <div className="p-2">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={Theme.AUTO}
              lazyLoadEmojis
              skinTonesDisabled={false}
              searchDisabled={false}
              width="100%"
              height={360}
              autoFocusSearch={false}
            />
          </div>
        </div>
      ) : null}

      {/* GIF Picker overlay */}
      {gifOpen ? (
        <div className="relative z-50 mt-3 w-full rounded-md border bg-popover shadow-lg">
          {/* Header / Search */}
          <div className="flex items-center gap-2 border-b p-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search GIFs"
                className="pl-8"
                maxLength={100}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setGifOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="ml-1">Close</span>
            </Button>
          </div>

          {/* Results grid */}
          <div className="max-h-96 overflow-y-auto p-2">
            {loading && gifs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading GIFs…
              </div>
            ) : gifs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No GIFs found.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {gifs.map((g) => {
                    const u = pickGifUrl(g);
                    if (!u) return null;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className="group relative overflow-hidden rounded-md border bg-muted/30 hover:bg-muted"
                        onClick={() => sendGif(g)}
                        title={g.title ?? "GIF"}
                      >
                        <img
                          src={u}
                          alt={g.title ?? "gif"}
                          className="h-32 w-full object-cover"
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/20 text-xs text-white group-hover:flex">
                          Send
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Load more */}
                {hasMore ? (
                  <div className="mt-3 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
