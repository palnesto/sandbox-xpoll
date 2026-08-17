import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  donationSettingsModalZ,
  addInfoLinksFlatModalZ,
  type DonationSettingsModalValues,
  type AddInfoLinksFlatModalValues,
} from "@/schema/campaign.schemas";
import { TextField } from "@/components/commons/form/TextField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { useNavigate } from "react-router";

export type AddInfoModalKey =
  | "DONATION_SETTINGS"
  | "ADD_LINKS"
  | "SHARE_REWARDS"
  | null;

function onlyInt(s: string) {
  return s.replace(/[^\d]/g, "");
}

function toSafeInt(v: unknown) {
  const n = Math.trunc(Number(String(v ?? "").replace(/[^\d]/g, "")));
  return Number.isFinite(n) ? n : 0;
}

function ShareRewardsModalUI({
  campaignId,
  initial,
  onSaved,
}: {
  campaignId: string;
  initial: { shares: number; payoutCap: string; amount: string };
  onClose: () => void;
  onSaved: (v: { shares: number; payoutCap: string; amount: string }) => void;
}) {
  const API_BASE = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const [pool, setPool] = useState<string>(initial.payoutCap ?? "");
  const [shares, setShares] = useState<string>(String(initial.shares ?? 0));
  const [reward, setReward] = useState<string>(initial.amount ?? "0");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const safePool = pool ? String(Math.trunc(Number(pool))) : "";
  const safeShares = shares ? String(Math.trunc(Number(shares))) : "0";
  const safeReward = reward ? String(Math.trunc(Number(reward))) : "0";

  const { data: meData } = useApiQuery(endpoints.profile.me);
  const me = meData?.data?.data?.assetMappings?.xPoll?.amount ?? null;

  const xpoll = unwrapString(
    amount({
      op: "toParent",
      assetId: "xPoll",
      value: (me ?? 0).toString(),
      output: "string",
      group: false,
    }),
    "0",
  );

  // ✅ numeric XPOLL balance
  const xpollBalance = toSafeInt(xpoll);

  const onSave = async () => {
    setErr(null);

    const nShares = Number(safeShares);
    const nPool = Number(safePool);
    const nReward = Number(safeReward);

    if (!nShares || nShares <= 0) return setErr("Shares must be > 0");
    if (!nPool || nPool <= 0) return setErr("Reward pool must be > 0");
    if (!nReward || nReward <= 0) return setErr("Reward must be > 0");

    // ✅ NEW: pool <= balance
    if (xpollBalance > 0 && nPool > xpollBalance) {
      return setErr(
        `Reward pool must be ≤ your XPOLL balance (${xpollBalance})`,
      );
    }

    // ✅ NEW: reward <= pool
    if (nReward > nPool) {
      return setErr("XPOLL reward per milestone must be ≤ total reward pool");
    }

    setLoading(true);
    try {
      const body = {
        isEnabled: true,
        referral_levels: [
          {
            totalUniqueVisitsRequired: nShares,
            rewards: [
              {
                assetId: "xPoll",
                amount: String(nReward),
                payoutCap: String(nPool),
              },
            ],
          },
        ],
      };

      const res = await fetch(
        `${API_BASE}${endpoints.campaigns.shareRewards(campaignId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || json?.message || "Failed to save share rewards",
        );
      }

      onSaved({
        shares: nShares,
        payoutCap: String(nPool),
        amount: String(nReward),
      });
    } catch (e: any) {
      setErr(e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 font-poppins">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-[#111]">
          Total Reward Pool
        </div>
        <div className="text-sm text-[#111]">
          XPOLL balance <br />
          {xpoll} XPOLL
        </div>
      </div>

      <div className="flex items-center gap-2 font-medium text-[#111] pt-7">
        <span className="h-6 w-6 rounded-full bg-[#EEE]" />
        Total campaign Reward Pool
      </div>

      <input
        value={pool}
        onChange={(e) => {
          setErr(null);
          const v = onlyInt(e.target.value);

          // ✅ OPTIONAL UX: prevent typing above balance
          const n = Number(v || "0");
          if (xpollBalance > 0 && n > xpollBalance) {
            setPool(String(xpollBalance));
            setErr(
              `Reward pool must be ≤ your XPOLL balance (${xpollBalance})`,
            );
            return;
          }

          // ✅ also keep reward <= pool after pool changes
          const currentReward = Number(safeReward || "0");
          if (currentReward > n && n > 0) {
            setReward(String(n));
          }

          setPool(v);
        }}
        inputMode="numeric"
        className="mt-3 w-full rounded-lg border-2 border-black/20 bg-white px-4 py-3 outline-none"
        placeholder="Enter the total XPOLL tokens allocated for share rewards."
      />

      <div className="my-6 h-0.5 bg-black/20" />

      <div className="text-lg font-semibold text-[#111]">Share Reward Rule</div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-medium text-[#111]">Shares Required</div>
          <div className="mt-1 text-xs text-[#9A9A9A]">
            Number of verified shares needed to unlock a reward.
          </div>

          <input
            value={shares}
            onChange={(e) => {
              setErr(null);
              setShares(onlyInt(e.target.value));
            }}
            inputMode="numeric"
            className="mt-3 w-full rounded-lg border border-black/20 bg-white px-4 py-3 outline-none"
            placeholder="12"
          />
        </div>

        <div>
          <div className="text-sm font-medium text-[#111]">XPOLL</div>
          <div className="mt-1 text-xs text-[#9A9A9A]">
            XPOLL tokens rewarded for each share milestone. "{safeShares || 0}"
            shares
          </div>

          <input
            value={reward}
            onChange={(e) => {
              setErr(null);
              const v = onlyInt(e.target.value);
              const nReward = Number(v || "0");
              const nPool = Number(safePool || "0");

              // ✅ enforce reward <= pool while typing
              if (nPool > 0 && nReward > nPool) {
                setReward(String(nPool));
                setErr(
                  "XPOLL reward per milestone must be ≤ total reward pool",
                );
                return;
              }

              setReward(v);
            }}
            inputMode="numeric"
            className="mt-3 w-full rounded-lg border border-black/20 bg-white px-4 py-3 outline-none"
            placeholder="15"
          />
        </div>
      </div>

      <div className="mt-3 text-sm text-[#111]">
        Every {safeShares || 0} Shares = {safeReward || 0} XPOLL
      </div>

      {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

      <div className="mt-8 space-y-4">
        <button
          type="button"
          disabled={Boolean(loading || err)}
          onClick={onSave}
          className="w-full rounded-full border border-[#0EA5A5] bg-white py-4 font-semibold text-[#0EA5A5] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/marketplace")}
          className="w-full rounded-full bg-[#0EA5A5] py-4 font-semibold text-white"
        >
          Buy Coins
        </button>
      </div>
    </div>
  );
}

const overlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
const card = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.98 },
};

function fmtDateLabel(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  const day = String(dt.getDate()).padStart(2, "0");
  const mon = dt.toLocaleString("en-US", { month: "short" });
  return `${day}, ${mon} ${dt.getFullYear()}`;
}

function DateBox({
  label,
  value,
  onChangeISO,
  error,
  min,
  max,
}: {
  label: string;
  value: string;
  onChangeISO: (v: string) => void;
  error?: string;
  min?: string;
  max?: string;
}) {
  const hiddenRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="w-full">
      <div className="text-[#9A9A9A] text-lg">{label}</div>

      <button
        type="button"
        onClick={() =>
          hiddenRef.current?.showPicker?.() || hiddenRef.current?.click()
        }
        className={cn(
          "mt-3 w-full rounded-xl border bg-[#F3F3F3] px-5 py-4 flex items-center justify-between",
          error ? "border-red-300" : "border-black/30",
        )}
      >
        <div className="text-lg text-[#1B1B1B]">{fmtDateLabel(value)}</div>
        <Calendar className="w-5 h-5 text-[#1B1B1B]" />
      </button>

      <input
        ref={hiddenRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChangeISO(e.target.value)}
        className="sr-only"
      />

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default function AddInfoFlowModal({
  campaignId,
  active,
  onClose,
  donationStartDate,
  donationEndDate,
  donationMinStartDate,
  donationMaxEndDate,
  links,
  onDonationSaved,
  onLinksSaved,
  onLinksDraftChange,
  onLinksClose,
  shareRewardsInitial,
  onShareRewardsSaved,
}: {
  campaignId: string;

  active: AddInfoModalKey;
  onClose: () => void;

  donationStartDate: string;
  donationEndDate: string;
  donationMinStartDate: string;
  donationMaxEndDate: string;

  links: {
    x: string;
    instagram: string;
    telegram: string;
    email: string;
    website: string;
  };

  onPaid: () => void;
  onDonationSaved: (v: DonationSettingsModalValues) => void;
  onLinksSaved: (v: AddInfoLinksFlatModalValues) => void;
  onLinksDraftChange?: (v: Partial<AddInfoLinksFlatModalValues>) => void;
  onLinksClose?: (hasError: boolean, message?: string) => void;
  shareRewardsInitial?: { shares: number; payoutCap: string; amount: string };
  onShareRewardsSaved?: (v: {
    shares: number;
    payoutCap: string;
    amount: string;
  }) => void;
}) {
  const isDonation = active === "DONATION_SETTINGS";
  const isLinks = active === "ADD_LINKS";
  const isShareRewards = active === "SHARE_REWARDS";

  const donationForm = useForm<DonationSettingsModalValues>({
    resolver: zodResolver(donationSettingsModalZ),
    mode: "onChange",
    defaultValues: {
      startDate: donationStartDate,
      endDate: donationEndDate,
    },
  });

  const linksForm = useForm<AddInfoLinksFlatModalValues>({
    resolver: zodResolver(addInfoLinksFlatModalZ),
    mode: "onChange",
    defaultValues: {
      twitterLink: links.x || null,
      instagramLink: links.instagram || null,
      telegramLink: links.telegram || null,
      emailLink: links.email || null,
      websiteLink: links.website || null,
    },
  });

  useEffect(() => {
    if (isDonation) {
      donationForm.reset({
        startDate: donationStartDate,
        endDate: donationEndDate,
      });
    }

    if (isLinks) {
      if (!linksForm.formState.isDirty) {
        linksForm.reset({
          twitterLink: links.x || null,
          instagramLink: links.instagram || null,
          telegramLink: links.telegram || null,
          emailLink: links.email || null,
          websiteLink: links.website || null,
        });
      }
    }
  }, [isDonation, isLinks, donationStartDate, donationEndDate, links]);

  useEffect(() => {
    if (!isLinks) return;

    const sub = linksForm.watch((v) => {
      onLinksDraftChange?.({
        twitterLink: v.twitterLink ?? null,
        instagramLink: v.instagramLink ?? null,
        telegramLink: v.telegramLink ?? null,
        emailLink: v.emailLink ?? null,
        websiteLink: v.websiteLink ?? null,
      });
    });

    return () => sub.unsubscribe();
  }, [isLinks, linksForm, onLinksDraftChange]);

  const handleLinksClose = () => {
    if (isLinks && onLinksClose) {
      const isValid = linksForm.formState.isValid;
      const err = linksForm.formState.errors;
      const firstError =
        err.twitterLink?.message ??
        err.instagramLink?.message ??
        err.telegramLink?.message ??
        err.emailLink?.message ??
        err.websiteLink?.message;
      onLinksClose(!isValid, firstError ?? "Fix or remove invalid link(s).");
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          onClick={isLinks ? handleLinksClose : onClose}
          className="fixed inset-0 z-50"
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            variants={overlay}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/70"
            onClick={isLinks ? handleLinksClose : onClose}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              variants={card}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-[670px] rounded-[32px] bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {isShareRewards && (
                <ShareRewardsModalUI
                  campaignId={campaignId}
                  initial={
                    shareRewardsInitial ?? {
                      shares: 0,
                      payoutCap: "50",
                      amount: "0",
                    }
                  }
                  onClose={onClose}
                  onSaved={(v) => onShareRewardsSaved?.(v)}
                />
              )}

              {isDonation && (
                <div className="p-7">
                  <div className="text-[22px] font-medium text-[#111]">
                    Donation button
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-5">
                    <DateBox
                      label="Start Date"
                      value={donationForm.watch("startDate")}
                      min={donationMinStartDate}
                      max={donationMaxEndDate}
                      onChangeISO={(v) =>
                        donationForm.setValue("startDate", v, {
                          shouldValidate: true,
                        })
                      }
                      error={donationForm.formState.errors.startDate?.message}
                    />
                    <DateBox
                      label="End Date"
                      value={donationForm.watch("endDate")}
                      min={
                        donationForm.watch("startDate") || donationMinStartDate
                      }
                      max={donationMaxEndDate}
                      onChangeISO={(v) =>
                        donationForm.setValue("endDate", v, {
                          shouldValidate: true,
                        })
                      }
                      error={donationForm.formState.errors.endDate?.message}
                    />
                  </div>

                  <div className="mt-6 rounded-full bg-[#FFECEC] px-4 py-3 text-center text-[15px] font-semibold text-[#ED0C1D]">
                    Important Notice:
                  </div>

                  <div className="mt-4 text-center text-[16px] leading-6 text-[#6B6B6B] px-2">
                    Donations made through this button are delivered as X Coins
                    only. The campaigner will not receive real money/cash from
                    these donations.
                  </div>

                  <button
                    type="button"
                    onClick={donationForm.handleSubmit((v) =>
                      onDonationSaved(v),
                    )}
                    className="mt-8 w-full rounded-full bg-[#11A7A7] px-6 py-5 text-[18px] font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              )}

              {isLinks && (
                <div className="p-7">
                  <h2 className="text-[22px] font-medium text-[#111]">
                    Add Links
                  </h2>
                  <div className="mt-6 space-y-4">
                    <TextField<AddInfoLinksFlatModalValues>
                      form={linksForm}
                      schema={addInfoLinksFlatModalZ}
                      name="twitterLink"
                      label="X (Twitter)"
                      placeholder="https://x.com/yourhandle or username"
                      showError
                    />
                    <TextField<AddInfoLinksFlatModalValues>
                      form={linksForm}
                      schema={addInfoLinksFlatModalZ}
                      name="instagramLink"
                      label="Instagram"
                      placeholder="https://instagram.com/yourhandle or username"
                      showError
                    />
                    <TextField<AddInfoLinksFlatModalValues>
                      form={linksForm}
                      schema={addInfoLinksFlatModalZ}
                      name="telegramLink"
                      label="Telegram"
                      placeholder="https://t.me/yourhandle or username"
                      showError
                    />
                    <TextField<AddInfoLinksFlatModalValues>
                      form={linksForm}
                      schema={addInfoLinksFlatModalZ}
                      name="emailLink"
                      label="Email"
                      placeholder="you@example.com"
                      showError
                    />
                    <TextField<AddInfoLinksFlatModalValues>
                      form={linksForm}
                      schema={addInfoLinksFlatModalZ}
                      name="websiteLink"
                      label="Website"
                      placeholder="https://example.com or domain"
                      showError
                    />
                  </div>

                  <button
                    type="button"
                    disabled={linksForm.formState.isValid !== true}
                    onClick={(e) =>
                      handleSubmitNormalized(
                        addInfoLinksFlatModalZ,
                        linksForm,
                        (v) => onLinksSaved(v),
                      )(e as unknown as React.BaseSyntheticEvent)
                    }
                    className={cn(
                      "mt-8 w-full rounded-full px-6 py-5 text-[18px] font-semibold text-white",
                      linksForm.formState.isValid === true
                        ? "bg-[#11A7A7]"
                        : "bg-gray-300 cursor-not-allowed",
                    )}
                  >
                    Save
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

