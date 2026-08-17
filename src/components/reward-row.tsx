import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";

type Reward = {
  assetId: AssetType;
  amount: string;
  rewardAmountCap: string;
  currentDistribution: string;
  computedReward: string;
  rewardType: "min" | "max";
};

export function RewardsRow({ rewards }: { rewards: Reward[] }) {
  if (!rewards?.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto p-2">
      {rewards.map((r, i) => {
        const spec = assetSpecs[r.assetId];

        const formatted = unwrapString(
          amount({
            op: "toParent",
            assetId: r.assetId,
            value: r.computedReward,
            output: "string",
            trim: true,
            group: false,
          })
        );

        return (
          <div
            key={i}
            className="flex items-center gap-2 shrink-0 rounded-lg bg-white px-3 py-1"
          >
            <img src={spec.img} alt={spec.name} className="h-5" />
            <span className="font-medium text-sm">
              {formatted} {spec.parentSymbol}
            </span>
          </div>
        );
      })}
    </div>
  );
}
