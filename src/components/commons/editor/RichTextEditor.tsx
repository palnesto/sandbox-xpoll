import { TipTap } from "@/components/commons/editor/tiptap";
import { stripHtmlToText } from "@/utils/strip-html";
import { cn } from "@/lib/utils";

const DESCRIPTION_MAX = 350;

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  showCounter = true,
  maxLength = DESCRIPTION_MAX,
  disabled = false,
  className,
}: RichTextEditorProps) {
  const plainLength = stripHtmlToText(value ?? "").length;
  const atLimit = plainLength >= maxLength;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label className="text-sm font-medium text-[#5E6366]">{label}</label>
      ) : null}
      <div
        className={cn(
          "rounded-md border bg-background",
          error ? "border-red-300" : "border-input",
        )}
      >
        <TipTap
          description={value ?? ""}
          onChange={onChange}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
        {showCounter ? (
          <p
            className={cn(
              "text-xs tabular-nums",
              atLimit ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            {plainLength}/{maxLength}
          </p>
        ) : null}
      </div>
    </div>
  );
}
