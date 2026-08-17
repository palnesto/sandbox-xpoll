import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  allowanceDisplay: string;
  tokenSymbol: string;
  targetDisplay: string;
  showRefill: boolean;
  refillDisabled?: boolean;
  refillBusy?: boolean;
  onRefill?: () => void;
  className?: string;
};

export function SubscriptionAllowanceCard(props: Props) {
  return (
    <div className={cn("rounded-2xl border border-black/5 p-4", props.className)}>
      <div className="text-xs font-semibold uppercase tracking-widest text-[#7A7A7A]">
        Allowance
      </div>
      <div className="mt-2 text-sm font-semibold text-[#111]">
        {props.allowanceDisplay}
      </div>

      {props.showRefill ? (
        <>
          <p className="mt-2 text-xs text-[#6E6E6E]">
            Refill resets the saved {props.tokenSymbol} approval back to{" "}
            {props.targetDisplay}. It never adds above that cap.
          </p>
          <Button
            type="button"
            disabled={props.refillDisabled}
            className="mt-3 rounded-full bg-[#0f766e] text-white hover:bg-[#115e59]"
            onClick={props.onRefill}
          >
            {props.refillBusy
              ? "Refilling..."
              : `Refill to ${props.targetDisplay}`}
          </Button>
        </>
      ) : null}
    </div>
  );
}
