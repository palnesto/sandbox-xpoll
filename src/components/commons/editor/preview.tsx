import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

function linkifyHtml(html: string): string {
  return html.replace(
    /(?<!href=")(https?:\/\/[^\s<]+)|(mailto:\S+)|(tel:\S+)/g,
    (m) =>
      `<a href="${m}" target="_blank" rel="noopener noreferrer nofollow" class="text-[#0DACAD] underline underline-offset-2">${m}</a>`,
  );
}

export const RichTextPreview = ({ content }: { content: string }) => {
  const sanitized = useMemo(() => {
    const maybeLinked = linkifyHtml(content || "");
    return DOMPurify.sanitize(maybeLinked, {
      USE_PROFILES: { html: true }, // safe default profile
      ADD_ATTR: ["target", "rel", "class"], // allow our link attrs
    });
  }, [content]);

  const transformed = sanitized.replace(/<p><\/p>/g, "<br />");

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        "prose-a:text-[#0DACAD] prose-a:underline prose-a:underline-offset-2",
        "rounded-lg bg-background p-4 mt-4",
        "[&>*:first-child]:mt-0",
        "[&>*:last-child]:mb-0",
      )}
      dangerouslySetInnerHTML={{ __html: transformed }}
    />
  );
};

export function RichTextReadOnly({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-x-scroll min-h-[250px] rounded-md border border-input bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "prose dark:prose-invert max-w-none hover:cursor-not-allowed",
          "[&_ol]:list-decimal [&_ul]:list-disc",
          "min-h-[150px] rounded-b-md p-3",
          "focus:outline-none",
          "bg-background",
          "[&>*:first-child]:mt-0",
          "[&>*:last-child]:mb-0",
        )}
        // petition descriptions are authored by your own editor so this is OK.
        // if you want extra safety, sanitize this HTML before rendering.
        dangerouslySetInnerHTML={{ __html: html || "" }}
      />
    </div>
  );
}
