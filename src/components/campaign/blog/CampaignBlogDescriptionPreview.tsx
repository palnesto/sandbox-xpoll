import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { MarkdownPreview } from "@/components/commons/editor/markdown-preview";
import { isLegacyCampaignBlogHtml } from "@/lib/campaign-blog-description";

function linkifyHtml(html: string): string {
  return html.replace(
    /(?<!href=")(https?:\/\/[^\s<]+)|(mailto:\S+)|(tel:\S+)/g,
    (match) =>
      `<a href="${match}" target="_blank" rel="noopener noreferrer nofollow" class="text-[#0DACAD] underline underline-offset-2">${match}</a>`,
  );
}

function LegacyHtmlPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const sanitized = useMemo(() => {
    const maybeLinked = linkifyHtml(content || "");
    return DOMPurify.sanitize(maybeLinked, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel", "class"],
    });
  }, [content]);

  const transformed = sanitized.replace(/<p><\/p>/g, "<br />");

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        "prose-a:text-[#0DACAD] prose-a:underline prose-a:underline-offset-2",
        "[&>*:first-child]:mt-0",
        "[&>*:last-child]:mb-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: transformed }}
    />
  );
}

export function CampaignBlogDescriptionPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (isLegacyCampaignBlogHtml(content)) {
    return <LegacyHtmlPreview content={content} className={className} />;
  }

  return <MarkdownPreview content={content} className={className} />;
}

export function CampaignBlogDescriptionReadOnly({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-[250px] rounded-md border border-input bg-background overflow-x-auto",
        className,
      )}
    >
      <div className="min-h-[150px] rounded-b-md bg-background p-3">
        <CampaignBlogDescriptionPreview content={content} />
      </div>
    </div>
  );
}

