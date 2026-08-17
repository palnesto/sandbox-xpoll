import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import Document from "@tiptap/extension-document";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export const TipTap = ({
  description,
  onChange,
}: {
  description: string;
  onChange: (richText: string) => void;
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Heading.configure({
        HTMLAttributes: {
          class: "text-xl font-bold",
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Document,
      Paragraph,
      Text,
      BulletList,
      OrderedList,
      ListItem,
      Underline,
      HardBreak,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          class: "text-[#0DACAD] underline underline-offset-2",
        },
        validate: (href: string) => {
          try {
            const normalized = href.match(/^https?:|^mailto:|^tel:/)
              ? href
              : `https://${href}`;
            const u = new URL(normalized);
            return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol);
          } catch {
            return false;
          }
        },
      }),
    ],
    content: description,
    editorProps: {
      attributes: {
        class: cn(
          "prose dark:prose-invert max-w-none",
          "[&_ol]:list-decimal [&_ul]:list-disc",
          "min-h-[150px] rounded-b-md p-3",
          "focus:outline-none",
          "bg-background",
          "[&>*:first-child]:mt-0",
          "[&>*:last-child]:mb-0",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && description !== editor.getHTML()) {
      editor.chain().setContent(description).run();
    }
  }, [description, editor]);

  return (
    <div className="flex flex-col overflow-x-scroll min-h-[250px] rounded-md border border-input bg-background">
      {/* <Toolbar editor={editor} /> */}
      <EditorContent editor={editor} />
    </div>
  );
};
