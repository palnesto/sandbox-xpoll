import { cn } from "@/lib/utils";
type ViewAllButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
};
export function ViewAllButton({
  children,
  onClick,
  title,
  className,
}: ViewAllButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "relative text-sm font-medium text-black hover:text-black/80 transition",
        className,
      )}
    >
      {children}

      <svg
        className="absolute right-0"
        width="55"
        height="6"
        viewBox="0 0 64 6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 3c6-4 10 4 16 0s10 4 16 0 10 4 16 0 10 4 14 0"
          stroke="currentColor"
          strokeOpacity="0.7"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
