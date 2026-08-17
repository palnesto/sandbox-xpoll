import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useForm,
  useFieldArray,
  Controller,
  useController,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import CreatePollLayout from "@/layouts/create-poll-layout";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock3, X } from "lucide-react";

import { useAddPollFormStore } from "@/stores/addUserPoll.store";
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
import { Switch } from "@/components/ui/switch";
import {
  MAX_REWARD_EXPIRY,
  MIN_REWARD_EXPIRY,
  toUTC,
  validateRewardExpiry,
} from "@/utils/time";
import dayjs from "dayjs";

/* -------------------------------------------------------------------------------------------------
 * Small utils
 * -----------------------------------------------------------------------------------------------*/
function isoToDate(iso?: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}
function dateToLocalIso(d?: Date): string | "" {
  if (!d || isNaN(d.getTime())) return "";
  // Store as local "YYYY-MM-DDTHH:mm:ss" (no timezone)
  return dayjs(d).format("YYYY-MM-DDTHH:mm:ss");
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** BASE → PARENT display (no grouping). Trims trailing zeros by default.
 *  Pass `fixed` to force a specific number of decimals.
 *  Examples:
 *    baseToParent(a, 123400000, 2) -> "1.23"
 *    baseToParent(a, 1000000)      -> "1"
 */
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
      // If fixed is set, we don't trim; we clamp digits using `fixed`.
      trim: useFixed ? false : true,
      fixed: useFixed ? Math.max(0, fixed) : undefined,
      group: false,
    }),
    "0",
  );
}

/** BASE → PARENT display (grouped). Trims trailing zeros by default.
 *  Pass `fixed` to force a specific number of decimals.
 *  Examples:
 *    baseToParentGrouped(a, 4123234..., 3) -> "4.123"
 *    baseToParentGrouped(a, 4...)          -> "4"
 */
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

/** Convert PARENT input string → BASE number (JS number; allowUnsafe ok for UI) */
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

/** Clamp/clean user input to: max 9 integer digits, max min(5, asset.decimal) fraction digits.
 *  Returns { text, err } where err is a user-facing error (string) or "" when OK.
 */
function clampParentInput(
  assetId: AssetType,
  raw: string,
): { text: string; err: string } {
  const decimalsAllowed = Math.min(assetSpecs[assetId].decimal, 5);
  const MAX_INT = 9;

  // Remove all but digits and dot. Keep at most one dot.
  const s = (raw ?? "").replace(/[^\d.]/g, "");
  if (s === "") return { text: "", err: "" };

  const parts = s.split(".");
  const iRaw = parts[0] ?? "";
  const fRawCombined = parts.slice(1).join(""); // collapse extra dots to a single fractional stream
  const hasDotInRaw = s.includes(".");
  const trailingDot = hasDotInRaw && raw[raw.length - 1] === ".";

  // integer clamp
  let i = iRaw;
  let uiErr = "";
  if (i.length > MAX_INT) {
    i = i.slice(0, MAX_INT);
    uiErr = `Max ${MAX_INT} integer digits`;
  }

  // fraction clamp
  let f = fRawCombined;
  if (decimalsAllowed === 0) {
    f = "";
  } else if (f.length > decimalsAllowed) {
    f = f.slice(0, decimalsAllowed);
    uiErr = uiErr
      ? `${uiErr}; max ${decimalsAllowed} decimal places`
      : `Max ${decimalsAllowed} decimal places`;
  }

  // If user typed "." first, make it "0."
  if (i === "" && (hasDotInRaw || trailingDot)) {
    i = "0";
  }

  // Rebuild display string
  let display = i;
  if (decimalsAllowed > 0) {
    if (trailingDot && f.length === 0) {
      display = `${i}.`;
    } else if (f.length > 0) {
      display = `${i}.${f}`;
    }
  }

  return { text: display, err: uiErr };
}

/** Friendly hint strings per asset/field */
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

/* -------------------------------------------------------------------------------------------------
 * DateTimePicker (shadcn calendar + time inputs)
 * -----------------------------------------------------------------------------------------------*/
type DateTimePickerProps = {
  value: string | undefined;
  onChange: (next: string | "") => void;
  disabled?: boolean;
};

function DateTimePicker({ value, onChange, disabled }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const date = isoToDate(value);
  const hours = date ? date.getHours() : 0;
  const minutes = date ? date.getMinutes() : 0;

  const handleSelectDate = (d?: Date) => {
    if (!d) return;
    const base = new Date(d);
    const h = date ? date.getHours() : 0;
    const m = date ? date.getMinutes() : 0;
    base.setHours(h, m, 0, 0);
    onChange(dateToLocalIso(base));
  };

  const updateTime = (h: number, m: number) => {
    const base = date ? new Date(date) : new Date();
    base.setSeconds(0, 0);
    base.setHours(Math.min(23, Math.max(0, h)), Math.min(59, Math.max(0, m)));
    onChange(dateToLocalIso(base));
  };

  const clear = () => onChange("");

  // disable all past days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="justify-start w-[240px]"
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? date.toLocaleDateString() : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelectDate}
              disabled={(d) => d < today}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Time inputs */}
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-gray-500" />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={23}
            className="w-16 placeholder:text-xs"
            value={pad2(hours)}
            onChange={(e) => updateTime(Number(e.target.value || 0), minutes)}
            disabled={disabled}
          />
          :
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            className="w-16 placeholder:text-xs"
            value={pad2(minutes)}
            onChange={(e) => updateTime(hours, Number(e.target.value || 0))}
            disabled={disabled}
          />
        </div>

        {value ? (
          <Button
            type="button"
            variant="outline"
            onClick={clear}
            disabled={disabled}
            title="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-gray-500">
        Optional. If set, users can only claim rewards until this date & time.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Row component with stable local-string state for both inputs + inline UI errors
 * -----------------------------------------------------------------------------------------------*/
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
  // Watch assetId for this row
  const asset = useWatch({
    control: form.control,
    name: `rewards.${idx}.assetId`,
  }) as AssetType | undefined;
  const spec = asset ? assetSpecs[asset] : undefined;

  // Controllers for BASE fields
  const capCtl = useController({
    name: `rewards.${idx}.rewardAmountCap`,
    control: form.control,
  });
  const amtCtl = useController({
    name: `rewards.${idx}.amount`,
    control: form.control,
  });

  // Local parent strings (what the user is actively typing)
  const [capStr, setCapStr] = useState<string>("");
  const [amtStr, setAmtStr] = useState<string>("");

  // Inline UI error strings (not resolver errors)
  const [capUiErr, setCapUiErr] = useState<string>("");
  const [amtUiErr, setAmtUiErr] = useState<string>("");

  // Balance (BASE) and display (PARENT)
  const baseBal = asset ? getBalanceBase(asset) : 0;
  // NOTE: pass a number to third arg to enforce fixed decimals everywhere it’s shown.
  // e.g. baseToParentGrouped(asset, baseBal, 3)
  const parentBalDisplay = asset ? baseToParentGrouped(asset, baseBal) : "0";

  // Limits hint
  const limits = asset
    ? limitsHint(asset)
    : { maxInt: 9, maxFrac: 5, minStep: "—" };

  // Initialize/keep local strings in sync when BASE or asset changes
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
    // Trims trailing zeros for the input’s normalized display
    const capParent = capBase > 0 ? baseToParent(asset, capBase) : "";
    const amtParent = amtBase > 0 ? baseToParent(asset, amtBase) : "";
    // Clamp to our UI limits (9 int / up to 5 frac) when syncing from BASE
    const capClamped = clampParentInput(asset, capParent);
    const amtClamped = clampParentInput(asset, amtParent);
    setCapStr(capClamped.text);
    setAmtStr(amtClamped.text);
    setCapUiErr("");
    setAmtUiErr("");
  }, [asset, capCtl.field.value, amtCtl.field.value]);

  // Render
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

      {/* Total tokens to be distributed */}
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
                  )}` // show at least one decimal digit in example when decimals > 0
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
            if (Number.isFinite(base)) {
              capCtl.field.onChange(base);
            }
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
              // normalize with trimmed decimals
              const pretty = baseToParent(asset, base /*, optional fixed */);
              const final = clampParentInput(asset, pretty); // ensure still within limits
              setCapStr(final.text);
              setCapUiErr("");
              capCtl.field.onChange(base);
            } else {
              // Re-sync from current BASE
              const pretty =
                Number(capCtl.field.value || 0) > 0
                  ? baseToParent(
                      asset,
                      capCtl.field.value /*, optional fixed */,
                    )
                  : "";
              const final = clampParentInput(asset, pretty);
              setCapStr(final.text);
              setCapUiErr(final.err);
            }
          }}
        />

        {/* UI-level error (red) */}
        {capUiErr && <p className="text-xs text-red-600">{capUiErr}</p>}

        {/* Resolver/form error (red) */}
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
        {/* Limits hint (muted) */}
        {asset && (
          <p className="text-[11px] text-gray-500">
            Max {limits.maxInt} integer digits • Max {limits.maxFrac} decimal
            places • Min step {limits.minStep} {spec?.parentSymbol}
          </p>
        )}
      </div>

      {/* Per user reward */}
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
            if (Number.isFinite(base)) {
              amtCtl.field.onChange(base);
            }
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
              const pretty = baseToParent(asset, base /*, optional fixed */);
              const final = clampParentInput(asset, pretty);
              setAmtStr(final.text);
              setAmtUiErr("");
              amtCtl.field.onChange(base);
            } else {
              const pretty =
                Number(amtCtl.field.value || 0) > 0
                  ? baseToParent(
                      asset,
                      amtCtl.field.value /*, optional fixed */,
                    )
                  : "";
              const final = clampParentInput(asset, pretty);
              setAmtStr(final.text);
              setAmtUiErr(final.err);
            }
          }}
        />

        {/* UI-level error (red) */}
        {amtUiErr && <p className="text-xs text-red-600">{amtUiErr}</p>}

        {/* Resolver/form error (red) */}
        {(form.formState.errors.rewards?.[idx]?.amount as any)?.message && (
          <p className="text-xs text-red-600">
            {(form.formState.errors.rewards?.[idx]?.amount as any).message}
          </p>
        )}

        {/* Limits hint (muted) */}
        {asset && (
          <p className="text-[11px] text-gray-500">
            Max {limits.maxInt} integer digits • Max {limits.maxFrac} decimal
            places • Min step {limits.minStep} {spec?.parentSymbol}
          </p>
        )}
      </div>

      {/* Reward type */}
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
      {/* Rewards Accordion */}
      {form.watch(`rewards.${idx}.assetId`) && (
        <RewardsAccordion
          highestLevel={highestLevel ?? 1}
          rewardType={form.watch(`rewards.${idx}.rewardType`)}
          perUserReward={form.watch(`rewards.${idx}.amount`)}
          // asset="xDrop" // or whichever AssetType
          asset={form.watch(`rewards.${idx}.assetId`) as AssetType}
          size="sm"
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Page component
 * -----------------------------------------------------------------------------------------------*/
export default function AddPollsRewards() {
  // Fetch me to get balances (BASE values from API)
  const { data: meRaw } = useApiQuery(endpoints.profile.me);
  const filteredMe = useMemo(() => meRaw?.data?.data ?? {}, [meRaw]);
  const meAssetMap =
    filteredMe?.assetMappings ??
    ({} as Record<string, { amount: number | string }>);

  // raw BASE balance as returned from API (number or string)
  const getBalanceBase = (asset: AssetType) =>
    (meAssetMap?.[asset]?.amount as number | string | undefined) ?? 0;

  const navigate = useNavigate();
  const { data, setPartial } = useAddPollFormStore();

  const [expiryOn, setExpiryOn] = useState<boolean>(
    () => !!data.expireRewardAt,
  );
  const form = useForm<RewardsForm>({
    resolver: zodResolver(makeRewardsSchema(meAssetMap)), // ✅ pass balances
    defaultValues: useMemo(
      () => ({
        rewards: data.rewards ?? defaultPollValues.rewards,
        expireRewardAt: data.expireRewardAt ?? "",
      }),
      [data],
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
        // Store BASE in form (numbers). Start at 0 so the inputs show empty.
        rewardAmountCap: 0 as unknown as number,
        amount: 0 as unknown as number,
        rewardType: "max",
      },
      { shouldFocus: true },
    );
    form.trigger("rewards");
    setOpen(false);
  };

  // Watch expiry field for live validation
  const expireValue = useWatch({
    control: form.control,
    name: "expireRewardAt",
  });

  // Live error message using shared validator; blank string = no error
  const expiryErrorMsg = useMemo(() => {
    if (!expiryOn) return "";
    const res = validateRewardExpiry(expireValue ? toUTC(expireValue) : "");
    return res === true ? "" : res;
  }, [expiryOn, expireValue]);

  useEffect(() => {
    if (!expiryOn) {
      form.setValue("expireRewardAt", undefined, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.clearErrors("expireRewardAt");
    }
  }, [expiryOn, form]);

  const onSubmit = (values: RewardsForm) => {
    // Values are already BASE (integers) in form state.
    setPartial({
      ...data,
      rewards: values.rewards,
      expireRewardAt:
        expiryOn && values.expireRewardAt
          ? toUTC(values.expireRewardAt) // convert local → UTC for payload/store
          : undefined,
    });
    navigate("/add-polls/preview");
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
        return;
      }
    }

    if (typeof (errs.rewards as any)?.message === "string") {
      return;
    }

    if (errs.expireRewardAt) {
      setTimeout(() => form.setFocus("expireRewardAt"), 0);
    }
  };

  return (
    <CreatePollLayout
      title="Creating poll"
      currentStep={3}
      totalSteps={3}
      nextLabel="Next"
      nextDisabled={
        !form.formState.isDirty ||
        !form.formState.isValid ||
        form.formState.isSubmitting ||
        (expiryOn && !!expiryErrorMsg)
      }
      onNext={form.handleSubmit(onSubmit, onInvalid)}
    >
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Add Rewards</h3>

      {/* Balances strip (display in PARENT; trimmed by default) */}
      <div className="rounded-xl bg-white border shadow-sm p-3">
        <div className="text-xs text-gray-500 font-medium mb-2">
          Your balances
        </div>
        <div className="flex flex-wrap gap-2">
          {coinAssets.map((a) => {
            const spec = assetSpecs[a];
            const baseVal = getBalanceBase(a);
            // To force fixed decimals everywhere, pass third arg, e.g. baseToParentGrouped(a, baseVal, 3)
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
                <span className="text-[10px] text-gray-600">{spec.parent}</span>
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
            <DropdownMenuTrigger asChild>
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
              className="min-w-56 max-h-72 overflow-y-auto"
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
        {fields?.map((field, idx) => {
          return (
            <div key={field.id} className="space-y-2">
              <RewardRow
                idx={idx}
                form={form}
                getBalanceBase={getBalanceBase}
                highestLevel={filteredMe?.highestLevel ?? 1}
              />
              {/* Keep Delete and header controls in parent to access fieldArray's remove */}
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
          );
        })}
      </div>

      {typeof (form.formState.errors.rewards as any)?.message === "string" && (
        <p className="text-xs text-red-600">
          {(form.formState.errors.rewards as any).message}
        </p>
      )}

      {/* Expire reward at (optional) — shadcn DateTimePicker */}
      <div className="rounded-xl bg-white border shadow-sm p-4 mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Add expiration</Label>
            <p className="text-xs text-gray-500">
              If enabled, users can only claim rewards until the chosen date &
              time. (Min {MIN_REWARD_EXPIRY.labelShort}, Max{" "}
              {MAX_REWARD_EXPIRY.labelShort})
            </p>
          </div>
          <Switch
            checked={expiryOn}
            onCheckedChange={(v) => setExpiryOn(!!v)}
            disabled={form.formState.isSubmitting}
            aria-label="Toggle reward expiration"
          />
        </div>

        {expiryOn ? (
          <Controller
            control={form.control}
            name="expireRewardAt"
            rules={{
              validate: (val) => {
                const res = validateRewardExpiry(val ? toUTC(val) : "");
                return res === true ? true : res;
              },
            }}
            render={({ field }) => (
              <div className="space-y-2">
                <DateTimePicker
                  value={field.value || ""}
                  onChange={(next) => field.onChange(next)}
                  disabled={form.formState.isSubmitting}
                />
                {!form.formState.errors.expireRewardAt &&
                  expiryOn &&
                  expiryErrorMsg && (
                    <p className="text-xs text-red-600">{expiryErrorMsg}</p>
                  )}

                {/* 
          // Optional description (commented)
          // 1) Uncomment the import for Textarea at the top.
          // 2) Add "expireRewardNote?: string" to your zod schema & store if you want to persist it.
          <div className="space-y-1">
            <Label htmlFor="expireRewardNote" className="text-xs text-gray-600">
              Expiration note (optional)
            </Label>
            <Textarea
              id="expireRewardNote"
              placeholder="e.g., Rewards expire after the match ends"
              rows={2}
              {...form.register("expireRewardNote")}
            />
          </div>
          */}
              </div>
            )}
          />
        ) : (
          <p className="text-xs text-gray-500">
            No expiration — rewards do not expire.
          </p>
        )}
      </div>
    </CreatePollLayout>
  );
}
