import { Trash2, Pencil } from "lucide-react";
import { FieldErrors, UseFormSetValue } from "react-hook-form";
import type { TrailCreateValues } from "@/schema/campaign.schemas";
import type { TrailReward } from "@/stores/create-campaign.store";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { baseToParentGrouped } from "../../../utils/trail-create-utils";

export function TrailCreateRewardsSection({
  rewards,
  errors,
  canEdit,
  onAddReward,
  onEditReward,
  setValue,
}: {
  rewards: TrailReward[];
  errors: FieldErrors<TrailCreateValues>;
  canEdit: boolean;
  onAddReward: () => void;
  onEditReward?: (reward: TrailReward) => void;
  setValue: UseFormSetValue<TrailCreateValues>;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[#7A7A7A]">Trail Rewards</div>
        <button
          type="button"
          onClick={onAddReward}
          disabled={!canEdit}
          className="rounded-full bg-[#E4F2DF] px-3 py-1 text-sm font-medium text-[#315326]"
        >
          + Add Reward
        </button>
      </div>

      <div className="space-y-4">
        {rewards.length ? (
          rewards.map((r: TrailReward) => {
            const spec = assetSpecs[r.assetId as AssetType];
            const perPerson = spec
              ? baseToParentGrouped(r.assetId as AssetType, r.amount)
              : String(r.amount);
            const cap = spec
              ? baseToParentGrouped(
                  r.assetId as AssetType,
                  r.rewardAmountCap,
                )
              : String(r.rewardAmountCap);

            return (
              <div
                key={r.id}
                className="rounded-lg bg-white border border-black/20 px-3 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {spec?.img ? (
                      <img src={spec.img} alt="" className="h-5 w-5" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-gray-200" />
                    )}
                    <div className="font-medium text-[#2B2B2B]">
                      {spec?.parent ?? String(r.assetId)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && onEditReward && (
                      <button
                        type="button"
                        onClick={() => onEditReward(r)}
                        className="p-2 rounded text-[#315326] hover:bg-[#E4F2DF]"
                        aria-label="Edit reward"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "rewards",
                          rewards.filter((x) => x.id !== r.id),
                          { shouldDirty: true, shouldValidate: true },
                        )
                      }
                      disabled={!canEdit}
                      className="p-2 rounded text-red-500 hover:text-red-600 hover:bg-red-50"
                      aria-label="delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-[#5E6366] text-[12px] 2xl:text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl 2xl:text-2xl font-medium text-[#111] tabular-nums">
                      {perPerson}
                    </span>
                    <span className="text-[#7A7A7A]">Amount Per Person</span>
                  </div>

                  <div className="h-7 w-px bg-black/20" />

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl 2xl:text-2xl font-semibold text-[#111] tabular-nums">
                      {cap}
                    </span>
                    <span className="text-[#7A7A7A]">Reward Amount Cap</span>
                  </div>

                  <div className="h-6 w-px bg-black/20" />

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl 2xl:text-2xl font-semibold text-[#111]">
                      {r.rewardType === "max" ? "Max" : "Min"}
                    </span>
                    <span className="text-[#7A7A7A]">Reward Type</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-[#8A8A8A]">No rewards yet</p>
        )}
      </div>
      {errors.rewards?.message ? (
        <p className="mt-2 text-xs text-red-600">
          {String(errors.rewards.message)}
        </p>
      ) : null}
    </section>
  );
}
