// src/components/trails/modals/add-reward-modal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  useController,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  defaultPollValues,
  makeRewardsSchema,
  type RewardsForm,
} from "@/schema/create-user-poll";

// Assets (with decimals, names, symbols, images)
import {
  coinAssets,
  assetSpecs,
  type AssetType,
} from "@/utils/currency-assets/asset";

// Amount utils (facade + unwrap)
import { amount, unwrapString } from "@/utils/currency-assets/base";

import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { RewardsAccordion } from "@/components/rewards-accordion";

/** BASE → PARENT display (no grouping). */
function baseToParent(
  assetId: AssetType,
  baseVal: string | number,
  fixed?: number,
) {
  const useFixed = typeof fixed === "number";
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: useFixed ? false : true,
      fixed: useFixed ? Math.max(0, fixed) : undefined,
      group: false,
    }),
    "0",
  );
}

/** BASE → PARENT display (grouped). */
function baseToParentGrouped(
  assetId: AssetType,
  baseVal: string | number,
  fixed?: number,
) {
  const useFixed = typeof fixed === "number";
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: useFixed ? false : true,
      fixed: useFixed ? Math.max(0, fixed) : undefined,
      // group: true,
    }),
    "0",
  );
}

/** Convert PARENT input string → BASE number (allowUnsafe ok for UI) */
function parentToBaseNumber(assetId: AssetType, parentStr: string) {
  const n = amount({
    op: "toBase",
    assetId,
    value: parentStr,
    output: "number",
    allowUnsafeNumber: true,
  });
  return n.ok ? n.value : NaN;
}

/** Clamp/clean input: max 9 integer digits, max min(5, asset.decimal) fraction digits. */
function clampParentInput(
  assetId: AssetType,
  raw: string,
): { text: string; err: string } {
  const decimalsAllowed = Math.min(assetSpecs[assetId].decimal, 5);
  const MAX_INT = 9;

  const s = (raw ?? "").replace(/[^\d.]/g, "");
  if (s === "") return { text: "", err: "" };

  const parts = s.split(".");
  const iRaw = parts[0] ?? "";
  const fRawCombined = parts.slice(1).join("");
  const hasDotInRaw = s.includes(".");
  const trailingDot = hasDotInRaw && raw[raw.length - 1] === ".";

  let i = iRaw;
  let uiErr = "";
  if (i.length > MAX_INT) {
    i = i.slice(0, MAX_INT);
    uiErr = `Max ${MAX_INT} integer digits`;
  }

  let f = fRawCombined;
  if (decimalsAllowed === 0) {
    f = "";
  } else if (f.length > decimalsAllowed) {
    f = f.slice(0, decimalsAllowed);
    uiErr = uiErr
      ? `${uiErr}; max ${decimalsAllowed} decimal places`
      : `Max ${decimalsAllowed} decimal places`;
  }

  if (i === "" && (hasDotInRaw || trailingDot)) i = "0";

  let display = i;
  if (decimalsAllowed > 0) {
    if (trailingDot && f.length === 0) display = `${i}.`;
    else if (f.length > 0) display = `${i}.${f}`;
  }

  return { text: display, err: uiErr };
}

function limitsHint(assetId: AssetType): {
  maxInt: number;
  maxFrac: number;
  minStep: string;
} {
  const maxInt = 9;
  const maxFrac = Math.min(assetSpecs[assetId].decimal, 5);
  const minStep = maxFrac === 0 ? "1" : `0.${"0".repeat(maxFrac - 1)}1`;
  return { maxInt, maxFrac, minStep };
}

/* ---------------- Row component (unchanged UI, modal-friendly) ---------------- */
type RewardRowProps = {
  idx: number;
  form: UseFormReturn<RewardsForm>;
  getBalanceBase: (asset: AssetType) => number | string;
  highestLevel: number;
};

function RewardRow({
  idx,
  form,
  getBalanceBase,
  highestLevel = 1,
}: RewardRowProps) {
  const asset = useWatch({
    control: form.control,
    name: `rewards.${idx}.assetId`,
  }) as AssetType | undefined;

  const spec = asset ? assetSpecs[asset] : undefined;

  const capCtl = useController({
    name: `rewards.${idx}.rewardAmountCap`,
    control: form.control,
  });

  const amtCtl = useController({
    name: `rewards.${idx}.amount`,
    control: form.control,
  });

  const [capStr, setCapStr] = useState<string>("");
  const [amtStr, setAmtStr] = useState<string>("");

  const [capUiErr, setCapUiErr] = useState<string>("");
  const [amtUiErr, setAmtUiErr] = useState<string>("");

  const baseBal = asset ? getBalanceBase(asset) : 0;
  const parentBalDisplay = asset ? baseToParentGrouped(asset, baseBal) : "0";

  const limits = asset
    ? limitsHint(asset)
    : { maxInt: 9, maxFrac: 5, minStep: "—" };

  useEffect(() => {
    if (!asset) {
      setCapStr("");
      setAmtStr("");
      setCapUiErr("");
      setAmtUiErr("");
      return;
    }
    const capBase = Number(capCtl.field.value || 0);
    const amtBase = Number(amtCtl.field.value || 0);

    const capParent = capBase > 0 ? baseToParent(asset, capBase) : "";
    const amtParent = amtBase > 0 ? baseToParent(asset, amtBase) : "";

    const capClamped = clampParentInput(asset, capParent);
    const amtClamped = clampParentInput(asset, amtParent);

    setCapStr(capClamped.text);
    setAmtStr(amtClamped.text);
    setCapUiErr("");
    setAmtUiErr("");
  }, [asset, capCtl.field.value, amtCtl.field.value]);

  return (
    <div className="rounded-2xl bg-white p-4 border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
          {spec && (
            <>
              <img src={spec.img} alt="" className="h-4 w-4" />
              <span className="text-sm font-semibold">{spec.parent}</span>
              <span className="text-xs text-gray-500">{spec.parentSymbol}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <Label>Total tokens to be distributed</Label>
          {spec && (
            <span className="text-xs text-gray-500">
              Available:{" "}
              <span className="tabular-nums">{parentBalDisplay}</span>{" "}
              {spec.parentSymbol}
            </span>
          )}
        </div>

        <Input
          type="text"
          className="placeholder:text-xs"
          inputMode="decimal"
          placeholder={
            spec
              ? spec.decimal > 0
                ? `e.g. 100.${"0".repeat(
                    Math.min(1, Math.min(spec.decimal, 5)),
                  )}`
                : "e.g. 100"
              : "e.g. 100"
          }
          value={capStr}
          onChange={(e) => {
            if (!asset) return;
            const clamped = clampParentInput(asset, e.target.value);
            setCapStr(clamped.text);
            setCapUiErr(clamped.err);
            const base = parentToBaseNumber(asset, clamped.text);
            if (Number.isFinite(base)) capCtl.field.onChange(base);
          }}
          onBlur={(e) => {
            if (!asset) return;
            const s = (e.target.value ?? "").trim();
            if (s === "") {
              setCapStr("");
              setCapUiErr("");
              capCtl.field.onChange(0);
              return;
            }
            const clamped = clampParentInput(asset, s);
            const base = parentToBaseNumber(asset, clamped.text);
            if (Number.isFinite(base) && base > 0) {
              const pretty = baseToParent(asset, base);
              const final = clampParentInput(asset, pretty);
              setCapStr(final.text);
              setCapUiErr("");
              capCtl.field.onChange(base);
            }
          }}
        />

        {capUiErr && <p className="text-xs text-red-600">{capUiErr}</p>}
        {(form.formState.errors.rewards?.[idx]?.rewardAmountCap as any)
          ?.message && (
          <p className="text-xs text-red-600">
            {
              (form.formState.errors.rewards?.[idx]?.rewardAmountCap as any)
                .message
            }
          </p>
        )}
        {asset && Number(capCtl.field.value || 0) > Number(baseBal) && (
          <p className="text-xs text-red-600">
            You’re pledging more than your available balance
          </p>
        )}
        {asset && (
          <p className="text-[11px] text-gray-500">
            Max {limits.maxInt} integer digits • Max {limits.maxFrac} decimal
            places • Min step {limits.minStep} {spec?.parentSymbol}
          </p>
        )}
      </div>

      <div className="grid gap-1">
        <Label>Set token reward per user</Label>

        <Input
          type="text"
          className="placeholder:text-xs"
          inputMode="decimal"
          placeholder={
            spec
              ? spec.decimal > 0
                ? `e.g. 1.${"0".repeat(Math.min(1, Math.min(spec.decimal, 5)))}`
                : "e.g. 1"
              : "e.g. 1"
          }
          value={amtStr}
          onChange={(e) => {
            if (!asset) return;
            const clamped = clampParentInput(asset, e.target.value);
            setAmtStr(clamped.text);
            setAmtUiErr(clamped.err);
            const base = parentToBaseNumber(asset, clamped.text);
            if (Number.isFinite(base)) amtCtl.field.onChange(base);
          }}
          onBlur={(e) => {
            if (!asset) return;
            const s = (e.target.value ?? "").trim();
            if (s === "") {
              setAmtStr("");
              setAmtUiErr("");
              amtCtl.field.onChange(0);
              return;
            }
            const clamped = clampParentInput(asset, s);
            const base = parentToBaseNumber(asset, clamped.text);
            if (Number.isFinite(base) && base > 0) {
              const pretty = baseToParent(asset, base);
              const final = clampParentInput(asset, pretty);
              setAmtStr(final.text);
              setAmtUiErr("");
              amtCtl.field.onChange(base);
            }
          }}
        />

        {amtUiErr && <p className="text-xs text-red-600">{amtUiErr}</p>}
        {(form.formState.errors.rewards?.[idx]?.amount as any)?.message && (
          <p className="text-xs text-red-600">
            {(form.formState.errors.rewards?.[idx]?.amount as any).message}
          </p>
        )}
        {asset && (
          <p className="text-[11px] text-gray-500">
            Max {limits.maxInt} integer digits • Max {limits.maxFrac} decimal
            places • Min step {limits.minStep} {spec?.parentSymbol}
          </p>
        )}
      </div>

      <Controller
        control={form.control}
        name={`rewards.${idx}.rewardType`}
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            className="flex gap-6 mt-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="max" id={`max-${idx}`} />
              <Label htmlFor={`max-${idx}`}>MAX. Votes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="min" id={`min-${idx}`} />
              <Label htmlFor={`min-${idx}`}>MIN. Votes</Label>
            </div>
          </RadioGroup>
        )}
      />

      {form.watch(`rewards.${idx}.assetId`) && (
        <RewardsAccordion
          highestLevel={highestLevel ?? 1}
          rewardType={form.watch(`rewards.${idx}.rewardType`)}
          perUserReward={form.watch(`rewards.${idx}.amount`)}
          asset={form.watch(`rewards.${idx}.assetId`) as AssetType}
          size="sm"
        />
      )}
    </div>
  );
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

export default function AddTrailRewardsModal({
  onSaved,
  initialRewards,
  initialExpireRewardAt,
}: {
  onClose: () => void;
  onSaved: (v: {
    rewards: Array<{
      id: string;
      assetId: AssetType;
      rewardAmountCap: number;
      amount: number;
      rewardType: "min" | "max";
    }>;
    expireRewardAt?: string;
  }) => void;

  initialRewards?: RewardsForm["rewards"];
  initialExpireRewardAt?: string;
}) {
  const { data: meRaw } = useApiQuery(endpoints.profile.me);
  const filteredMe = useMemo(() => meRaw?.data?.data ?? {}, [meRaw]);

  const meAssetMap =
    filteredMe?.assetMappings ??
    ({} as Record<string, { amount: number | string }>);

  const getBalanceBase = (asset: AssetType) =>
    (meAssetMap?.[asset]?.amount as number | string | undefined) ?? 0;

  const form = useForm<RewardsForm>({
    resolver: zodResolver(makeRewardsSchema(meAssetMap)),
    defaultValues: useMemo(
      () => ({
        rewards: initialRewards ?? defaultPollValues.rewards,
        expireRewardAt: initialExpireRewardAt ?? "",
      }),
      [initialRewards, initialExpireRewardAt],
    ),
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
  });

  const { fields, remove, insert } = useFieldArray({
    control: form.control,
    name: "rewards",
  });

  const [open, setOpen] = useState(false);

  const selectedAssets =
    useWatch({
      control: form.control,
      name: "rewards",
    })?.map((r) => r.assetId as AssetType) ?? [];

  const availableAssets = useMemo<AssetType[]>(
    () => coinAssets.filter((a) => !selectedAssets.includes(a)),
    [selectedAssets],
  );

  const addCoin = (asset: AssetType) => {
    if (selectedAssets.includes(asset)) {
      setOpen(false);
      return;
    }
    insert(
      0,
      {
        assetId: asset,
        rewardAmountCap: 0 as unknown as number,
        amount: 0 as unknown as number,
        rewardType: "max",
      },
      { shouldFocus: true },
    );
    form.trigger("rewards");
    setOpen(false);
  };

  const onSubmit = (values: RewardsForm) => {
    // values.rewards are BASE ints already
    const out = values.rewards.map((r) => ({
      id: uid(),
      assetId: r.assetId as AssetType,
      rewardAmountCap: Number(r.rewardAmountCap || 0),
      amount: Number(r.amount || 0),
      rewardType: r.rewardType,
    }));

    onSaved({
      rewards: out,
      expireRewardAt: values.expireRewardAt
        ? String(values.expireRewardAt)
        : undefined,
    });
  };

  const onInvalid = () => {
    const errs = form.formState.errors;
    if (Array.isArray(errs.rewards)) {
      const firstIdx = errs.rewards.findIndex(
        (e) => e?.rewardAmountCap || e?.amount || e?.rewardType || e?.assetId,
      );
      if (firstIdx >= 0) {
        setTimeout(
          () => form.setFocus(`rewards.${firstIdx}.rewardAmountCap`),
          0,
        );
      }
    }
  };

  return (
    <div className="w-[500px] max-w-[95vw] bg-[#F2F3F5] rounded-2xl p-4 max-h-[90vh] overflow-auto relative">
      <h3 className="font-semibold mb-3">Add Rewards</h3>

      {/* Balances strip */}
      <div className="rounded-xl bg-white border shadow-sm p-3">
        <div className="text-xs text-gray-500 font-medium mb-2">
          Your balances
        </div>
        <div className="flex flex-wrap gap-2">
          {coinAssets.map((a) => {
            const spec = assetSpecs[a];
            const baseVal = getBalanceBase(a);
            const parentDisplay = baseToParentGrouped(a, baseVal, 2);
            return (
              <div
                key={a}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1"
                title={`${spec.name} balance`}
              >
                <img src={spec.img} alt="" className="h-4 w-4" />
                <span className="text-xs font-semibold tabular-nums">
                  {parentDisplay}
                </span>
                <span className="text-[10px] text-gray-600">
                  {spec.parentSymbol}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add coin dropdown */}
      <div className="rounded-xl bg-white border shadow-sm p-3 mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Add coin</span>

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild className="relative">
              <Button
                variant="outline"
                size="sm"
                disabled={availableAssets.length === 0}
              >
                +
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="min-w-56 h-52 xl:h-60 absolute top-0 right-1/2 z-[100] overflow-y-scroll"
            >
              {availableAssets.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  All coins added
                </div>
              ) : (
                availableAssets.map((asset) => {
                  const spec = assetSpecs[asset];
                  const baseBal = getBalanceBase(asset);
                  const parentDisplay = baseToParentGrouped(asset, baseBal);
                  const noBal = String(baseBal) === "0" || Number(baseBal) <= 0;

                  return (
                    <DropdownMenuItem
                      key={asset}
                      onClick={() => addCoin(asset)}
                      disabled={noBal}
                    >
                      <div className="flex items-center gap-2">
                        <img src={spec.img} alt="" className="h-4 w-4" />
                        <span className="text-sm">{spec.parent}</span>
                      </div>

                      <div className="ml-auto text-right">
                        <div className="text-[11px] text-gray-700">
                          {parentDisplay}{" "}
                          <span className="text-gray-500">
                            {spec.parentSymbol}
                          </span>
                        </div>
                        {noBal && (
                          <div className="text-[10px] text-red-600">
                            No balance
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Reward cards */}
      <div className="space-y-4 mt-4">
        {fields?.map((field, idx) => (
          <div key={field.id} className="space-y-2">
            <RewardRow
              idx={idx}
              form={form}
              getBalanceBase={getBalanceBase}
              highestLevel={filteredMe?.highestLevel ?? 1}
            />

            <div className="flex justify-end -mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (fields.length <= 1) return;
                  remove(idx);
                  form.trigger("rewards");
                }}
                disabled={fields.length <= 1}
                title={
                  fields.length <= 1
                    ? "At least one reward is required"
                    : undefined
                }
              >
                Delete reward
              </Button>
            </div>
          </div>
        ))}
      </div>

      {typeof (form.formState.errors.rewards as any)?.message === "string" && (
        <p className="text-xs text-red-600 mt-2">
          {(form.formState.errors.rewards as any).message}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center justify-end gap-3 w-full">
        <Button
          className="bg-blue hover:bg-blue/70 w-full rounded-full text-xl py-7"
          onClick={form.handleSubmit(onSubmit, onInvalid)}
          disabled={!form.formState.isValid || form.formState.isSubmitting}
        >
          Save
        </Button>
        {/* <Button
          className="bg-blue hover:bg-blue/70 w-full rounded-full text-xl py-7"
          onClick={() => navigate("/")}
        >
          Buy
        </Button> */}
      </div>
    </div>
  );
}
