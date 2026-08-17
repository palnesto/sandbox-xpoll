import { cn } from "@/lib/utils";

function SkeletonSpan({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-24 animate-pulse rounded bg-neutral-900/10 align-middle dark:bg-neutral-50/10",
        className,
      )}
      {...props}
    />
  );
}

export { SkeletonSpan };
