import { ArrowRight, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function BasicFeatureUpgradePrompt(props: {
  campaignId: string;
  featureName: string;
  isMainOwner?: boolean;
  description?: string;
}) {
  const navigate = useNavigate();
  const isMainOwner = props.isMainOwner !== false;

  return (
    <section className="rounded-2xl border border-[#DCE6EC] bg-white p-8 shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8FBFB] text-[#0EA5A5]">
          <LockKeyhole className="h-6 w-6" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0EA5A5]">
          Upgrade any time
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#132238]">
          {props.featureName} isn&apos;t included in Basic
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
          {props.description ??
            (isMainOwner
              ? `Upgrade this Basic campaign any time to unlock ${props.featureName.toLowerCase()} and the full paid campaign experience.`
              : `This feature is excluded on Basic campaigns. Ask the main owner to upgrade the campaign any time to unlock ${props.featureName.toLowerCase()}.`)}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            type="button"
            className="rounded-full bg-[#0EA5A5] px-5 text-white hover:bg-[#0c9a9a]"
            onClick={() =>
              navigate(
                isMainOwner
                  ? `/campaigns/edit/${props.campaignId}/overview?upgrade=1`
                  : `/campaigns/edit/${props.campaignId}/overview`,
              )
            }
          >
            {isMainOwner ? "Upgrade any time" : "View campaign overview"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
