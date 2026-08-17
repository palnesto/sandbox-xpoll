import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";

type DonationApiItem = {
  _id: string;
  createdAt: string;
  metadata?: {
    owner?: {
      username?: string;
      avatar?: { imageUrl?: string };
    } | null;
  };
  legs?: {
    _id?: string;
    assetId?: string;
    amount?: string;
  }[];
};

const AVATAR_FALLBACK = "/avatar-placeholder.png";

function toBigIntSafe(v: unknown): bigint {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && v.trim()) return BigInt(v.trim());
  } catch {}
  return 0n;
}

function extractBalancesBaseMap(
  meResp: any,
): Partial<Record<AssetType, string>> {
  const root = meResp?.data?.data;

  const out: Partial<Record<AssetType, string>> = {};

  const mappings = root?.assetMappings;
  if (!mappings || typeof mappings !== "object") return out;

  for (const v of Object.values(mappings) as any[]) {
    const assetId = (v?.assetType ?? v?.assetId) as AssetType;
    const amt = v?.amount;

    if (!assetId || !(assetId in assetSpecs)) continue;
    out[assetId] = String(amt ?? "0");
  }

  return out;
}

export default function PurchaseHistoryPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: meResp,
    isLoading: meLoading,
    isError: meError,
  } = useApiQuery(endpoints.profile.me);
  const effectiveSize = page * pageSize;
  const {
    data: donationsResp,
    isLoading: dLoading,
    isError: dError,
  } = useApiQuery(
    `${endpoints.campaigns.myDonations}?page=1&pageSize=${effectiveSize}`,
    { enabled: true },
  );

  const { rows, totalPages } = useMemo(() => {
    const root = donationsResp?.data?.data ?? {};
    const items: DonationApiItem[] = Array.isArray(root.items)
      ? root.items
      : [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);
    const baseBalances = extractBalancesBaseMap(meResp);
    const running = new Map<AssetType, bigint>();
    (Object.keys(assetSpecs) as AssetType[]).forEach((aid) => {
      const base = baseBalances[aid] ?? "0";
      running.set(aid, toBigIntSafe(base));
    });

    for (let i = 0; i < start; i++) {
      const it = items[i];
      for (const leg of it.legs ?? []) {
        const aid = leg.assetId as AssetType;
        if (!aid || !assetSpecs[aid]) continue;
        const after = running.get(aid) ?? 0n;
        const donated = toBigIntSafe(leg.amount ?? "0");
        const before = after + donated;
        running.set(aid, before);
      }
    }
    const mapped = pageItems.map((item) => {
      const owner = item.metadata?.owner ?? null;

      const receiverName = owner?.username ?? "Campaign Owner (You)";
      const receiverAvatar = owner?.avatar?.imageUrl ?? null;

      const legs = (item.legs ?? [])
        .map((leg) => {
          const assetId = leg.assetId as AssetType | undefined;
          if (!assetId || !assetSpecs[assetId]) return null;

          const spec = assetSpecs[assetId];

          const donatedBase = toBigIntSafe(leg.amount ?? "0");
          const balanceAfterBase = running.get(assetId) ?? 0n;
          const balanceBeforeBase = balanceAfterBase + donatedBase;

          // convert all to parent units (strings)
          const donatedParent = unwrapString(
            amount({
              op: "toParent",
              assetId,
              value: donatedBase.toString(),
              output: "string",
              trim: true,
              group: false,
            }),
            "0",
          );

          const beforeParent = unwrapString(
            amount({
              op: "toParent",
              assetId,
              value: balanceBeforeBase.toString(),
              output: "string",
              trim: true,
              group: false,
            }),
            "0",
          );

          const afterParent = unwrapString(
            amount({
              op: "toParent",
              assetId,
              value: balanceAfterBase.toString(),
              output: "string",
              trim: true,
              group: false,
            }),
            "0",
          );

          // update running for next (older) row
          running.set(assetId, balanceBeforeBase);

          return {
            assetId,
            donatedParent,
            beforeParent,
            afterParent,
            parentSymbol: spec.parentSymbol,
            img: spec.img,
          };
        })
        .filter(Boolean) as {
        assetId: AssetType;
        donatedParent: string;
        beforeParent: string;
        afterParent: string;
        parentSymbol: string;
        img: string;
      }[];

      return {
        _id: item._id,
        createdAt: item.createdAt,
        receiverName,
        receiverAvatar,
        legs,
      };
    });

    return {
      rows: mapped,
      totalPages: Number(root.totalPages ?? 1),
    };
  }, [donationsResp, meResp, page, pageSize]);

  const loading = meLoading || dLoading;
  const error = meError || dError;

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-3 py-10 md:px-8">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-7 w-11 rounded-full border-l-2 border-black/20 flex items-center justify-center bg-black/10 hover:bg-black/5"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h1 className="text-xl font-semibold text-[#111]">Donation History</h1>
      </header>

      <section className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-black/50">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-black/50">
            Failed to load purchase history.
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-black/50">No purchases found.</div>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <PurchaseRow key={row._id} row={row} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-[#FAFAFA]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm font-medium disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-xs text-black/60">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PurchaseRow({
  row,
}: {
  row: {
    _id: string;
    createdAt: string;
    receiverName: string;
    receiverAvatar: string | null;
    legs: {
      assetId: AssetType;
      donatedParent: string;
      beforeParent: string;
      afterParent: string;
      parentSymbol: string;
      img: string;
    }[];
  };
}) {
  const avatar = row.receiverAvatar ?? AVATAR_FALLBACK;

  const date = new Date(row.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <section className="flex items-start justify-between px-3 py-4">
      {/* Left: receiver + date */}
      <section className="flex items-center gap-3 min-w-0">
        <img
          src={avatar}
          alt=""
          className="h-9 w-9 rounded-full object-cover object-top"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#111] truncate">
            {row.receiverName}
          </p>
          <p className="text-xs text-black/50">{date}</p>
        </div>
      </section>

      {/* Right: legs (donated + before/after balance) */}
      <section className="flex flex-col items-end gap-2">
        {row.legs.length ? (
          row.legs.map((leg) => (
            <div
              key={`${row._id}-${leg.assetId}`}
              className="flex flex-col items-end"
            >
              <div className="flex items-center gap-2">
                <img src={leg.img} alt="" className="h-5 w-5 object-contain" />
                <span className="text-[16px] font-semibold text-[#111] leading-none">
                  {leg.donatedParent}
                </span>
                <span className="text-[12px] font-medium text-black/60">
                  {leg.parentSymbol}
                </span>
              </div>

              <div className="mt-1 text-[11px] text-black/45">
                Bal:{" "}
                <span className="font-medium text-black/60">
                  {leg.beforeParent}
                </span>{" "}
                →{" "}
                <span className="font-medium text-black/60">
                  {leg.afterParent}
                </span>{" "}
                <span className="ml-1">{leg.parentSymbol}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-black/40">—</div>
        )}
      </section>
    </section>
  );
}
