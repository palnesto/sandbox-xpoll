import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import {
  type ApiTrial,
  type EarnToken,
  toNum,
  type TrailCard,
} from "@/types/campaigns";
import { getYouTubeThumbnailUrl } from "@/types/petition";

export function baseToParent(assetId: AssetType, baseVal: number | string) {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: true,
      group: false,
    }),
    "0",
  );
}

export function baseToParentGrouped(
  assetId: AssetType,
  baseVal: number | string,
  fixed = 3,
) {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: false,
      fixed,
    }),
    "0",
  );
}

export function TokenChipsRow({
  tokens,
  isBase = true,
}: {
  tokens: EarnToken[];
  isBase?: boolean;
}) {
  if (!tokens?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 max-w-[320px] 2xl:max-w-[480px]">
      {tokens.map((t, idx) => {
        const spec = assetSpecs[t.assetId];
        const display = isBase
          ? baseToParent(t.assetId, t.amount)
          : String(t.computedReward);

        return (
          <div
            key={`${t.assetId}-${idx}`}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 pl-1 pr-4 py-1"
          >
            <img src={spec.img} alt={spec.name} className="h-4" />
            <span className="text-xs font-semibold tabular-nums">
              {display}
            </span>
            <span className="text-[11px] text-gray-600">{spec.parent}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TrailRewardChips({ rewards }: { rewards: EarnToken[] }) {
  if (!rewards?.length) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {rewards?.map((r, idx) => {
        const spec = assetSpecs[r.assetId];
        const value = r.computedReward != null ? r.computedReward : r.amount;
        const display = baseToParent(r.assetId, value);

        return (
          <div
            key={`${r.assetId}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full bg-[#F4F4F4] px-1 md:px-3 py-1 text-[8px] xl:text-[14px] w-fit"
          >
            <img
              src={spec.img}
              alt={spec.name}
              className="h-3 w-3 xl:h-5 xl:w-5"
            />
            <span className="font-semibold tabular-nums text-[#111]">
              {display}
            </span>
            <span className="text-[#6B6B6B]">{spec.parentSymbol}</span>
          </div>
        );
      })}
    </div>
  );
}

export function pickThumbAndType(
  tr: ApiTrial,
): { url: string | null; type?: "image" | "youtube" | "video" } {
  const first = tr.resourceAssets?.[0];
  if (!first?.value) return { url: null };
  if (first.type === "image") return { url: first.value, type: "image" };
  if (first.type === "youtube") {
    const thumb = getYouTubeThumbnailUrl(String(first.value));
    return { url: thumb, type: "youtube" };
  }
  if (first.type === "video") return { url: first.value, type: "video" };
  return { url: null };
}

export function mapTrialToCard(t: ApiTrial): TrailCard {
  const { url, type } = pickThumbAndType(t);
  return {
    id: t._id,
    trailName: t.title,
    description: t.description,
    images: [url],
    thumbMediaType: type,
    rewards: (t.rewards ?? []).map((r) => ({
      id: `${t._id}-${r.assetId}`,
      assetId: r.assetId,
      amount: toNum(r.amount),
      rewardAmountCap: toNum(r.rewardAmountCap),
      rewardType: r.rewardType,
    })),
  };
}

export function getActiveTrials(raw: unknown): ApiTrial[] {
  const d = (raw as any)?.data?.data ?? (raw as any)?.data ?? raw ?? {};
  const active = d?.activeTrials;
  return Array.isArray(active) ? (active as ApiTrial[]) : [];
}
