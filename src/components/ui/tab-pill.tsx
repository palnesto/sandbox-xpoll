import { cn } from "@/lib/utils";

export function TabPill({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
      className={cn(
        "px-1.5 2xl:px-2 py-2 text-xs xl:text-sm rounded-full font-medium transition disabled:cursor-not-allowed",
        active
          ? "bg-[#EDEDED] text-gray-900 border border-gray-300 backdrop-blur-md"
          : "bg-transparent text-gray-400 hover:text-gray-700",
      )}
    >
      {children}
    </button>
  );
}
