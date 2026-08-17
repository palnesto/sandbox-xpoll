import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { endpoints } from "@/api/endpoints";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { cn } from "@/lib/utils";
import { getTxExplorerUrl } from "@/utils/txExplorer";

export type PaymentItem = {
  _id: string;
  purpose: string;
  status:
    | "created"
    | "processing"
    | "succeeded"
    | "failed"
    | "canceled";
  amount: number;
  currency: string;
  invoiceUrl?: string | null;
  createdAt: string;
  context?: {
    campaignId?: string;
    planId?: string;
    tokensToBuy?: string | number;
    assetType?: string;
    fulfillment?: {
      parent?: string;
    };
    extend_campaign_plan?: {
      subscriptionMode?: string;
    };
  } & Record<string, unknown>;
  metadata?: {
    soulBoundSubscription?: {
      reportLink?: string | null;
    };
  } & Record<string, unknown>;
  display?: {
    rail?: "fiat" | "crypto";
    fiat?: {
      currency?: string | null;
      amountMinor?: number | null;
      amountReceivedMinor?: number | null;
      providerPaymentId?: string | null;
      providerEventId?: string | null;
    } | null;
    crypto?: {
      currency?: string | null;
      amountAtomic?: string | null;
      tokenSymbol?: string | null;
      tokenDecimals?: number | null;
      txHash?: string | null;
      chainId?: number | null;
      tokenAddress?: string | null;
      payerAddress?: string | null;
      receiverAddress?: string | null;
      amountMinorEquivalent?: number | null;
    } | null;
  } | null;
  provider?: {
    code?: string | null;
    family?: string | null;
  };
  quote?: {
    kind?: string | null;
    pricing?: {
      currency?: string | null;
      amountMinor?: number | null;
    } | null;
    payload?: {
      tokenSymbol?: string | null;
      tokenDecimals?: number | null;
      expectedAmountAtomic?: string | null;
      chainId?: number | null;
      tokenAddress?: string | null;
      receiverAddress?: string | null;
    } & Record<string, unknown>;
  } | null;
  settlement?: {
    kind?: string | null;
    payload?: {
      txHash?: string | null;
      tokenSymbol?: string | null;
      tokenDecimals?: number | null;
      amountAtomic?: string | null;
      chainId?: number | null;
      tokenAddress?: string | null;
      payerAddress?: string | null;
      receiverAddress?: string | null;
      amountMinorEquivalent?: number | null;
    } & Record<string, unknown>;
  } | null;
};

type PaymentsListSectionProps = {
  highlightPaymentId?: string | null;
  highlightRequestKey?: string | number | null;
};

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

function formatCryptoAmount(
  amountAtomic: string,
  decimals: number,
  symbol: string,
) {
  const atomic = BigInt(amountAtomic);
  const safeDecimals = Math.max(0, decimals);
  const divisor = 10n ** BigInt(safeDecimals);
  const whole = atomic / divisor;
  const fraction = atomic % divisor;

  if (fraction === 0n) {
    return `${whole.toString()} ${symbol}`;
  }

  const paddedFraction = fraction
    .toString()
    .padStart(safeDecimals, "0")
    .replace(/0+$/, "");

  return `${whole.toString()}.${paddedFraction} ${symbol}`;
}

function formatDate(v: string) {
  return new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function shortenTxHash(txHash: string) {
  const normalized = String(txHash ?? "").trim();
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function StatusBadge({ status }: { status: PaymentItem["status"] }) {
  const styles = {
    created: "text-slate-700 bg-slate-50 border-slate-300",
    processing: "text-amber-700 bg-amber-50 border-amber-300",
    succeeded: "text-emerald-700 bg-emerald-50 border-emerald-300",
    failed: "text-rose-700 bg-rose-50 border-rose-300",
    canceled: "text-gray-700 bg-gray-100 border-gray-300",
  }[status];

  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-wide px-2 py-[2px] rounded-full border",
        styles,
      )}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-black/45">
        {label}
      </span>
      <span className="text-sm font-medium text-black/80 text-right break-all">
        {value}
      </span>
    </div>
  );
}

function PaymentCard({ item }: { item: PaymentItem }) {
  const { purpose, context, metadata, status } = item;
  const web3CampaignId =
    purpose === "web3-launch-campaign" &&
    typeof context?.campaignId === "string"
      ? context.campaignId.trim()
      : "";
  const soulboundReportLink =
    purpose === "soul-bound-subscription"
      ? String(metadata?.soulBoundSubscription?.reportLink ?? "").trim()
      : "";
  const providerCode = String(item.provider?.code ?? "").trim();
  const derivedDisplayRail =
    item.display?.rail ??
    (item.quote?.kind === "crypto" ||
    item.settlement?.kind === "crypto" ||
    item.provider?.family === "crypto" ||
    providerCode === "evm"
      ? "crypto"
      : "fiat");
  const fiatDisplay = item.display?.fiat ?? null;
  const cryptoDisplay = item.display?.crypto ?? {
    currency:
      String(
        item.settlement?.payload?.tokenSymbol ??
          item.quote?.payload?.tokenSymbol ??
          item.quote?.pricing?.currency ??
          "",
      ).trim() || null,
    amountAtomic:
      String(
        item.settlement?.payload?.amountAtomic ??
          item.quote?.payload?.expectedAmountAtomic ??
          "",
      ).trim() || null,
    tokenSymbol:
      String(
        item.settlement?.payload?.tokenSymbol ??
          item.quote?.payload?.tokenSymbol ??
          "",
      ).trim() || null,
    tokenDecimals:
      typeof item.settlement?.payload?.tokenDecimals === "number"
        ? item.settlement.payload.tokenDecimals
        : typeof item.quote?.payload?.tokenDecimals === "number"
          ? item.quote.payload.tokenDecimals
          : null,
    txHash: String(item.settlement?.payload?.txHash ?? "").trim() || null,
    chainId:
      typeof item.settlement?.payload?.chainId === "number"
        ? item.settlement.payload.chainId
        : typeof item.quote?.payload?.chainId === "number"
          ? item.quote.payload.chainId
          : null,
    tokenAddress:
      String(
        item.settlement?.payload?.tokenAddress ??
          item.quote?.payload?.tokenAddress ??
          "",
      ).trim() || null,
    payerAddress:
      String(item.settlement?.payload?.payerAddress ?? "").trim() || null,
    receiverAddress:
      String(
        item.settlement?.payload?.receiverAddress ??
          item.quote?.payload?.receiverAddress ??
          "",
      ).trim() || null,
    amountMinorEquivalent:
      typeof item.settlement?.payload?.amountMinorEquivalent === "number"
        ? item.settlement.payload.amountMinorEquivalent
        : null,
  };
  const cryptoTxHash = String(
    cryptoDisplay?.txHash ??
      (item.settlement?.kind === "crypto"
        ? item.settlement?.payload?.txHash
        : ""),
  ).trim();
  const displayCurrency =
    derivedDisplayRail === "crypto"
      ? String(cryptoDisplay?.currency ?? cryptoDisplay?.tokenSymbol ?? "").trim()
      : String(fiatDisplay?.currency ?? item.currency ?? "").trim();
  const displayAmount =
    derivedDisplayRail === "crypto"
      ? cryptoDisplay?.amountAtomic &&
        typeof cryptoDisplay?.tokenDecimals === "number" &&
        displayCurrency
        ? formatCryptoAmount(
            cryptoDisplay.amountAtomic,
            cryptoDisplay.tokenDecimals,
            displayCurrency,
          )
        : null
      : typeof fiatDisplay?.amountMinor === "number" && displayCurrency
        ? formatMoney(fiatDisplay.amountMinor, displayCurrency)
        : null;

  const cardTone =
    purpose === "purchase-campaign-plan"
      ? {
          bg: "bg-[#F6EFEA]",
          border: "border-[#D6BFAE]",
          purposeText: "text-[#9E7F6C]",
        }
      : purpose === "purchase-asset-token"
        ? {
            bg: "bg-[#EEF4F1]",
            border: "border-[#9FB7AA]",
            purposeText: "text-[#5E7D6F]",
          }
        : {
            bg: "bg-[#F1F2F6]",
            border: "border-[#B8BCC6]",
            purposeText: "text-[#6B7280]",
        };

  return (
    <section
      className={cn(
        "rounded-xl border-l-4 p-4 shadow-sm",
        cardTone.bg,
        cardTone.border,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-xs uppercase tracking-wide font-medium",
            cardTone.purposeText,
          )}
        >
          {purpose.replaceAll("-", " ")}
        </span>
        <StatusBadge status={status} />
      </div>

      <div className="text-xs text-black/50 mb-2">{formatDate(item.createdAt)}</div>

      <div className="text-lg font-semibold text-black mb-3">
        {purpose === "purchase-asset-token"
          ? `${context?.tokensToBuy ?? "-"} Tokens`
          : displayAmount ?? formatMoney(item.amount, item.currency)}
      </div>

      <div className="space-y-1">
        <InfoRow label="Currency" value={displayCurrency || undefined} />
        <InfoRow
          label="Provider"
          value={providerCode ? providerCode.toUpperCase() : undefined}
        />

        {derivedDisplayRail === "fiat" && purpose !== "purchase-asset-token" && (
          <InfoRow label="Amount" value={displayAmount ?? undefined} />
        )}

        {derivedDisplayRail === "crypto" && (
          <InfoRow label="Amount" value={displayAmount ?? undefined} />
        )}

        {purpose === "purchase-asset-token" && (
          <InfoRow
            label="Tokens Bought"
            value={String(context?.tokensToBuy ?? "-")}
          />
        )}

        {purpose === "purchase-asset-token" && (
          <InfoRow label="Payment" value={displayAmount ?? undefined} />
        )}

        {purpose === "purchase-campaign-plan" && (
          <>
            <InfoRow label="Plan ID" value={context?.planId} />
            <InfoRow label="Campaign ID" value={context?.campaignId} />
            {context?.extend_campaign_plan && (
              <InfoRow
                label="Plan Extension"
                value={context.extend_campaign_plan.subscriptionMode}
              />
            )}
          </>
        )}

        {purpose === "purchase-asset-token" && (
          <>
            <InfoRow label="Asset" value={context?.assetType} />
            <InfoRow label="Parent Token" value={context?.fulfillment?.parent} />
          </>
        )}

        {purpose === "web3-launch-campaign" && web3CampaignId && (
          <InfoRow
            label="Campaign ID"
            value={
              <Link
                to={`/campaigns/edit/${web3CampaignId}/overview`}
                className="text-sm font-medium text-blue-700 hover:underline break-all"
              >
                {web3CampaignId}
              </Link>
            }
          />
        )}

        {purpose === "soul-bound-subscription" && soulboundReportLink && (
          <InfoRow
            label="Report"
            value={
              <a
                href={soulboundReportLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
              >
                View report <ExternalLink className="h-4 w-4" />
              </a>
            }
          />
        )}

        {cryptoTxHash && (
          <InfoRow
            label="Txn"
            value={
              <div className="inline-flex items-center justify-end gap-2">
                <a
                  href={getTxExplorerUrl(cryptoTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  title={cryptoTxHash}
                  className={cn(
                    "text-sm font-medium hover:underline",
                    cardTone.purposeText,
                  )}
                >
                  {shortenTxHash(cryptoTxHash)}
                </a>
                <CopyIconButton
                  value={cryptoTxHash}
                  srLabel="Copy transaction hash"
                  className={cn(
                    "rounded-full p-1 transition hover:bg-black/5",
                    cardTone.purposeText,
                  )}
                />
              </div>
            }
          />
        )}
      </div>

      {item.invoiceUrl && (
        <a
          href={item.invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          View invoice <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </section>
  );
}

export function PaymentsListSection(props: PaymentsListSectionProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data, isLoading, isError } = useApiQuery(
    `${endpoints.campaigns.allPayments}?page=${page}&pageSize=${pageSize}&status=created,processing,succeeded,failed,canceled`,
  );

  const { items, totalPages } = useMemo(() => {
    const root = data?.data?.data ?? {};
    return {
      items: (root.entries ?? []) as PaymentItem[],
      totalPages: Math.max(1, Math.ceil((root.total ?? 0) / pageSize)),
    };
  }, [data]);

  const pagesToShow = useMemo(() => {
    const pages = [];
    if (page > 1) pages.push(page - 1);
    pages.push(page);
    if (page < totalPages) pages.push(page + 1);
    return pages;
  }, [page, totalPages]);

  useEffect(() => {
    if (!props.highlightPaymentId) return;
    setPage(1);
    setActiveHighlightId(props.highlightPaymentId);

    const timeoutId = window.setTimeout(() => {
      setActiveHighlightId((currentId) =>
        currentId === props.highlightPaymentId ? null : currentId,
      );
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [props.highlightPaymentId, props.highlightRequestKey]);

  useEffect(() => {
    if (!activeHighlightId) return;
    const node = itemRefs.current[activeHighlightId];
    if (!node) return;

    node.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeHighlightId, items]);

  return (
    <>
      {isLoading ? (
        <div className="text-sm text-black/60">Loading payments…</div>
      ) : isError ? (
        <div className="text-sm text-black/60">Failed to load payments.</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-black/60">No payments found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              ref={(node) => {
                itemRefs.current[item._id] = node;
              }}
              className={cn(
                "scroll-mt-24 rounded-2xl transition-all duration-500",
                activeHighlightId === item._id &&
                  "bg-[linear-gradient(135deg,rgba(37,99,235,0.14)_0%,rgba(56,189,248,0.12)_34%,rgba(16,185,129,0.12)_100%)] p-[6px] ring-2 ring-[#2563eb]/45 shadow-[0_0_0_10px_rgba(37,99,235,0.10),0_24px_48px_rgba(37,99,235,0.18)]",
              )}
            >
              <PaymentCard item={item} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((currentPage) => currentPage - 1)}
            className="px-3 py-1 text-sm rounded border disabled:opacity-40"
          >
            Prev
          </button>

          {pagesToShow.map((nextPage) => (
            <button
              key={nextPage}
              onClick={() => setPage(nextPage)}
              className={cn(
                "px-3 py-1 text-sm rounded border",
                nextPage === page
                  ? "bg-blue text-white"
                  : "bg-white hover:bg-blue/5",
              )}
            >
              {nextPage}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            className="px-3 py-1 text-sm rounded border disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
