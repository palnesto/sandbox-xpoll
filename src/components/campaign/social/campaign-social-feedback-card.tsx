import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackTone = "loading" | "success" | "info" | "warning" | "danger";

const FEEDBACK_META: Record<
  FeedbackTone,
  {
    icon: ReactNode;
    panelClassName: string;
    eyebrowClassName: string;
    iconClassName: string;
  }
> = {
  loading: {
    icon: <LoaderCircle className="h-5 w-5 animate-spin" />,
    panelClassName: "border-[#BFDBFE] bg-[#F7FBFF]",
    eyebrowClassName: "text-[#1D4ED8]",
    iconClassName: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    panelClassName: "border-[#BBF7D0] bg-[#F0FDF4]",
    eyebrowClassName: "text-[#15803D]",
    iconClassName: "bg-[#DCFCE7] text-[#15803D]",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    panelClassName: "border-[#CFFAFE] bg-[#F0FDFF]",
    eyebrowClassName: "text-[#0F766E]",
    iconClassName: "bg-[#CCFBF1] text-[#0F766E]",
  },
  warning: {
    icon: <TriangleAlert className="h-5 w-5" />,
    panelClassName: "border-[#FDE68A] bg-[#FFFBEB]",
    eyebrowClassName: "text-[#B45309]",
    iconClassName: "bg-[#FEF3C7] text-[#B45309]",
  },
  danger: {
    icon: <AlertCircle className="h-5 w-5" />,
    panelClassName: "border-[#FECACA] bg-[#FEF2F2]",
    eyebrowClassName: "text-[#B91C1C]",
    iconClassName: "bg-[#FEE2E2] text-[#B91C1C]",
  },
};

export function CampaignSocialFeedbackCard(props: {
  tone: FeedbackTone;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  const meta = FEEDBACK_META[props.tone];

  return (
    <section
      className={cn("rounded-2xl border p-5 shadow-sm", meta.panelClassName)}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              meta.iconClassName,
            )}
          >
            {meta.icon}
          </div>

          <div>
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.22em]",
                meta.eyebrowClassName,
              )}
            >
              {props.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#132238]">
              {props.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5F7283]">
              {props.description}
            </p>
          </div>
        </div>

        {props.actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {props.actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
