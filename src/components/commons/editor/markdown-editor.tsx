import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { MarkdownPreview } from "@/components/commons/editor/markdown-preview";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Minus,
  Table,
  Eye,
  Pencil,
} from "lucide-react";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  minHeight?: number;
};

type InsertMode =
  | { type: "wrap"; before: string; after: string; placeholder: string }
  | { type: "line-prefix"; prefix: string }
  | { type: "insert"; text: string };

function applyMarkdownAction(
  textarea: HTMLTextAreaElement,
  mode: InsertMode,
  onChange: (v: string) => void,
) {
  const { value, selectionStart, selectionEnd } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);

  let newValue: string;
  let newSelStart: number;
  let newSelEnd: number;

  if (mode.type === "wrap") {
    const { before, after, placeholder } = mode;
    if (selected) {
      newValue =
        value.slice(0, selectionStart) +
        before +
        selected +
        after +
        value.slice(selectionEnd);
      newSelStart = selectionStart + before.length;
      newSelEnd = selectionEnd + before.length;
    } else {
      newValue =
        value.slice(0, selectionStart) +
        before +
        placeholder +
        after +
        value.slice(selectionEnd);
      newSelStart = selectionStart + before.length;
      newSelEnd = newSelStart + placeholder.length;
    }
  } else if (mode.type === "line-prefix") {
    const { prefix } = mode;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd =
      value.indexOf("\n", selectionEnd) === -1
        ? value.length
        : value.indexOf("\n", selectionEnd);
    const lineContent = value.slice(lineStart, lineEnd);
    const alreadyPrefixed = lineContent.startsWith(prefix);

    if (alreadyPrefixed) {
      const stripped = lineContent.slice(prefix.length);
      newValue = value.slice(0, lineStart) + stripped + value.slice(lineEnd);
      newSelStart = Math.max(lineStart, selectionStart - prefix.length);
      newSelEnd = Math.max(lineStart, selectionEnd - prefix.length);
    } else {
      newValue = value.slice(0, lineStart) + prefix + lineContent + value.slice(lineEnd);
      newSelStart = selectionStart + prefix.length;
      newSelEnd = selectionEnd + prefix.length;
    }
  } else {
    newValue =
      value.slice(0, selectionStart) + mode.text + value.slice(selectionEnd);
    newSelStart = selectionStart + mode.text.length;
    newSelEnd = newSelStart;
  }

  onChange(newValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newSelStart, newSelEnd);
  });
}

const TOOLBAR_ACTIONS = [
  {
    group: "headings",
    items: [
      {
        label: "H1",
        icon: Heading1,
        title: "Heading 1",
        mode: { type: "line-prefix", prefix: "# " } as InsertMode,
      },
      {
        label: "H2",
        icon: Heading2,
        title: "Heading 2",
        mode: { type: "line-prefix", prefix: "## " } as InsertMode,
      },
      {
        label: "H3",
        icon: Heading3,
        title: "Heading 3",
        mode: { type: "line-prefix", prefix: "### " } as InsertMode,
      },
    ],
  },
  {
    group: "inline",
    items: [
      {
        label: "Bold",
        icon: Bold,
        title: "Bold (Ctrl+B)",
        mode: { type: "wrap", before: "**", after: "**", placeholder: "bold text" } as InsertMode,
      },
      {
        label: "Italic",
        icon: Italic,
        title: "Italic (Ctrl+I)",
        mode: { type: "wrap", before: "_", after: "_", placeholder: "italic text" } as InsertMode,
      },
      {
        label: "Strikethrough",
        icon: Strikethrough,
        title: "Strikethrough",
        mode: { type: "wrap", before: "~~", after: "~~", placeholder: "strikethrough" } as InsertMode,
      },
      {
        label: "Inline code",
        icon: Code,
        title: "Inline code",
        mode: { type: "wrap", before: "`", after: "`", placeholder: "code" } as InsertMode,
      },
    ],
  },
  {
    group: "blocks",
    items: [
      {
        label: "Bullet list",
        icon: List,
        title: "Bullet list",
        mode: { type: "line-prefix", prefix: "- " } as InsertMode,
      },
      {
        label: "Ordered list",
        icon: ListOrdered,
        title: "Ordered list",
        mode: { type: "line-prefix", prefix: "1. " } as InsertMode,
      },
      {
        label: "Blockquote",
        icon: Quote,
        title: "Blockquote",
        mode: { type: "line-prefix", prefix: "> " } as InsertMode,
      },
      {
        label: "Code block",
        icon: Code,
        title: "Code block",
        mode: { type: "wrap", before: "```\n", after: "\n```", placeholder: "code here" } as InsertMode,
      },
    ],
  },
  {
    group: "misc",
    items: [
      {
        label: "Link",
        icon: Link,
        title: "Insert link",
        mode: { type: "wrap", before: "[", after: "](url)", placeholder: "link text" } as InsertMode,
      },
      {
        label: "Table",
        icon: Table,
        title: "Insert table",
        mode: {
          type: "insert",
          text: "\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n",
        } as InsertMode,
      },
      {
        label: "Divider",
        icon: Minus,
        title: "Horizontal rule",
        mode: { type: "insert", text: "\n---\n" } as InsertMode,
      },
    ],
  },
];

export function MarkdownEditor({ value, onChange, className, minHeight = 480 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const handleAction = useCallback(
    (mode: InsertMode) => {
      if (!textareaRef.current) return;
      applyMarkdownAction(textareaRef.current, mode, onChange);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd } = textarea;
        const next =
          textarea.value.slice(0, selectionStart) +
          "  " +
          textarea.value.slice(selectionEnd);
        onChange(next);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        handleAction({ type: "wrap", before: "**", after: "**", placeholder: "bold text" });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        handleAction({ type: "wrap", before: "_", after: "_", placeholder: "italic text" });
      }
    },
    [onChange, handleAction],
  );

  return (
    <div className={cn("flex flex-col rounded-xl border border-[#DDE2E5] bg-white overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-[#DDE2E5] bg-[#F8F9FA] px-2 py-1.5 gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "edit" ? "bg-white text-[#17171a] shadow-sm" : "text-[#6b7280] hover:text-[#17171a]",
            )}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "preview" ? "bg-white text-[#17171a] shadow-sm" : "text-[#6b7280] hover:text-[#17171a]",
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>

        {activeTab === "edit" ? (
          <div className="flex items-center gap-1 flex-wrap">
            {TOOLBAR_ACTIONS.map((group) => (
              <div key={group.group} className="flex items-center gap-1 rounded-lg border border-[#DDE2E5] bg-white p-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      title={item.title}
                      onClick={() => handleAction(item.mode)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#4B5563] transition-colors hover:bg-[#EEF2FF] hover:text-[#17171a]"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6b7280]">Preview updates as you edit.</p>
        )}
      </div>

      {activeTab === "edit" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck
          className="w-full resize-y border-0 bg-white px-4 py-4 text-[15px] leading-7 text-[#17171a] outline-none placeholder:text-[#9CA3AF]"
          style={{ minHeight }}
          placeholder="Write your blog in markdown..."
        />
      ) : (
        <div className="px-4 py-4" style={{ minHeight }}>
          {value.trim() ? (
            <MarkdownPreview content={value} />
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[#DDE2E5] bg-[#FAFAFA] text-sm text-[#6B7280]">
              Nothing to preview yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

