import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

type CopyIconButtonProps = {
  value?: string | null;
  className?: string;
  iconClassName?: string;
  srLabel?: string;
  copiedLabel?: string;
};

export function CopyIconButton(props: CopyIconButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!props.value || !navigator?.clipboard) return;

    await navigator.clipboard.writeText(props.value);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1400);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? props.copiedLabel ?? "Copied" : props.srLabel ?? "Copy"}
      className={cn(
        "relative rounded-full p-1 transition hover:bg-black/5",
        props.className,
      )}
    >
      <span className="sr-only">{props.srLabel ?? "Copy value"}</span>
      <span className="relative block h-4 w-4">
        <Copy
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-200",
            copied ? "scale-75 opacity-0" : "scale-100 opacity-100",
            props.iconClassName,
          )}
        />
        <Check
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-200",
            copied ? "scale-100 opacity-100" : "scale-75 opacity-0",
            props.iconClassName,
          )}
        />
      </span>
    </button>
  );
}
