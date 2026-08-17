import { cn } from "@/lib/utils";
import { getCampaignOwnerAccessState, getCampaignTier } from "@/lib/campaign";
import type { CampaignBillingMode } from "@/types/campaigns";

function StatePill(props: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        props.className,
      )}
    >
      {props.label}
    </span>
  );
}

export function CampaignStatePills(props: {
  input: unknown;
  ownershipType?: string | null;
  billingMode?: CampaignBillingMode | null;
  className?: string;
  showBillingMode?: boolean;
  showVisibility?: boolean;
}) {
  const tier = getCampaignTier(props.input);
  const ownerAccessState = getCampaignOwnerAccessState(props.input);
  const ownershipType = String(
    props.ownershipType ??
      (typeof props.input === "object" && props.input !== null
        ? (props.input as any)?.ownership?.type
        : ""),
  )
    .trim()
    .toLowerCase();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", props.className)}>
      <StatePill
        label={tier === "basic" ? "Campaign type: Basic" : "Campaign type: Paid"}
        className={
          tier === "basic"
            ? "bg-[#E4F2DF] text-[#315326]"
            : "bg-[#E8FBFB] text-[#117C7C]"
        }
      />

      <StatePill
        label={ownershipType === "co-owner" ? "Co-owner" : "Primary Owner"}
        className="bg-[#F3F4F6] text-[#4B5563]"
      />

      {ownerAccessState === "payment_required" ? (
        <StatePill
          label="Payment required"
          className="bg-[#FEE2E2] text-[#B91C1C]"
        />
      ) : null}
    </div>
  );
}
