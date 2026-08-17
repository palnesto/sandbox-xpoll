import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useParams } from "react-router-dom";
import { throttle } from "lodash";
import QRCode from "react-qr-code";
import CampaignLayout, { CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import { endpoints } from "@/api/endpoints";
import CommonButton from "@/components/commons/CommonButton";
import { SimpleTooltip } from "@/components/commons/tooltip/simple-tooltip";
import { PermissionDisabledTooltip } from "@/components/commons/permission-disabled-tooltip";
import { LevelSelect } from "@/components/commons/selects/level-select";
import { SkeletonSpan } from "@/components/commons/skeleton/span";
import EditCampaignQrModal from "@/components/modals/campaign-qr/edit";
import { BasicFeatureUpgradePrompt } from "@/components/campaign/basic-feature-upgrade-prompt";
import { CampaignPaymentRequiredPrompt } from "@/components/campaign/campaign-payment-required-prompt";
import { normalizeCampaignBlockedStateFromResponse } from "@/lib/campaign";
import { downloadQRCode, QRURLBuilder } from ".";

export function pickDataRoot(resp: any) {
  return resp?.data?.data ?? null;
}

export default function EditCampaignQrDetailPage() {
  const params = useParams();
  const campaignId = String(params?.id ?? "");
  const qrId = String(params?.qrId ?? "");

  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement | null>(null);

  const [editQrId, setEditQrId] = useState<string | null>(null);
  const [levelId, setLevelId] = useState(1);
  const [activeTab, setActiveTab] = useState<CampaignTabKey>("qr-library");

  const {
    permissions,
    isBasic,
    isMainOwner,
    isPaymentRequired,
    billingMode,
    isLoading,
  } = useCampaignByOwner(campaignId);
  const qrEditPerm = permissions.campaignQr.edit;

  const {
    data: campaignQrIdData,
    isLoading: isCampaignQrIdLoading,
    refetch: refetchCampaignQrIdData,
  } = useApiQuery(endpoints.campaigns.campaignQr.getCampaignQrById(qrId), {
    enabled: !!qrId && !isLoading && !isBasic && !isPaymentRequired,
    queryKey: [endpoints.campaigns.campaignQr.getCampaignQrById(qrId)],
  } as any);

  const filteredCampaignQrIdData = useMemo(
    () => pickDataRoot(campaignQrIdData),
    [campaignQrIdData],
  );

  const { data: campaignQrStatsData, isLoading: isCampaignQrStatsLoading } =
    useApiQuery(
      endpoints.campaigns.campaignQr.getCampaignQrStats({
        campaignQrIds: qrId,
      }),
      {
        enabled: !!qrId && !isLoading && !isBasic && !isPaymentRequired,
        queryKey: [
          endpoints.campaigns.campaignQr.getCampaignQrStats({
            campaignQrIds: qrId,
          }),
        ],
      } as any,
    );

  const filteredCampaignQrStatsData = useMemo(() => {
    if (!campaignQrStatsData) return null;
    return campaignQrStatsData?.data?.data?.[0]?.[qrId] ?? null;
  }, [campaignQrStatsData, qrId]);
  const qrBlockedState = useMemo(
    () =>
      normalizeCampaignBlockedStateFromResponse(campaignQrIdData) ??
      normalizeCampaignBlockedStateFromResponse(campaignQrStatsData),
    [campaignQrIdData, campaignQrStatsData],
  );
  const showPaymentRequired =
    isPaymentRequired || qrBlockedState?.kind === "payment_required";

  const title = useMemo(() => {
    if (!campaignId) return "QR";
    return `QR • ${campaignId}`;
  }, [campaignId]);

  const throttledDownload = useMemo(
    () =>
      throttle(
        (ref: React.RefObject<HTMLDivElement>, id: string) => {
          downloadQRCode(ref, id);
        },
        2000,
        { trailing: false },
      ),
    [],
  );

  useEffect(() => {
    return () => throttledDownload.cancel();
  }, [throttledDownload]);

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    if (!campaignId) return;
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const qrDocId = filteredCampaignQrIdData?._id;
  const isActive = filteredCampaignQrIdData?.isActive;

  const closeEditModal = () => {
    refetchCampaignQrIdData();
    setEditQrId(null);
  };

  const download = () => {
    if (!qrDocId) return;
    throttledDownload(qrRef, qrDocId);
  };

  console.log({ qrDocId, editQrId, filteredCampaignQrIdData });
  const openEdit = () => setEditQrId(qrId);

  const totalScans = filteredCampaignQrStatsData?.allVisitorCounts ?? 0;
  const totalUniqueScans =
    filteredCampaignQrStatsData?.uniqueVisitorCounts ?? 0;

  const levelScans =
    filteredCampaignQrStatsData?.levelWise?.[levelId]?.allVisitorCounts ?? 0;
  const levelUniqueScans =
    filteredCampaignQrStatsData?.levelWise?.[levelId]?.uniqueVisitorCounts ?? 0;

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={title}
      activeTab={activeTab}
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => console.log("Rewards")}
    >
      {qrDocId && !isBasic && !showPaymentRequired && (
        <EditCampaignQrModal qrId={editQrId} onClose={closeEditModal} />
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
        <div className="mx-2 flex flex-col items-center gap-3 rounded-xl bg-[#F5F5F5] p-3">
          <div className="grid w-full max-w-[60rem] gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="col-span-2 flex flex-col items-center gap-3 rounded-xl border border-[#0000000D] bg-white p-3">
              <span
                className={cn("w-fit rounded-full px-2 py-0.5 text-xs", {
                  "bg-[#C0F3DF] text-[#006326]": isActive,
                  "bg-[#D9D9D9] text-[#313131]": !isActive,
                })}
              >
                {isActive ? "Active" : "Inactive"}
              </span>

              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-2 text-[#535353]">
                  <SimpleTooltip message={filteredCampaignQrIdData?.name}>
                    <p className="line-clamp-2 text-center font-semibold">
                      {filteredCampaignQrIdData?.name}
                    </p>
                  </SimpleTooltip>

                  {filteredCampaignQrIdData?.description && (
                    <SimpleTooltip
                      message={filteredCampaignQrIdData?.description}
                    >
                      <p className="line-clamp-2 text-center text-sm font-normal">
                        {filteredCampaignQrIdData?.description}
                      </p>
                    </SimpleTooltip>
                  )}
                </div>

                <div className="flex flex-col gap-2" />

                <div className="h-52 w-52 shrink-0 rounded-lg border border-[#0000000D] p-2 aspect-square">
                  <div ref={qrRef}>
                    <QRCode
                      size={150}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      value={QRURLBuilder({ campaignId, qrId: qrDocId })}
                      viewBox={`0 0 150 150`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex w-full items-center justify-center gap-2 pt-2">
                <div className="w-full max-w-56">
                  <CommonButton
                    text="Download"
                    className="w-full py-3 font-normal"
                    onClick={download}
                  />
                </div>
                <div className="w-full max-w-56">
                  <PermissionDisabledTooltip hasPermission={qrEditPerm}>
                    <CommonButton
                      text="Edit QR"
                      className="w-full py-3 font-normal"
                      onClick={openEdit}
                    />
                  </PermissionDisabledTooltip>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex w-full flex-col gap-3 bg-[#F5F5F5]">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#0000000D]">
                <div className="col-span-1 flex max-h-52 flex-col justify-between gap-3 rounded-xl border border-[#0000000D] bg-white p-3">
                  <p className="text-2xl font-light text-gray-500">Total Scans</p>
                  <p className="text-4xl font-bold">
                    {!isCampaignQrStatsLoading ? totalScans : <SkeletonSpan />}
                  </p>
                </div>

                <div className="col-span-1 flex max-h-52 flex-col justify-between gap-3 rounded-xl border border-[#0000000D] bg-white p-3">
                  <p className="text-2xl font-light text-gray-500">
                    Total Unique Scans
                  </p>
                  <p className="text-4xl font-bold">
                    {!isCampaignQrStatsLoading ? (
                      totalUniqueScans
                    ) : (
                      <SkeletonSpan />
                    )}
                  </p>
                </div>
              </div>

              <div className="col-span-2 flex h-full w-full flex-col gap-2 rounded-xl border border-[#0000000D] bg-white p-3">
                <div className="flex items-center justify-between gap-5">
                  <p className="uppercase">LEVEL WISE SCANS</p>
                  <LevelSelect
                    value={levelId}
                    onChange={(id) => setLevelId(id)}
                  />
                </div>

                <div className="grid h-full grid-cols-2 gap-5">
                  <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-[#0000000D] bg-[#F5F5F5] p-3">
                    <p className="text-xl font-light text-gray-500">
                      Total Scans
                    </p>
                    <p className="text-3xl font-bold">
                      {!isCampaignQrStatsLoading ? levelScans : <SkeletonSpan />}
                    </p>
                  </div>

                  <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-[#0000000D] bg-[#F5F5F5] p-3">
                    <p className="text-xl font-light text-gray-500">
                      Total Unique Scans
                    </p>
                    <p className="text-3xl font-bold">
                      {!isCampaignQrStatsLoading ? (
                        levelUniqueScans
                      ) : (
                        <SkeletonSpan />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </CampaignLayout>
  );
}
