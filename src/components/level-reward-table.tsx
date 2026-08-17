// src/components/rewards-table.tsx
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { LEVELS } from "@/config/levelConfig";
import { buildRewardTable, type RewardType } from "@/config/civic-logic2";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { type AssetType, assetSpecs } from "@/utils/currency-assets/asset";
import { cn } from "@/lib/utils";

export type RewardsTableProps = {
  highestLevel: number;
  rewardType: RewardType;
  perUserReward: string | number | bigint; // base currency amount (no decimals!)
  asset: AssetType;
  maxDecimals?: number; // limit decimals displayed
  size?: "sm" | "md" | "lg"; // table size variant
  className?: string; // custom class for outer container
};

export function RewardsTable({
  highestLevel,
  rewardType,
  perUserReward,
  asset,
  maxDecimals,
  size = "md",
  className,
}: RewardsTableProps) {
  const decimal = assetSpecs?.[asset]?.decimal;
  const parentSymbol = assetSpecs?.[asset]?.parentSymbol;
  const img = assetSpecs?.[asset]?.img;
  const decimalsToShow = Math.min(
    decimal,
    maxDecimals != null ? maxDecimals : decimal,
  );

  // Normalize to bigint (source of truth)
  const rewardBig = useMemo(() => {
    if (typeof perUserReward === "bigint") return perUserReward;
    if (typeof perUserReward === "string") return BigInt(perUserReward);
    return BigInt(perUserReward);
  }, [perUserReward]);

  // Build rewards table (civic-logic2 expects number)
  const rewards = useMemo(() => {
    return buildRewardTable({
      totalLevels: highestLevel,
      rewardType,
      perUserReward: rewardBig,
    });
  }, [highestLevel, rewardType, rewardBig]);

  // Size styles
  const sizeStyles = {
    sm: {
      td: "p-2 text-xs",
      icon: "h-4 w-4",
      font: "text-xs",
    },
    md: {
      td: "p-3 text-sm",
      icon: "h-5 w-5",
      font: "text-sm",
    },
    lg: {
      td: "p-4 text-base",
      icon: "h-6 w-6",
      font: "text-base",
    },
  }[size];

  // Merge LEVELS config with rewards
  const rows = Array.from({ length: highestLevel }, (_, idx) => {
    const levelNum = idx + 1;
    const rewardBase = rewards.find((r) => r.level === levelNum)?.reward ?? 0n;

    // convert base → parent with clamped decimals
    const rewardParent = unwrapString(
      amount({
        op: "toParent",
        assetId: asset,
        value: rewardBase.toString(),
        output: "string",
        fixed: decimalsToShow,
        group: false,
      }),
      "0",
    );

    const config = LEVELS.find((l) => l.id === levelNum);

    return {
      id: levelNum,
      title: config?.title ?? "—",
      image: config?.image ?? "",
      reward: rewardParent,
    };
  });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((level) => (
            <tr
              key={level.id}
              className="border-b last:border-b-0 hover:bg-muted/50 transition"
            >
              {/* 1st col: level image */}
              <td className={cn(sizeStyles.td, "w-12")}>
                {level.image ? (
                  <img
                    src={level.image}
                    alt={level.title}
                    className={cn("object-contain", sizeStyles.icon)}
                  />
                ) : (
                  <div
                    className={cn("rounded-full bg-muted", sizeStyles.icon)}
                  />
                )}
              </td>

              {/* 2nd col: Level number */}
              <td className={cn(sizeStyles.td, "text-muted-foreground")}>
                Level {level.id}
              </td>

              {/* 3rd col: Title */}
              <td className={cn(sizeStyles.td, "font-semibold")}>
                {level.title}
              </td>

              {/* 4th col: Reward (right aligned with coin img) */}
              <td
                className={cn(
                  sizeStyles.td,
                  "font-mono tabular-nums text-right",
                )}
              >
                <div className="flex items-center justify-end gap-1">
                  <img
                    src={img}
                    alt={parentSymbol}
                    className={cn("object-contain", sizeStyles.icon)}
                  />
                  <span>
                    {level.reward} {parentSymbol}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
