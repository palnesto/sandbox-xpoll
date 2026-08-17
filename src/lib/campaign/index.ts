import apiInstance from "@/api/queryClient";

export * from "./access";
export * from "./social";
export * from "./social-ui";

export const markCampaignQrVisitFromUrl = async () => {
  const params = new URLSearchParams(window.location.search);
  const campaignQrId = params.get("qr");
  if (!campaignQrId) {
    return;
  }
  const response = await apiInstance.post("/external/campaigns/qr/visit", {
    campaignQrId,
  });

  return response.data;
};
