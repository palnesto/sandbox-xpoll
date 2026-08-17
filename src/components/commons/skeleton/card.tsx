import { cn } from "@/lib/utils";

type SkeletonCardProps = React.HTMLAttributes<HTMLDivElement>;

function SkeletonCard({ className, ...props }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
      {...props}
    >
      <div className="space-y-3">
        <div className="h-4 w-1/2 rounded bg-neutral-900/10 dark:bg-neutral-50/10" />
        <div className="h-3 w-full rounded bg-neutral-900/10 dark:bg-neutral-50/10" />
        <div className="h-3 w-5/6 rounded bg-neutral-900/10 dark:bg-neutral-50/10" />
      </div>
    </div>
  );
}

export { SkeletonCard };
