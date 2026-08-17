import { cn } from "@/lib/utils";

type CryptoPoweredByStripProps = {
  active?: boolean;
  className?: string;
};

export function CryptoPoweredByStrip(props: CryptoPoweredByStripProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-right text-[11px] leading-none",
        props.active ? "text-[#0f766e]/70" : "text-slate-400",
        props.className,
      )}
    >
      <span
        className={cn(
          "font-medium italic",
          props.active ? "text-slate-500" : "text-slate-400",
        )}
      >
        Powered by
      </span>
      <span
        className={cn(
          "text-sm font-bold tracking-[-0.02em]",
          props.active ? "text-[#0f766e]" : "text-[#132238]/70",
        )}
      >
        SardinePay
      </span>
    </div>
  );
}
