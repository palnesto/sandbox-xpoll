import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DISABLED_MSG =
  "For doing any changes in your campaign or trail, first pause the campaign in the overview page.";

export function DisabledActionTooltip({
  disabled,
  message = DISABLED_MSG,
  children,
}: {
  disabled: boolean;
  message?: string;
  children: React.ReactElement;
}) {
  if (!disabled) return children;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-not-allowed">
            {React.cloneElement(children, {
              disabled: true,
              onClick: (e: any) => {
                e.preventDefault();
                e.stopPropagation();
              },
            })}
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
