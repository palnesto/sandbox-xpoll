import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const baseMarkdownPreviewClassName =
  "max-w-none text-[#2d2d30] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

function normalizeMarkdownContent(content: string) {
  let normalized = content.replace(/\r\n/g, "\n");

  if (!normalized.includes("\n") && normalized.includes("\\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }

  if (!normalized.includes("\t") && normalized.includes("\\t")) {
    normalized = normalized.replace(/\\t/g, "  ");
  }

  return normalized;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn(baseMarkdownPreviewClassName, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <h1
                {...props}
                className="mb-5 mt-10 text-[28px] font-semibold tracking-[-0.03em] text-[#17171a]"
              />
            );
          },
          h2: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <h2
                {...props}
                className="mb-4 mt-10 text-[22px] font-bold tracking-[-0.03em] text-[#17171a]"
              />
            );
          },
          h3: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <h3
                {...props}
                className="mb-4 mt-8 text-[18px] font-bold tracking-[-0.02em] text-[#17171a]"
              />
            );
          },
          p: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <p
                {...props}
                className="my-4 text-[15px] leading-[1.95] text-[#2d2d30]"
              />
            );
          },
          strong: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return <strong {...props} className="font-semibold text-[#17171a]" />;
          },
          a: (props) => {
            const { node: unusedNode, ...anchorProps } = props;
            void unusedNode;
            return (
              <a
                {...anchorProps}
                target="_blank"
                rel="noreferrer"
                className="text-[#4d5ee8] no-underline hover:underline"
              />
            );
          },
          ul: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return <ul {...props} className="my-5 ml-6 list-disc space-y-1.5" />;
          },
          ol: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <ol {...props} className="my-5 ml-6 list-decimal space-y-1.5" />
            );
          },
          li: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <li
                {...props}
                className="text-[15px] leading-[1.8] text-[#2d2d30]"
              />
            );
          },
          blockquote: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <blockquote
                {...props}
                className="my-5 border-l-4 border-[#7d85ff] bg-[#f6f7ff] px-5 py-3 text-[#38405a]"
              />
            );
          },
          hr: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return <hr {...props} className="my-8 border-[#d8dbe8]" />;
          },
          pre: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <pre
                {...props}
                className="my-4 overflow-x-auto rounded-[16px] bg-[#121521] px-5 py-4 text-[#eef2ff]"
              />
            );
          },
          code: ({ node: unusedNode, className, children, ...props }) => {
            void unusedNode;
            const isBlock = typeof className === "string" && className.length > 0;
            if (isBlock) {
              return (
                <code {...props} className={cn(className, "text-[13px]")}>
                  {children}
                </code>
              );
            }

            return (
              <code
                {...props}
                className="rounded bg-[#f1f3f8] px-1.5 py-0.5 text-[13px] text-[#1f2230]"
              >
                {children}
              </code>
            );
          },
          table: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <div className="my-6 overflow-x-auto">
                <table
                  {...props}
                  className="min-w-full border-collapse overflow-hidden rounded-[16px] border border-[#dde2ee]"
                />
              </div>
            );
          },
          thead: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return <thead {...props} className="bg-[#f5f7fb]" />;
          },
          th: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <th
                {...props}
                className="border border-[#dde2ee] px-4 py-3 text-left text-[13px] font-semibold text-[#17171a]"
              />
            );
          },
          td: ({ node: unusedNode, ...props }) => {
            void unusedNode;
            return (
              <td
                {...props}
                className="border border-[#dde2ee] px-4 py-3 text-[14px] leading-6 text-[#2d2d30]"
              />
            );
          },
        }}
      >
        {normalizeMarkdownContent(content)}
      </ReactMarkdown>
    </div>
  );
}
