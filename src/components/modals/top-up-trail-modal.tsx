import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import {
  amount,
  unwrapBigInt,
  unwrapString,
} from "@/utils/currency-assets/base";
import { NumberField } from "../commons/form/NumberField";
import { queryClient } from "@/api/queryClient";
import { X } from "lucide-react";
import { appToast } from "@/utils/toast";

type TrialReward = {
  assetId: AssetType;
  rewardType: "min" | "max";
  amount: string;
  rewardAmountCap: string;
  currentDistribution: string;
};

type TrialApi = {
  data?: {
    trial?: {
      _id: string;
      title: string;
      rewards: TrialReward[];
    };
  };
};

type FormValues = Record<string, string>;

const decimalRe = /^\d+(\.\d+)?$/;

function toBaseBI(assetId: AssetType, parentStr: string) {
  return unwrapBigInt(
    amount({
      op: "toBase",
      assetId,
      value: parentStr,
      output: "bigint",
      rounding: "floor",
    }),
    BigInt(0),
  );
}

function toParentFixed(assetId: AssetType, baseStr: string, fixed = 6) {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: baseStr,
      output: "string",
      fixed,
      trim: true,
      group: false,
    }),
    "0",
  );
}

function normalizeInput(v: unknown) {
  if (v == null) return "0";
  const s = String(v).trim();
  return s === "" ? "0" : s;
}

function buildDefaultValues(assets: AssetType[]): FormValues {
  const out: FormValues = {};
  for (const a of assets) out[a] = "0";
  return out;
}

function calcAnyNonZero(values: FormValues, assets: AssetType[]) {
  for (const a of assets) {
    const bi = toBaseBI(a, String(values?.[a] ?? "0"));
    if (bi > BigInt(0)) return true;
  }
  return false;
}

function makeTopUpSchema(opts: {
  assets: AssetType[];
  walletBaseByAsset: Partial<Record<AssetType, bigint>>;
}) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const assetId of opts.assets) {
    const walletBase = opts.walletBaseByAsset[assetId] ?? BigInt(0);

    shape[assetId] = z
      .preprocess(normalizeInput, z.string())
      .refine((s) => s === "0" || decimalRe.test(s), {
        message: "Enter a valid number",
      })
      .refine(
        (s) => {
          const bi = toBaseBI(assetId, s);
          return bi >= BigInt(0);
        },
        { message: "Must be ≥ 0" },
      )
      .refine(
        (s) => {
          const bi = toBaseBI(assetId, s);
          return bi <= walletBase;
        },
        { message: "You don't have enough coins" },
      );
  }

  return z.object(shape);
}

export default function TopUpTrailRewardsModal({
  open,
  trialId,
  onClose,
  isStandalone = false,
}: {
  open: boolean;
  trialId: string | null;
  onClose: () => void;
  isStandalone?: boolean;
}) {
  const trialRoute = trialId
    ? isStandalone
      ? endpoints.standaloneTrail.getById(trialId)
      : endpoints.campaigns.getTrialById(trialId)
    : "";

  const { data: trialRes, isLoading: trialLoading, refetch } = useApiQuery<TrialApi>(
    trialRoute,
    { enabled: open && !!trialId },
  );

  const { data: meRes, isLoading: meLoading } = useApiQuery<any>(
    endpoints.profile.me,
    { enabled: open },
  );

  const rewards: TrialReward[] = useMemo(() => {
    const t =
      (trialRes as any)?.data?.trial ?? (trialRes as any)?.data?.data?.trial;
    return Array.isArray(t?.rewards) ? (t.rewards as TrialReward[]) : [];
  }, [trialRes]);

  const rewardAssets: AssetType[] = useMemo(
    () => rewards.map((r) => r.assetId),
    [rewards],
  );

  const walletBaseByAsset = useMemo(() => {
    const out: Partial<Record<AssetType, bigint>> = {};
    const mappings =
      meRes?.data?.assetMappings ?? meRes?.data?.data?.assetMappings;

    if (mappings && typeof mappings === "object") {
      for (const k of Object.keys(mappings)) {
        const asset = k as AssetType;
        const baseStr = mappings[k]?.amount ?? "0";
        try {
          out[asset] = BigInt(String(baseStr));
        } catch {
          out[asset] = BigInt(0);
        }
      }
    }
    return out;
  }, [meRes]);

  // ✅ schema + defaults are clean + memoed
  const schema = useMemo(
    () => makeTopUpSchema({ assets: rewardAssets, walletBaseByAsset }),
    [rewardAssets, walletBaseByAsset],
  );

  const defaultValues = useMemo(
    () => buildDefaultValues(rewardAssets),
    [rewardAssets],
  );

  const form = useForm<FormValues>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    formState: { isValid, isSubmitting },
    watch,
    reset,
  } = form;

  // reset when opening / trial changes
  useEffect(() => {
    if (!open) return;
    reset(defaultValues);
  }, [open, reset, defaultValues]);

  const values = watch();
  const anyNonZero = useMemo(
    () => calcAnyNonZero(values, rewardAssets),
    [values, rewardAssets],
  );

  const topUpRoute = isStandalone
    ? endpoints.standaloneTrail.topUp
    : endpoints.campaigns.trailTopUp;
  const getTrialByIdRoute = trialId
    ? isStandalone
      ? endpoints.standaloneTrail.getById(trialId)
      : endpoints.campaigns.getTrialById(trialId)
    : "";

  const { mutate: topUp, isPending } = useApiMutation<
    { trialId: string; assets: { assetId: AssetType; amount: string }[] },
    any
  >({
    route: topUpRoute,
    method: "PATCH",
    onSuccess: () => {
      if (trialId && getTrialByIdRoute) {
        queryClient.invalidateQueries({
          queryKey: [getTrialByIdRoute],
        });
      }
      if (isStandalone) {
        queryClient.invalidateQueries({
          queryKey: [endpoints.standaloneTrail.getAll],
        });
      }
      onClose();
      refetch();
      appToast.success("Successfully topped up rewards");
    },
  });

  const saving = isSubmitting || isPending;
  const loading = trialLoading || meLoading;
  console.log("trialRes?.data?.trial?.title", trialRes);
  const title = trialRes?.data?.data?.trial?.title ?? "";
  console.log("title", title);
  const onSubmit = (vals: FormValues) => {
    if (!trialId) return;

    const assets = rewardAssets
      .map((assetId) => {
        const parentStr = String(vals?.[assetId] ?? "0");
        const baseBi = toBaseBI(assetId, parentStr);
        if (baseBi <= BigInt(0)) return null;
        return { assetId, amount: baseBi.toString() };
      })
      .filter(Boolean) as { assetId: AssetType; amount: string }[];

    if (!assets.length) return;
    topUp({ trialId, assets });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-[#F2F3F5] shadow-xl border border-black/10 p-7 space-y-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-black">Top-up existing rewards</div>
            <h3 className="mt-1 text-lg font-semibold text-[#111] line-clamp-2">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={cn(
              "rounded-full px-4 py-1 text-sm font-semibold",
              saving
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-[#e7e5e5] hover:bg-[#EDEDED] text-[#111] border-t-2 border-black/10",
            )}
          >
            <X />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="px- space-y-7"
        >
          <div className="p-">
            {loading ? (
              <div className="text-sm text-black/60">Loading rewards…</div>
            ) : !rewards.length ? (
              <div className="text-sm text-black/60">
                No rewards found for this trail.
              </div>
            ) : (
              <div className="space-y-4">
                {rewards?.map((r) => {
                  const asset = r.assetId;
                  const spec = assetSpecs[asset];
                  const decimalsToShow = Math.min(spec?.decimal ?? 0, 6);

                  const distributedParent = toParentFixed(
                    asset,
                    r.currentDistribution ?? "0",
                    decimalsToShow,
                  );

                  const capParent = toParentFixed(
                    asset,
                    r.rewardAmountCap ?? "0",
                    decimalsToShow,
                  );

                  const walletBase = walletBaseByAsset[asset] ?? BigInt(0);
                  const walletParent = unwrapString(
                    amount({
                      op: "toParent",
                      assetId: asset,
                      value: walletBase.toString(),
                      output: "string",
                      fixed: decimalsToShow,
                      group: false,
                    }),
                    "0",
                  );

                  return (
                    <div
                      key={asset}
                      className="rounded-xl border border-[#C2C2C2] bg-white p-4 flex justify-between items-center gap-2"
                    >
                      <section className="flex items-center gap-3 min-w-[260px]">
                        <div className="h-20 w-20 flex items-center justify-center overflow-hidden">
                          {spec?.img ? (
                            <img
                              src={spec.img}
                              alt={spec.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <h1 className="font-medium text-[#111] text-lg">
                            {spec?.name ?? asset}
                          </h1>

                          <section className="mt-1 flex flex-col text-black text-xs">
                            <p className="tabular-nums">
                              {distributedParent}{" "}
                              <span className="text-neutral-500">
                                Reward Distributed
                              </span>
                            </p>
                            <p className="tabular-nums">
                              {capParent}{" "}
                              <span className="text-neutral-500">
                                Total Reward Cap
                              </span>
                            </p>
                          </section>
                        </div>
                      </section>

                      <section className="w-[260px] flex flex-col justify-between h-full gap-4">
                        <NumberField<FormValues>
                          form={form}
                          schema={schema}
                          name={asset}
                          label=""
                          placeholder="0"
                          decimalScale={spec?.decimal ?? 0}
                          helperText=""
                          showError
                        />
                        <p className="text-xs text-black/60">
                          You Have {walletParent} Remaining in Wallet
                        </p>
                      </section>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!anyNonZero || !isValid || saving || loading}
            className={cn(
              "w-full rounded-full py-4 text-sm font-semibold text-white transition",
              anyNonZero && isValid && !saving && !loading
                ? "bg-[#0EA5A5] hover:bg-[#0EA5A5]/80"
                : "bg-gray-300 cursor-not-allowed",
            )}
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
