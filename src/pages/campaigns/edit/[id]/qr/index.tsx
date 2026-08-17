import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { ArrowRight } from "lucide-react";

import CampaignLayout, { CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { endpoints } from "@/api/endpoints";
import { cn } from "@/lib/utils";
import { SimpleTooltip } from "@/components/commons/tooltip/simple-tooltip";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { SkeletonSpan } from "@/components/commons/skeleton/span";
import { SkeletonCard } from "@/components/commons/skeleton/card";
import CreateCampaignQrModal from "@/components/modals/campaign-qr/create";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { normalizeCampaignBlockedStateFromResponse } from "@/lib/campaign";

const MAX_QR_PER_CAMPAIGN = 10;

function pickEntries(resp: any) {
  return resp?.data?.data?.entries ?? [];
}

export default function AllCampaignQrPage() {
  const navigate = useNavigate();
  const params = useParams();
  const campaignId = String(params.id ?? "");

  const [currentCreateCampaignId, setCurrentCreateCampaignId] = useState<
    string | null
  >(null);

  const [activeTab, setActiveTab] = useState<CampaignTabKey>("qr-library");
  const {
    campaignName,
    permissions,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading,
  } = useCampaignByOwner(campaignId);

  const {
    data: campaignQrList,
    isLoading: isCampaignQrLoading,
    refetch: refetchCampaignQrList,
  } = useApiQuery(
    endpoints.campaigns.campaignQr.getCampaignQrListById({
      page: "1",
      pageSize: "10",
      belongsToCampaignIds: campaignId,
    }),
    {
      enabled:
        !!campaignId && !isLoading && !isBasic && !isPaymentRequired,
      queryKey: [
        endpoints.campaigns.campaignQr.getCampaignQrListById({
          page: "1",
          pageSize: "10",
          belongsToCampaignIds: campaignId,
        }),
      ],
    } as any,
  );

  const filteredCampaignQrList = useMemo(
    () => pickEntries(campaignQrList),
    [campaignQrList],
  );
  const qrBlockedState = useMemo(
    () => normalizeCampaignBlockedStateFromResponse(campaignQrList),
    [campaignQrList],
  );
  const showPaymentRequired =
    isPaymentRequired || qrBlockedState?.kind === "payment_required";

  const qrCreatePerm = permissions.campaignQr.create;

  const qrCount = filteredCampaignQrList?.length ?? 0;
  const isLimitReached = qrCount >= MAX_QR_PER_CAMPAIGN;

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    if (!campaignId) return;
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const openCreateModal = () => setCurrentCreateCampaignId(campaignId);

  const closeCreateModal = () => {
    refetchCampaignQrList();
    setCurrentCreateCampaignId(null);
  };

  const headerTooltip = isLimitReached
    ? `(${qrCount}/${MAX_QR_PER_CAMPAIGN}) QR limit reached for this campaign.`
    : "Add a new QR";

  const hasQrs = !isNaN(qrCount) && qrCount > 0;

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab={activeTab}
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => console.log("Rewards")}
    >
      {campaignId && !isBasic && !showPaymentRequired && (
        <CreateCampaignQrModal
          campaignId={currentCreateCampaignId}
          onClose={closeCreateModal}
        />
      )}

      {showPaymentRequired ? (
        <div className="mx-2 rounded-xl bg-[#F5F5F5] p-3">
          <CampaignPaymentRequiredPrompt
            campaignId={campaignId}
            featureName="QR Library"
            isMainOwner={isMainOwner}
            billingMode={billingMode}
          />
        </div>
      ) : isBasic ? (
        <div className="mx-2 rounded-xl bg-[#F5F5F5] p-3">
          <BasicFeatureUpgradePrompt
            campaignId={campaignId}
            featureName="QR Library"
            isMainOwner={isMainOwner}
          />
        </div>
      ) : (
        <div className="mx-2 flex flex-col gap-3 rounded-xl bg-[#F5F5F5] p-3">
          <div className="flex items-center justify-between gap-5">
            <h1 className="font-bold">
              Manage QR Library (
              <>
                {isCampaignQrLoading ? (
                  <SkeletonSpan className="mx-2 h-4 w-12" />
                ) : (
                  qrCount
                )}
                /{MAX_QR_PER_CAMPAIGN}
              </>
              )
            </h1>

            {qrCreatePerm ? (
              <SimpleTooltip message={headerTooltip}>
                <button
                  onClick={openCreateModal}
                  disabled={isLimitReached}
                  className="cursor-pointer rounded-full bg-[#E4F2DF] px-5 py-2.5 text-sm font-semibold text-[#315326] duration-200 hover:bg-[#CDE0C7] disabled:cursor-not-allowed disabled:bg-[#E9E9E9] disabled:text-[#3C3C3C]"
                >
                  + Add a QR
                </button>
              </SimpleTooltip>
            ) : (
              <PermissionDisabledTooltip hasPermission={false}>
                <button
                  onClick={() => {}}
                  className="rounded-full bg-[#E4F2DF] px-5 py-2.5 text-sm font-semibold text-[#315326]"
                >
                  + Add a QR
                </button>
              </PermissionDisabledTooltip>
            )}
          </div>
          <div
            className={cn(
              "grid gap-x-3 gap-y-6",
              hasQrs ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
            )}
          >
            {isCampaignQrLoading ? (
              Array.from({ length: MAX_QR_PER_CAMPAIGN }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))
            ) : hasQrs ? (
              filteredCampaignQrList.map((qr: any) => (
                <QRCard
                  key={qr._id}
                  _id={qr._id}
                  isActive={qr.isActive}
                  name={qr.name}
                  totalScans={qr.allVisitorCounts}
                  campaignId={campaignId}
                />
              ))
            ) : qrCreatePerm ? (
              <SimpleTooltip
                message={
                  isLimitReached
                    ? `(${qrCount}/${MAX_QR_PER_CAMPAIGN}) QR limit reached for this campaign.`
                    : "Add a new Campaign QR"
                }
              >
                <div
                  onClick={() => {
                    if (isLimitReached) return;
                    openCreateModal();
                  }}
                  className={cn(
                    "col-span-full flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 py-10 text-sm text-gray-500 hover:underline",
                    isLimitReached && "cursor-not-allowed opacity-60",
                  )}
                >
                  Add a new Campaign QR
                </div>
              </SimpleTooltip>
            ) : (
              <PermissionDisabledTooltip hasPermission={false}>
                <div
                  onClick={() => {}}
                  className="col-span-full flex w-full items-center justify-center rounded-lg border border-dashed border-gray-300 py-10 text-sm text-gray-500"
                >
                  Add a new Campaign QR
                </div>
              </PermissionDisabledTooltip>
            )}
          </div>
        </div>
      )}
    </CampaignLayout>
  );
}

const QRCard = ({
  _id,
  isActive = true,
  name,
  totalScans = 0,
  campaignId,
}: {
  _id: string;
  isActive: boolean;
  name: string;
  totalScans: number;
  campaignId: string;
}) => {
  const navigate = useNavigate();

  const goToDetail = () => {
    const url = `/campaigns/edit/${campaignId}/qr/${_id}`;
    navigate(url);
  };

  return (
    <div
      className={cn(
        { "bg-white": isActive, "bg-[#F5F5F5]": !isActive },
        "flex justify-between shadow-sm hover:shadow-md transition-all duration-200 gap-5 border border-[#0000000D] rounded-xl p-3 cursor-pointer min-w-[21rem] max-w-[30rem]",
      )}
      onClick={goToDetail}
    >
      <div className="flex flex-col justify-between w-full">
        <div className="flex flex-col gap-1">
          <span
            className={cn("rounded-full text-xs px-2 py-0.5 w-fit", {
              "text-[#006326] bg-[#C0F3DF]": isActive,
              "text-[#313131] bg-[#D9D9D9]": !isActive,
            })}
          >
            {isActive ? "Active" : "Inactive"}
          </span>

          <SimpleTooltip message={name}>
            <p className="font-normal line-clamp-2">{name}</p>
          </SimpleTooltip>
        </div>

        <div className="flex justify-between gap-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400">Total Scans</span>
            <span className="text-normal font-bold">{totalScans}</span>
          </div>

          <div className="rounded-full h-fit w-fit px-3 py-1 bg-[#A2A2A233] text-[#282729] self-end hover:shadow-sm">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="aspect-square rounded-lg shrink-0">
        <QRCode
          size={150}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          value={QRURLBuilder({ campaignId, qrId: _id })}
          viewBox={`0 0 150 150`}
        />
      </div>
    </div>
  );
};

export const QRURLBuilder = ({
  campaignId,
  qrId,
}: {
  campaignId: string;
  qrId: string;
}): string => {
  const baseUrl = String(import.meta.env.VITE_CLIENT_URL);
  if (!campaignId || !qrId) return "";
  return `${baseUrl}/campaigns/all-campaigns/${campaignId}?qr=${qrId}`;
};

export function downloadQRCode(
  qrRef: React.RefObject<SVGSVGElement>,
  fileName: string,
) {
  if (!qrRef.current) return;

  const svg = qrRef.current.querySelector("svg");
  if (!svg) return;

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);

  const canvas = document.createElement("canvas");
  const size = 300;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `qr-${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  img.src = url;
}
