import { useCallback, useEffect, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { useCreateCampaignStore } from "@/stores/create-campaign.store";
import { CAMPAIGN_STATUS, type CampaignStatus } from "@/utils/campaign-status";

type CampaignByIdResponse =
  | { success?: boolean; data?: any; message?: string; error?: string }
  | any;

function pickCampaignDoc(json: CampaignByIdResponse) {
  if (json && typeof json === "object") {
    if ("data" in json && (json as any).data) return (json as any).data;
  }
  return json;
}

function normalizeStatus(x: any): CampaignStatus {
  const s = String(x ?? "").toLowerCase();
  if (s === CAMPAIGN_STATUS.DRAFT) return CAMPAIGN_STATUS.DRAFT;
  if (s === CAMPAIGN_STATUS.LIVE) return CAMPAIGN_STATUS.LIVE;
  if (s === CAMPAIGN_STATUS.PAUSED) return CAMPAIGN_STATUS.PAUSED;
  if (s === CAMPAIGN_STATUS.ENDED) return CAMPAIGN_STATUS.ENDED;
  if (s === CAMPAIGN_STATUS.ARCHIVED) return CAMPAIGN_STATUS.ARCHIVED;
  if (s === CAMPAIGN_STATUS.DELETED) return CAMPAIGN_STATUS.DELETED;
  return CAMPAIGN_STATUS.DRAFT;
}

export function useCampaignById(campaignId: string | null | undefined) {
  const setCampaignStatus = useCreateCampaignStore((s) => s.setCampaignStatus);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_BACKEND_URL;

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) return null;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}${endpoints.campaigns.getCampaignByIdOwner(campaignId)}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json = await res.json().catch(() => null);
      if (!res.ok || (json && json.success === false)) {
        throw new Error(
          json?.error || json?.message || "Failed to fetch campaign"
        );
      }

      const doc = pickCampaignDoc(json);
      const status = normalizeStatus(doc?.status);

      // ✅ store status from GET only
      setCampaignStatus(status);

      return doc;
    } catch (e: any) {
      setError(e?.message || "Server error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE, campaignId, setCampaignStatus]);

  useEffect(() => {
    // auto fetch when id changes
    if (!campaignId) return;
    fetchCampaign();
  }, [campaignId, fetchCampaign]);

  return {
    loading,
    error,
    refetch: fetchCampaign,
  };
}
