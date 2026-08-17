import { ArrowRight, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { CampaignBillingMode } from "@/types/campaigns";

export function CampaignPaymentRequiredPrompt(props: {
  campaignId: string;
  featureName: string;
  isMainOwner?: boolean;
  billingMode?: CampaignBillingMode | null;
  description?: string;
}) {
  const navigate = useNavigate();
  const isMainOwner = props.isMainOwner !== false;
  const ctaTarget =
    isMainOwner && props.billingMode === "subscription"
      ? `/campaigns/edit/${props.campaignId}/subscription-management`
      : `/campaigns/edit/${props.campaignId}/overview`;

  return (
    <section className="rounded-2xl border border-[#FECACA] bg-white p-8 shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] text-[#B91C1C]">
          <LockKeyhole className="h-6 w-6" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#B91C1C]">
          Payment required
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#132238]">
          {props.featureName} is temporarily locked
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
          {props.description ??
            (isMainOwner
              ? `Payment is required to restore access to ${props.featureName.toLowerCase()} for this paid campaign. Your content is still saved, but it stays hidden until paid access is restored.`
              : `Payment is required to restore access to ${props.featureName.toLowerCase()} for this paid campaign. The content is still saved, but it stays hidden until the main owner restores paid access.`)}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            type="button"
            className="rounded-full bg-[#B91C1C] px-5 text-white hover:bg-[#a11111]"
            onClick={() => navigate(ctaTarget)}
          >
            {isMainOwner
              ? props.billingMode === "subscription"
                ? "Open subscription management"
                : "View campaign overview"
              : "View campaign overview"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
