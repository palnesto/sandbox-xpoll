import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ArrowLeft } from "lucide-react";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { CampaignStatePills } from "@/components/campaign/campaign-state-pills";

type DonationApiItem = {
  _id: string;
  createdAt: string;
  metadata?: {
    user?: {
      username?: string;
      avatar?: {
        imageUrl?: string;
      };
    };
  };
  legs?: {
    amount?: string;
    assetId?: string;
  }[];
};

export default function AllDonations() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const campaignRoute = endpoints.campaigns.getCampaignByIdUser(campaignId!);
  const { data: campaignResp } = useApiQuery(campaignRoute, {
    enabled: !!campaignId,
  } as any);

  const { data, isLoading } = useApiQuery(
    `${endpoints.campaigns.myCampaignDonations(
      campaignId!
    )}?page=${page}&pageSize=${pageSize}`,
    { enabled: !!campaignId }
  );

  const { donations, totalPages } = useMemo(() => {
    const root = data?.data?.data ?? {};

    const mapped =
      (root.items as DonationApiItem[] | undefined)?.map((item) => {
        const leg = item.legs?.[0];
        const assetId = leg?.assetId as AssetType | undefined;

        const spec = assetId ? assetSpecs[assetId] : null;
        const convertedAmount = unwrapString(
          assetId
            ? amount({
                op: "toParent",
                assetId,
                value: leg?.amount ?? "0",
                output: "string",
                trim: true,
                group: false,
              })
            : { ok: true, value: "0" },
          "0"
        );

        return {
          _id: item._id,
          createdAt: item.createdAt,
          amount: convertedAmount,
          assetId,
          assetImg: spec?.img,
          assetSymbol: spec?.parentSymbol,

          user: {
            name: item.metadata?.user?.username ?? "Anonymous",
            avatar: item.metadata?.user?.avatar?.imageUrl,
          },
        };
      }) ?? [];

    return {
      donations: mapped,
      totalPages: root.totalPages ?? 1,
    };
  }, [data]);

  const campaignMeta = useMemo(() => {
    const root = campaignResp?.data?.data ?? null;
    return root?._id ? root : null;
  }, [campaignResp]);

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-3 py-10 md:px-8">
      <header className="mb-6 rounded-2xl border border-black/5 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-7 w-11 rounded-full border-l-2 border-black/20 flex items-center justify-center bg-black/10 hover:bg-black/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[#111]">
              Campaign Donations
            </h1>
            {campaignMeta?.name ? (
              <p className="text-xs text-black/60 truncate">
                {campaignMeta.name}
              </p>
            ) : null}
          </div>
        </div>

        {campaignMeta ? (
          <CampaignStatePills
            input={campaignMeta}
            ownershipType={campaignMeta?.ownership?.type}
            billingMode={campaignMeta?.billing?.mode ?? null}
            showBillingMode={campaignMeta?.tier === "paid"}
            className="mt-3"
          />
        ) : null}
      </header>

      <section className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-black/50">Loading donations…</div>
        ) : donations.length === 0 ? (
          <div className="p-6 text-sm text-black/50">No donations found.</div>
        ) : (
          <div className="divide-y">
            {donations.map((d: DonationApiItem) => (
              <DonationRow key={d._id} donation={d} />
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

function DonationRow({ donation }: { donation: any }) {
  const name = donation?.user?.name ?? "Anonymous";
  const avatar = donation?.user?.avatar ?? "/avatar-placeholder.png";
  const date = new Date(donation.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <section className="flex items-center justify-between px-3 md:px-5 py-4">
      <section className="flex items-center gap-3">
        <img
          src={avatar}
          alt=""
          className="h-10 w-10 rounded-full object-cover object-top"
        />
        <span className="text-sm xl:text-lg font-semibold text-[#111]">
          {name}
        </span>
      </section>

      <section className="text-right">
        <p className="flex items-center gap-1 text-sm xl:text-lg font-semibold text-[#111] leading-none">
          {donation.amount}
          <p className="pl-1.5 font-medium text-black/60">
            {donation.assetSymbol}
          </p>
          {donation.assetImg && (
            <img
              src={donation.assetImg}
              alt={donation.assetSymbol}
              className="h-5 w-5 object-contain"
            />
          )}
        </p>
        <p className="text-[10px] md:text-xs text-black/50">{date}</p>
      </section>
    </section>
  );
}
