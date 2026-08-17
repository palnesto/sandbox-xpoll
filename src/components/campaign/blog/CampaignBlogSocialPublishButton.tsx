import { SendHorizontal } from "lucide-react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CampaignBlogSocialPublishButtonProps = {
  disabledReason?: string | null;
  label?: string;
} & Omit<ButtonProps, "children">;

export function CampaignBlogSocialPublishButton({
  disabledReason = null,
  label = "Publish",
  className,
  ...buttonProps
}: CampaignBlogSocialPublishButtonProps) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!!disabledReason || buttonProps.disabled}
      className={className}
      {...buttonProps}
    >
      <SendHorizontal className="h-4 w-4" />
      {label}
    </Button>
  );

  if (!disabledReason) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex cursor-not-allowed"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-64 rounded-lg border border-black/10 bg-white text-xs leading-5 text-[#334155] shadow-lg"
        >
          <p>{disabledReason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
