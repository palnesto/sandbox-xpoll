import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SimpleTooltipProps = {
  message: React.ReactNode;
  children: React.ReactElement;
};

export function SimpleTooltip({ message, children }: SimpleTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {React.cloneElement(children, {
              tabIndex: -1,
            })}
          </span>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          align="center"
          className="max-w-[260px] rounded-lg border border-gray-400 bg-gray-100 text-xs text-black shadow-inner"
        >
          {message?.toString()?.slice(0, 100)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
