import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cloneElement, ReactElement, SyntheticEvent } from "react";

const PERMISSION_DISABLED_MSG = "Permission disabled by owner";
 
export function PermissionDisabledTooltip({
  hasPermission,
  message = PERMISSION_DISABLED_MSG,
  children,
  className,
}: {
  hasPermission: boolean;
  message?: string;
  children: ReactElement;
  className?: string;
}) {
  if (hasPermission) return children;

  const preventClick = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clonedChild = cloneElement(children, {
    disabled: true,
    "data-disabled": true,
    "aria-disabled": true,
    onClick: preventClick,
    onPointerDown: preventClick,
  } as any);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "cursor-not-allowed opacity-60 select-none",
              className,
            )}
          >
            {clonedChild}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="text-red-400 bg-gray-100 border border-gray-400 rounded-lg shadow-inner max-w-52"
        >
          <p className="max-w-[260px] text-xs leading-4">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
