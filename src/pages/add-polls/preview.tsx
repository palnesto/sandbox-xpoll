// src/pages/add-polls/preview.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { useAddPollFormStore } from "@/stores/addUserPoll.store";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";

import BackButton from "@/components/commons/back-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

import {
  assetSpecs,
  coinAssets,
  type AssetType,
} from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";

import {
  ADD_POLL_PAGE_PATHS,
  basicInfoSchema,
  optionsSchema,
  pollSchema,
  rewardsSchema,
} from "@/schema/create-user-poll";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import CommonButton from "@/components/commons/CommonButton";
import {
  dateTimeFormat,
  formatRelativeFromNow,
  MAX_REWARD_EXPIRY,
  MIN_REWARD_EXPIRY,
  userZone,
  utcToUser,
  validateRewardExpiry,
} from "@/utils/time";
import { heightStyles } from "@/styles";
import { RichTextPreview } from "@/components/commons/editor/preview";
import { ViewAllButton } from "@/utils/view-all-button";

// BASE → PARENT string (grouped, trimmed by default).
// Pass `fixed` to force a specific number of decimals.
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
      group: true,
    }),
    "0",
  );
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [breakpoint]);

  return isMobile;
}

function formatExpiry(dt?: string | null) {
  if (!dt) return null;
  try {
    const d = utcToUser(dt, userZone);
    return d.isValid() ? d.format(dateTimeFormat) : null;
  } catch {
    return null;
  }
}

function extractYouTubeId(input: string): string {
  const s = input.trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{10,}$/i.test(s) && !s.includes("http")) return s;

  let url: URL | null = null;
  try {
    url = new URL(s);
  } catch {
    return s;
  }

  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || s;
  }
  if (url.hostname.includes("youtube.com")) {
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIdx = parts.findIndex((p) => p === "embed");
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
  }
  return s;
}

function isDataUrl(s: string) {
  return typeof s === "string" && s.startsWith("data:");
}

async function dataUrlToFile(
  dataUrl: string,
  filename = "upload.png",
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

/* ------------------------------------------------------------------------------------------------- */
/* Presentational Bits */
/* ------------------------------------------------------------------------------------------------- */

function RewardsStrip({
  rewards,
  showField = "amount",
  fixed,
}: {
  rewards: Array<{
    assetId: AssetType;
    amount?: number | string;
    rewardAmountCap?: number | string;
  }>;
  showField?: "amount" | "rewardAmountCap";
  /** Optional: force a fixed number of fraction digits when displaying */
  fixed?: number;
}) {
  return (
    <>
      <p className="text-[11px] font-semibold text-gray-500">
        {showField === "rewardAmountCap" ? "TOTAL REWARDS PLEDGED" : "REWARDS"}
      </p>
      <div className="mt-2 flex items-center gap-5 overflow-x-auto">
        {(rewards || []).map((r, i) => {
          const spec = assetSpecs[r.assetId];
          const baseVal = (r as any)?.[showField] ?? 0;
          const parentDisplay = baseToParentGrouped(r.assetId, baseVal, fixed);
          return (
            <div key={`${r.assetId}-${i}`} className="flex items-end gap-2">
              {spec?.img && (
                <span>
                  <img src={spec.img} alt="" className="h-5 w-5" />
                </span>
              )}
              <div className="flex gap-1 items-end">
                <div className="mt-1 text-[11px] tabular-nums font-semibold">
                  {parentDisplay}
                </div>
                <div className="mt-1 text-[10px] text-gray-600">
                  {spec?.parentSymbol ?? r.assetId}
                </div>
              </div>
            </div>
          );
        })}
        {!rewards?.length && (
          <div className="text-xs text-gray-500">No rewards added</div>
        )}
      </div>
    </>
  );
}

function ExpiryRow({ expireRewardAt }: { expireRewardAt?: string }) {
  const absolute = formatExpiry(expireRewardAt);
  const relative = formatRelativeFromNow(expireRewardAt) || "";
  if (!absolute) return null;
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
      <span className="text-[11px] font-semibold text-gray-600">
        Rewards expire:
      </span>
      <span className="text-[11px] text-gray-800">{absolute}</span>
      {relative && (
        <span className="text-[11px] text-gray-500">({relative})</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------- */
/* Main */
/* ------------------------------------------------------------------------------------------------- */

export default function AddPollsPreview() {
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const queryClient = useQueryClient();

  const { data, reset } = useAddPollFormStore();

  // Get balances (BASE) from profile API
  const { data: meData } = useApiQuery(endpoints.profile.me);
  const me = (meData as any)?.data?.data;

  // Make a typed BASE balance map keyed by AssetType
  const balances: Record<AssetType, number | string> = useMemo(() => {
    const m = me?.assetMappings ?? {};
    return coinAssets.reduce(
      (acc, assetId) => {
        acc[assetId] = m?.[assetId]?.amount ?? 0;
        return acc;
      },
      {} as Record<AssetType, number | string>,
    );
  }, [me]);

  const filteredmeData = useMemo(() => me?.profile ?? [], [me]);

  // Over-pledge detection (compare in BASE; render in PARENT)
  const pledgeIssues = useMemo(() => {
    if (!data || !data.rewards) return [];
    return (data.rewards || [])
      .map((r: any) => {
        const assetId = r.assetId as AssetType;
        const balanceBase = balances[assetId] ?? 0;
        const pledgedBase = Number(r.rewardAmountCap ?? 0);
        return {
          assetId,
          pledgedBase,
          balanceBase,
          exceeds:
            Number.isFinite(pledgedBase) &&
            pledgedBase > Number(balanceBase ?? 0),
        };
      })
      .filter((i) => i.exceeds);
  }, [data, balances]);

  const expiryErrorMsg = useMemo(() => {
    const s = data?.expireRewardAt; // stored as UTC from previous step
    if (!s) return "";
    const res = validateRewardExpiry(s);
    return res === true ? "" : res;
  }, [data?.expireRewardAt]);

  const expiryInvalid = !!expiryErrorMsg;

  const [open, setOpen] = useState(false);

  const { mutate: createPoll, isPending: publishing } = useApiMutation<
    any,
    { success: boolean; pollId: string }
  >({
    route: endpoints.poll.createPolls,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [endpoints.poll.myPolls.getAllMyPolls],
      });
      reset();
      navigate("/my-polls");
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();

  // quick helper to detect any over-pledge before we do uploads or server call
  function findOverPledges(rewards: any[]) {
    const issues: Array<{
      assetId: AssetType;
      pledgedBase: number;
      balanceBase: number | string;
    }> = [];
    for (const r of rewards || []) {
      const assetId = r.assetId as AssetType;
      const bal = balances[assetId] ?? 0;
      const pledged = Number(r.rewardAmountCap ?? 0);
      if (Number.isFinite(pledged) && pledged > Number(bal ?? 0)) {
        issues.push({ assetId, pledgedBase: pledged, balanceBase: bal });
      }
    }
    return issues;
  }

  const asset = data.resourceAssets?.[0];
  let src: string | null = null;

  if (asset?.type === "image") {
    const v = asset.value;
    src =
      v instanceof File
        ? URL.createObjectURL(v)
        : typeof v === "string"
          ? v // supports data: URLs and http(s) URLs
          : null;
  }

  // Normalize resource assets (single entry) for final payload
  async function normalizeResourceAssets(raw: any[] | undefined) {
    const arr = (raw ?? []).slice(0, 1);
    if (!arr.length) return [];

    const a = arr[0];
    if (a?.type === "youtube") {
      const id = extractYouTubeId(String(a.value ?? ""));
      return id ? [{ type: "youtube", value: id }] : [];
    }

    if (a?.type === "image") {
      const val = a.value as string | File | undefined;

      if (typeof val === "string") {
        if (isDataUrl(val)) {
          const file = await dataUrlToFile(val, "upload.png");
          const url = await uploadImage(file);
          return url ? [{ type: "image", value: url }] : [];
        }
        if (/^https?:\/\//i.test(val)) {
          return [{ type: "image", value: val }];
        }
        return [];
      }

      if (val instanceof File) {
        const url = await uploadImage(val);
        return url ? [{ type: "image", value: url }] : [];
      }
    }

    return [];
  }

  const handleConfirm = async () => {
    if (pledgeIssues.length) {
      return;
    }
    // 2) Normalize media (may upload image if needed)
    const normalizedResources = await normalizeResourceAssets(
      data.resourceAssets,
    );

    // 3) Validate full payload against final zod
    const normalizedPayload = {
      ...data,
      resourceAssets: normalizedResources,
    };

    const sanitized = pollSchema.safeParse(normalizedPayload);
    if (!sanitized.success) {
      const p1 = basicInfoSchema.safeParse(data);
      if (!p1.success) {
        if (import.meta.env.VITE_MODE === "local") {
          console.log("p1", p1);
        }
        navigate(ADD_POLL_PAGE_PATHS.basicInfo);
        return;
      }
      const p2 = optionsSchema.safeParse(data);
      if (!p2.success) {
        if (import.meta.env.VITE_MODE === "local") {
          console.log("p2", p2);
        }
        navigate(ADD_POLL_PAGE_PATHS.options);
        return;
      }
      const p3 = rewardsSchema.safeParse(data);
      if (!p3.success) {
        if (import.meta.env.VITE_MODE === "local") {
          console.log("p3", p3);
        }
        navigate(ADD_POLL_PAGE_PATHS.rewards);
        return;
      }
      return;
    }
    {
      const s = data?.expireRewardAt; // UTC in store
      if (s !== undefined && s !== null && s !== "") {
        const res = validateRewardExpiry(s);
        if (res !== true) {
          if (import.meta.env.VITE_MODE === "local") {
            console.log("invalid expiry:", res, s);
          }
          navigate(ADD_POLL_PAGE_PATHS.rewards);
          return;
        }
      }
    }
    const payload = sanitized.data;
    createPoll(payload);
  };
  const busy = publishing || imageUploading;

  return (
    <main style={heightStyles} className="p-4 max-w-xl mx-auto">
      <section className="flex items-center justify-between pb-7">
        <section className="flex items-center gap-2">
          <BackButton to="/add-polls/add-rewards" />
          <h1 className="text-lg">Poll Preview</h1>
        </section>
        <ViewAllButton onClick={() => navigate("/my-polls")}>
          view all polls
        </ViewAllButton>
      </section>

      <div className="mx-auto w-full max-w-md shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <figure>
            <img
              src={filteredmeData?.apps?.xpoll?.avatar?.imageUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover object-top"
            />
          </figure>
          <p className="text-sm font-semibold">
            {filteredmeData?.apps?.xpoll?.username}
          </p>
        </div>

        <section className="mt-4 rounded-2xl bg-white p-4">
          <RewardsStrip
            rewards={
              (data.rewards || []) as Array<{
                assetId: AssetType;
                rewardAmountCap?: number | string;
                amount?: number | string;
              }>
            }
            showField="rewardAmountCap"
            // Optional: force fixed decimals
            // fixed={3}
          />
          <ExpiryRow expireRewardAt={data.expireRewardAt} />

          {pledgeIssues.length > 0 && (
            <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">
                You’re pledging more than your available balance:
              </p>
              <ul className="mt-2 space-y-1">
                {pledgeIssues.map((i) => {
                  const spec = assetSpecs[i.assetId];
                  const sym = spec?.symbol ?? i.assetId;
                  const pledgedParent = baseToParentGrouped(
                    i.assetId,
                    i.pledgedBase,
                  );
                  const balanceParent = baseToParentGrouped(
                    i.assetId,
                    i.balanceBase as number | string,
                  );
                  return (
                    <li key={i.assetId} className="text-xs text-red-700">
                      {sym}: pledging{" "}
                      <span className="tabular-nums">{pledgedParent}</span> &gt;{" "}
                      balance{" "}
                      <span className="tabular-nums">{balanceParent}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-red-700">
                Edit your rewards to continue.
              </p>
            </div>
          )}
          {expiryInvalid && (
            <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">
                {expiryErrorMsg || "Rewards expiry is invalid."}
              </p>
              <p className="mt-1 text-xs text-red-700">
                Limits: min {MIN_REWARD_EXPIRY.labelShort}, max{" "}
                {MAX_REWARD_EXPIRY.labelShort}.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm border space-y-4">
          <h2 className="text-base font-semibold">
            {data.title || "Your question will appear here"}
          </h2>

          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
            <RichTextPreview content={data.description ?? ""} />
          </p>
          {src && (
            <img
              src={src}
              alt="Poll image"
              className="w-full h-44 rounded-xl"
            />
          )}

          <div className="mt-4 space-y-2">
            {(data?.options ?? []).map((opt: any, i: number) => (
              <div
                key={`${opt?.text ?? "opt"}-${i}`}
                className="rounded-xl px-4 py-3 text-sm font-medium border bg-gray-100"
              >
                {opt?.text}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="flex items-end gap-2 mt-6">
        <Button
          type="button"
          className="w-full mt-4 py-5 text-[#0DACAD] bg-white hover:bg-slate-50 border border-[#0DACAD] rounded-full"
          onClick={() => navigate("/add-polls/add-rewards")}
        >
          Edit
        </Button>

        <CommonButton
          text={"Publish"}
          className="w-full text-white disabled:opacity-50 disabled:cursor-not-allowed py-5"
          onClick={() => setOpen(true)}
        />
      </section>

      {/* Publish Confirmation */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="rounded-t-2xl">
            <DrawerHeader>
              <DrawerTitle>Publish this poll?</DrawerTitle>
              <DrawerDescription>
                Publishing makes this poll visible and open for votes. Some
                settings cannot be changed afterwards.
              </DrawerDescription>
            </DrawerHeader>

            <div className="my-4 px-4 space-y-3">
              <RewardsStrip
                rewards={
                  (data.rewards || []) as Array<{
                    assetId: AssetType;
                    rewardAmountCap?: number | string;
                    amount?: number | string;
                  }>
                }
                showField="rewardAmountCap"
                // fixed={3}
              />
              <ExpiryRow expireRewardAt={data.expireRewardAt} />
              {pledgeIssues.length > 0 && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-700">
                    You’re pledging more than your available balance:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {pledgeIssues.map((i) => {
                      const spec = assetSpecs[i.assetId];
                      const sym = spec?.symbol ?? i.assetId;
                      const pledgedParent = baseToParentGrouped(
                        i.assetId,
                        i.pledgedBase,
                        // , 3
                      );
                      const balanceParent = baseToParentGrouped(
                        i.assetId,
                        i.balanceBase as number | string,
                        // , 3
                      );
                      return (
                        <li key={i.assetId} className="text-xs text-red-700">
                          {sym}: pledging{" "}
                          <span className="tabular-nums">{pledgedParent}</span>{" "}
                          &gt; balance{" "}
                          <span className="tabular-nums">{balanceParent}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-red-700">
                    Edit your rewards to continue.
                  </p>
                </div>
              )}
              {expiryInvalid && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-700">
                    {expiryErrorMsg || "Rewards expiry is invalid."}
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    Limits: min {MIN_REWARD_EXPIRY.labelShort}, max{" "}
                    {MAX_REWARD_EXPIRY.labelShort}.
                  </p>
                </div>
              )}
            </div>

            <DrawerFooter className="flex !flex-col w-full gap-2">
              <div className="w-full flex gap-3">
                <Button
                  variant="secondary"
                  className="w-full py-5 text-[#0DACAD] border border-[#0DACAD] rounded-full"
                  onClick={() => {
                    setOpen(false);
                    navigate("/add-polls/add-rewards");
                  }}
                >
                  Edit
                </Button>

                <Button
                  className="w-full py-5 text-white bg-[#0DACAD] rounded-full disabled:opacity-70 disabled:bg-gray-500 disabled:cursor-not-allowed"
                  onClick={handleConfirm}
                  disabled={busy || pledgeIssues.length > 0 || expiryInvalid}
                >
                  {busy ? "Publishing..." : "Confirm"}
                </Button>
              </div>
              <div className="w-full flex flex-col gap-2">
                {pledgeIssues.length > 0 && (
                  <p className="w-full text-center text-xs text-red-700">
                    Fix the over-pledged amounts in Rewards to enable Confirm.
                  </p>
                )}
                {expiryInvalid && (
                  <p className="w-full text-center text-xs text-red-700">
                    Fix the reward expiry to enable Confirm.
                  </p>
                )}
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Publish this poll?</DialogTitle>
              <DialogDescription>
                Publishing makes this poll visible and open for votes. Some
                settings cannot be changed afterwards.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <RewardsStrip
                rewards={
                  (data.rewards || []) as Array<{
                    assetId: AssetType;
                    rewardAmountCap?: number | string;
                    amount?: number | string;
                  }>
                }
                showField="rewardAmountCap"
                // fixed={3}
              />
              <ExpiryRow expireRewardAt={data.expireRewardAt} />
              {pledgeIssues.length > 0 && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-700">
                    You’re pledging more than your available balance:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {pledgeIssues.map((i) => {
                      const spec = assetSpecs[i.assetId];
                      const sym = spec?.symbol ?? i.assetId;
                      const pledgedParent = baseToParentGrouped(
                        i.assetId,
                        i.pledgedBase,
                        // , 3
                      );
                      const balanceParent = baseToParentGrouped(
                        i.assetId,
                        i.balanceBase as number | string,
                        // , 3
                      );
                      return (
                        <li key={i.assetId} className="text-xs text-red-700">
                          {sym}: pledging{" "}
                          <span className="tabular-nums">{pledgedParent}</span>{" "}
                          &gt; balance{" "}
                          <span className="tabular-nums">{balanceParent}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-red-700">
                    Edit your rewards to continue.
                  </p>
                </div>
              )}
              {expiryInvalid && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-700">
                    {expiryErrorMsg || "Rewards expiry is invalid."}
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    Limits: min {MIN_REWARD_EXPIRY.labelShort}, max{" "}
                    {MAX_REWARD_EXPIRY.labelShort}.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex !flex-col gap-5 w-full">
              <div className="w-full flex gap-3">
                <Button
                  variant="secondary"
                  className="w-full py-5 text-[#0DACAD] border border-[#0DACAD] rounded-full"
                  onClick={() => {
                    setOpen(false);
                    navigate("/add-polls/add-rewards");
                  }}
                >
                  Edit
                </Button>

                <Button
                  className="w-full py-5 text-white bg-[#0DACAD] rounded-full disabled:opacity-70 disabled:bg-gray-500 disabled:cursor-not-allowed"
                  onClick={handleConfirm}
                  disabled={busy || pledgeIssues.length > 0 || expiryInvalid}
                >
                  {busy ? "Publishing..." : "Confirm"}
                </Button>
              </div>
              <div className="w-full flex flex-col gap-2">
                {pledgeIssues.length > 0 && (
                  <p className="w-full text-center text-xs text-red-700">
                    Fix the over-pledged amounts in Rewards to enable Confirm.
                  </p>
                )}
                {expiryInvalid && (
                  <p className="w-full text-center text-xs text-red-700">
                    Fix the reward expiry to enable Confirm.
                  </p>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
