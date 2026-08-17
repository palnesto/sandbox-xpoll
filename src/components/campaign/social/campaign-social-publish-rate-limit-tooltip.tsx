import { type ReactNode } from "react";
import { Clock3, Gauge } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCampaignSocialRateLimitResetAt } from "@/lib/campaign/social";
import { cn } from "@/lib/utils";
import type {
  CampaignSocialPublishRateLimitRule,
  CampaignSocialPublishRateLimitSnapshot,
} from "@/types/campaigns";

type RateLimitWheelTone = "teal" | "amber" | "violet";

function RateLimitWheel(props: {
  label: string;
  tone: RateLimitWheelTone;
  snapshot?: CampaignSocialPublishRateLimitSnapshot | null;
  rule?: CampaignSocialPublishRateLimitRule | null;
}) {
  const limit = props.snapshot?.limit ?? props.rule?.limit ?? 0;
  const remaining = props.snapshot?.remaining ?? limit;
  const used = props.snapshot?.used ?? 0;
  const percentRemaining =
    limit > 0 ? Math.max(0, Math.min(100, Math.round((remaining / limit) * 100))) : 0;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (Math.max(0, Math.min(100, percentRemaining)) / 100) * circumference;

  const toneClassName =
    props.tone === "teal"
      ? "text-[#4FD1C5]"
      : props.tone === "amber"
        ? "text-[#FBBF24]"
        : "text-[#C084FC]";

  const trackClassName =
    props.tone === "teal"
      ? "stroke-[#28545E]"
      : props.tone === "amber"
        ? "stroke-[#5B4120]"
        : "stroke-[#45305C]";

  const progressClassName =
    props.tone === "teal"
      ? "stroke-[#4FD1C5]"
      : props.tone === "amber"
        ? "stroke-[#FBBF24]"
        : "stroke-[#C084FC]";

  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={radius}
              strokeWidth="6"
              fill="none"
              className={cn("opacity-90", trackClassName)}
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={progressClassName}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-base font-semibold", toneClassName)}>
              {props.snapshot ? remaining : limit}
            </span>
            <span className="text-[10px] text-white/70">
              {props.snapshot ? `${percentRemaining}%` : "/ day"}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{props.label}</p>
          {props.snapshot ? (
            <>
              <p className="mt-1 text-xs text-white/70">
                {remaining} remaining of {limit} today
              </p>
              <p className="mt-1 text-[11px] text-white/55">
                Used {used} of {limit}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-white/70">
                {limit} publishes per UTC day
              </p>
              <p className="mt-1 text-[11px] text-white/55">
                Applied separately to each generated blog
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CampaignSocialPublishRateLimitTooltip(props: {
  user?: CampaignSocialPublishRateLimitSnapshot | null;
  campaign?: CampaignSocialPublishRateLimitSnapshot | null;
  blog?: CampaignSocialPublishRateLimitSnapshot | null;
  blogRule?: CampaignSocialPublishRateLimitRule | null;
  resetAt?: string | Date | null;
  trigger?: ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  if (!props.user || !props.campaign || (!props.blog && !props.blogRule)) {
    return null;
  }

  const exhausted =
    props.user.exhausted || props.campaign.exhausted || props.blog?.exhausted;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {props.trigger ?? (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[#D7DCE2] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] transition hover:border-[#B8C7D3]",
                exhausted && "border-[#EAB308]/40 bg-[#FEF9C3] text-[#854D0E]",
                props.triggerClassName,
              )}
            >
              <Gauge className="h-3.5 w-3.5" />
              {props.triggerLabel ?? "24h publish limits"}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          sideOffset={10}
          className="w-[340px] rounded-[24px] bg-[#1F1F24] p-4 text-white shadow-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Rate limits remaining
                </p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  One admitted publish action counts once across the selected
                  platforms for the current UTC day.
                </p>
              </div>
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-white/55" />
            </div>

            <div className="grid gap-3">
              <RateLimitWheel label="User" tone="teal" snapshot={props.user} />
              <RateLimitWheel
                label="Campaign"
                tone="amber"
                snapshot={props.campaign}
              />
              <RateLimitWheel
                label="Blog"
                tone="violet"
                snapshot={props.blog}
                rule={props.blogRule}
              />
            </div>

            <div className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/75">
              Next reset: {formatCampaignSocialRateLimitResetAt(props.resetAt)} UTC
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
