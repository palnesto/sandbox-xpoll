import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";

export const MAX_TOKENS_PER_DONATION = 500n;

function isWholeNumberString(v: string) {
  return /^[0-9]+$/.test(v);
}

export default function CampaignDonateModal({
  open,
  onClose,
  onContinue,
  loading,
  assetLabel = "campaign",
}: {
  open: boolean;
  onClose: () => void;
  onContinue: (tokens: bigint) => void;
  loading?: boolean;
  assetLabel?: string;
}) {
  const [tokensStr, setTokensStr] = useState("");
  const [agree, setAgree] = useState(false);
  const { data: meData } = useApiQuery(endpoints.profile.me);
  const balance = useMemo(
    () => meData?.data?.data?.assetMappings?.xGive?.amount ?? null,
    [meData],
  );

  useEffect(() => {
    if (!open) {
      setTokensStr("");
      setAgree(false);
    }
  }, [open]);

  const tokensBig: bigint | null = useMemo(() => {
    const s = tokensStr.trim();
    if (!s) return null;
    if (!isWholeNumberString(s)) return null;
    try {
      return BigInt(s);
    } catch {
      return null;
    }
  }, [tokensStr]);

  const amountError = useMemo(() => {
    if (!tokensStr.trim()) return "";
    if (tokensBig === null) return "Enter a natural number only";
    if (tokensBig <= 0n) return "Amount must be greater than 0";
    if (tokensBig > MAX_TOKENS_PER_DONATION) return "Max allowed is 500 tokens";
    if (balance && tokensBig > balance) return "Insufficient balance";
    return "";
  }, [tokensStr, tokensBig]);

  const canContinue = useMemo(() => {
    if (loading) return false;
    if (!agree) return false;
    if (tokensBig === null) return false;
    if (tokensBig <= 0n) return false;
    if (tokensBig > MAX_TOKENS_PER_DONATION) return false;
    if (balance && tokensBig > balance) return false;
    return true;
  }, [agree, tokensBig, loading]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="close"
      />

      <div className="relative w-full max-w-[720px] rounded-2xl bg-white shadow-xl border border-black/10 overflow-hidden">
        <div className="p-6">
          <header className="flex justify-between">
            <h2 className="text-2xl font-semibold text-[#111]">
              Before You Continue
            </h2>
            <p className="flex flex-col items-center justify-center font-medium">
              your balance:
              <span>{balance ?? 0}</span>
            </p>
          </header>
          <p className="pt-2">
            Please review the details below before proceeding with your
            donation.
          </p>
          <div className="mt-4 max-h-[220px] overflow-auto rounded-xl bg-white">
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#6B6B6B] leading-5">
              {/* <li>You are about to donate {assetLabel} tokens to proceed.</li> */}

              <li>
                You are about to donate campaign tokens to support this
                campaign.
              </li>
              <li>Maximum tokens per donation: 500 camapaign tokens</li>
              <li>Once confirmed, this action cannot be reversed.</li>
            </ul>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-semibold text-[#111]">
              Amount ({assetLabel} tokens)
            </label>
            <input
              value={tokensStr}
              onChange={(e) => setTokensStr(e.target.value)}
              inputMode="numeric"
              placeholder="Enter tokens, max 500"
              className={cn(
                "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none",
                amountError ? "border-red-300" : "border-black/10",
              )}
            />

            <div className="mt-2 text-xs text-[#7A7A7A]">
              You can donate up to 500 {assetLabel} tokens in a single
              transaction.
            </div>

            {amountError ? (
              <div className="mt-2 text-xs text-red-600">{amountError}</div>
            ) : null}
          </div>

          <label className="mt-5 flex items-center gap-2 text-sm text-[#6B6B6B]">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="h-4 w-4"
            />
            I agree with this
          </label>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              if (!canContinue || tokensBig === null) return;
              onContinue(tokensBig);
            }}
            className={cn(
              "mt-5 rounded-full px-6 py-3 font-semibold tracking-wide",
              "bg-[#0EA5A5] text-white",
              !canContinue ? "opacity-40 cursor-not-allowed" : "opacity-100",
            )}
          >
            {loading ? "PROCESSING..." : "I UNDERSTAND & CONTINUE"}
          </button>
        </div>
      </div>
    </div>
  );
}
