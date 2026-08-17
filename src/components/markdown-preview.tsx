import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const baseMarkdownPreviewClassName =
  "prose max-w-none text-[#2d2d30] prose-p:my-0 prose-p:text-[15px] prose-p:leading-[1.95] prose-strong:text-[#17171a] prose-strong:font-semibold prose-a:text-[#4d5ee8] prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-[#f1f3f8] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:text-[#1f2230] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-[16px] prose-pre:bg-[#121521] prose-pre:px-5 prose-pre:py-4 prose-pre:text-[#eef2ff] prose-blockquote:border-l-4 prose-blockquote:border-[#7d85ff] prose-blockquote:bg-[#f6f7ff] prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:text-[#38405a] prose-ol:my-5 prose-ul:my-5 prose-li:my-1.5 prose-li:text-[15px] prose-li:leading-[1.8] prose-hr:my-8 prose-hr:border-[#d8dbe8] prose-h1:mb-5 prose-h1:mt-10 prose-h1:text-[28px] prose-h1:font-semibold prose-h1:tracking-[-0.03em] prose-h1:text-[#17171a] prose-h2:mb-4 prose-h2:mt-10 prose-h2:text-[22px] prose-h2:font-bold prose-h2:tracking-[-0.03em] prose-h2:text-[#17171a] prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-[18px] prose-h3:font-bold prose-h3:tracking-[-0.02em] prose-h3:text-[#17171a] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn(baseMarkdownPreviewClassName, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
