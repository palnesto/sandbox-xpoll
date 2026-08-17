import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { CampaignSocialFeedbackCard } from "@/components/campaign/social/campaign-social-feedback-card";
import { CampaignSocialPanel } from "@/components/campaign/social/campaign-social-panel";
import CampaignActionConfirmModal from "@/components/modals/ConfirmCampaignActionModal";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCampaignByOwner } from "@/hooks/useCampaignByOwner";
import CampaignLayout, { type CampaignTabKey } from "@/layouts/campaign-layout";
import { navigateCampaignEditTab } from "@/lib/campaign-edit-tabs";
import {
  connectCampaignSocial,
  countConnectedCampaignSocialPlatforms,
  finalizeCampaignSocial,
  isCampaignSocialManageEligible,
  readCampaignSocialErrorCode,
  readCampaignSocialErrorMessage,
  setCampaignSocialPlatformPreference,
} from "@/lib/campaign/social";
import { getCampaignSocialRecoveryTarget } from "@/lib/campaign/social-ui";
import {
  pickDataRoot,
  type ApiCampaignById,
  type ApiCampaignSocialStatus,
  type CampaignSocialPlatformKey,
} from "@/types/campaigns";
import { Button } from "@/components/ui/button";

type SocialBannerState = {
  kind:
    | "popup-open"
    | "popup-closed"
    | "callback-finalizing"
    | "callback-success"
    | "callback-no-accounts"
    | "callback-invalid"
    | "callback-expired"
    | "callback-failed"
    | "callback-retry"
    | "connect-error"
    | "preference-success"
    | "preference-error";
  sessionId?: string | null;
  message?: string | null;
  code?: string | null;
  platform?: CampaignSocialPlatformKey | null;
  enabled?: boolean;
} | null;

type PlatformPreferenceModalState = {
  platform: CampaignSocialPlatformKey;
  nextEnabled: boolean;
} | null;

const PLATFORM_LABELS: Record<CampaignSocialPlatformKey, string> = {
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
};

const CAMPAIGN_SOCIAL_POPUP_MESSAGE_TYPE = "campaign-social-linked";

type CampaignSocialPopupOutcome =
  | "connected"
  | "no_accounts"
  | "invalid"
  | "expired"
  | "failed";

type CampaignSocialPopupMessage = {
  type: typeof CAMPAIGN_SOCIAL_POPUP_MESSAGE_TYPE;
  campaignId: string;
  sessionId: string;
  outcome: CampaignSocialPopupOutcome;
};

function wrapQueryData<T>(data: T) {
  return {
    data: {
      data,
    },
  };
}

function buildCampaignSocialReturnToPath(
  pathname: string,
  searchParams: URLSearchParams,
) {
  const nextSearch = new URLSearchParams(searchParams);
  nextSearch.delete("session");
  const search = nextSearch.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
}

function getRecoveryReasonFromErrorCode(code: string | null) {
  switch (code) {
    case "CAMPAIGN_SOCIAL_UPGRADE_REQUIRED":
      return "upgrade_required";
    case "CAMPAIGN_SOCIAL_PAYMENT_REQUIRED":
      return "payment_required";
    case "CAMPAIGN_SOCIAL_MAIN_OWNER_REQUIRED":
      return "main_owner_only";
    case "CAMPAIGN_SOCIAL_CAMPAIGN_CLOSED":
      return "campaign_closed";
    default:
      return null;
  }
}

function shouldRefreshSocialStateAfterError(code: string | null) {
  return (
    getRecoveryReasonFromErrorCode(code) != null ||
    code === "CAMPAIGN_SOCIAL_PROFILE_NOT_CONNECTED" ||
    code === "CAMPAIGN_SOCIAL_PLATFORM_NOT_CONNECTED" ||
    code === "CAMPAIGN_SOCIAL_NO_PUBLISHABLE_PLATFORMS"
  );
}

function shouldClosePreferenceModalAfterError(code: string | null) {
  return (
    getRecoveryReasonFromErrorCode(code) != null ||
    code === "CAMPAIGN_SOCIAL_PLATFORM_NOT_CONNECTED"
  );
}

function shouldUseCampaignSocialPopupWindow() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const mobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent ?? "",
    );

  return !coarsePointer && !mobileUserAgent;
}

function buildCampaignSocialPopupWindowName(campaignId: string) {
  return `xpoll-campaign-social-${campaignId}`;
}

function buildCampaignSocialPopupWindowFeatures() {
  if (typeof window === "undefined") {
    return "popup=yes,resizable=yes,scrollbars=yes,width=560,height=820";
  }

  const width = Math.min(560, Math.max(420, window.outerWidth - 120));
  const height = Math.min(820, Math.max(640, window.outerHeight - 80));
  const left = Math.max(
    window.screenX + Math.round((window.outerWidth - width) / 2),
    0,
  );
  const top = Math.max(
    window.screenY + Math.round((window.outerHeight - height) / 2),
    0,
  );

  return [
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
  ].join(",");
}

function primeCampaignSocialPopupWindow(popupWindow: Window) {
  try {
    popupWindow.document.title = "Opening Upload Post...";
    popupWindow.document.body.innerHTML =
      '<div style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#0f172a;font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">Opening Upload Post for this campaign...</div>';
  } catch {
    // Ignore browser restrictions while the popup is transitioning origins.
  }
}

function readCampaignSocialPopupOutcomeBannerState(
  outcome: CampaignSocialPopupOutcome,
  sessionId: string,
): SocialBannerState {
  switch (outcome) {
    case "connected":
      return { kind: "callback-success", sessionId };
    case "no_accounts":
      return { kind: "callback-no-accounts", sessionId };
    case "invalid":
      return { kind: "callback-invalid", sessionId };
    case "expired":
      return { kind: "callback-expired", sessionId };
    case "failed":
      return { kind: "callback-failed", sessionId };
    default:
      return null;
  }
}

export default function EditCampaignSocialPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams();
  const campaignId = String(id ?? "");
  const [activeTab, setActiveTab] = useState<CampaignTabKey>("social");
  const [bannerState, setBannerState] = useState<SocialBannerState>(null);
  const [connectPending, setConnectPending] = useState(false);
  const [preferenceModal, setPreferenceModal] =
    useState<PlatformPreferenceModalState>(null);
  const [preferenceModalError, setPreferenceModalError] = useState<
    string | null
  >(null);
  const [preferencePendingPlatform, setPreferencePendingPlatform] =
    useState<CampaignSocialPlatformKey | null>(null);
  const handledSessionRef = useRef<string | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const popupMonitorIntervalRef = useRef<number | null>(null);
  const popupAwaitingResultRef = useRef(false);

  const supportsPopupFlow = useMemo(
    () => shouldUseCampaignSocialPopupWindow(),
    [],
  );
  const isPopupChildWindow = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.opener && window.opener !== window;
  }, []);

  const {
    campaignName,
    campaignData,
    refetch: refetchCampaign,
  } = useCampaignByOwner(campaignId, {
    refetchOnWindowFocus: true,
  });

  const socialRoute = campaignId
    ? endpoints.campaigns.getCampaignSocial(campaignId)
    : "";
  const ownerRoute = campaignId
    ? endpoints.campaigns.getCampaignByIdOwner(campaignId)
    : "";
  const {
    data: socialResp,
    isLoading: socialLoading,
    isError: socialError,
    refetch: refetchSocial,
  } = useApiQuery(socialRoute, {
    enabled: !!campaignId,
    retry: false,
    queryKey: [socialRoute],
    refetchOnWindowFocus: true,
  });
  const socialStatus = useMemo(
    () => pickDataRoot<ApiCampaignSocialStatus>(socialResp),
    [socialResp],
  );
  const effectiveSocialStatus = socialStatus;
  const sessionIdFromQuery =
    String(searchParams.get("session") ?? "").trim() || null;
  const actionsBlocked = !!(
    connectPending ||
    preferencePendingPlatform ||
    bannerState?.kind === "callback-finalizing"
  );

  const primeSocialCaches = useCallback(
    (nextSocial: ApiCampaignSocialStatus) => {
      if (!socialRoute) return;

      queryClient.setQueryData([socialRoute], wrapQueryData(nextSocial));

      if (!ownerRoute) return;

      queryClient.setQueryData([ownerRoute], (current: unknown) => {
        const currentCampaign =
          pickDataRoot<ApiCampaignById>(current) ?? campaignData ?? null;

        if (!currentCampaign) return current;

        return wrapQueryData({
          ...currentCampaign,
          uploadPostProfile: nextSocial.uploadPostProfile ?? null,
        });
      });
    },
    [campaignData, ownerRoute, socialRoute],
  );

  const refreshSocialQueries = useCallback(async () => {
    await Promise.all([
      socialRoute
        ? queryClient.invalidateQueries({ queryKey: [socialRoute] })
        : Promise.resolve(),
      ownerRoute
        ? queryClient.invalidateQueries({ queryKey: [ownerRoute] })
        : Promise.resolve(),
    ]);

    await Promise.all([refetchSocial(), refetchCampaign()]);
  }, [ownerRoute, refetchCampaign, refetchSocial, socialRoute]);

  const refreshSocialQueriesSafely = useCallback(async () => {
    try {
      await refreshSocialQueries();
    } catch {
      // Keep the current mutation result on screen even if the follow-up refetch fails.
    }
  }, [refreshSocialQueries]);

  const stopPopupMonitoring = useCallback(() => {
    if (popupMonitorIntervalRef.current != null) {
      window.clearInterval(popupMonitorIntervalRef.current);
      popupMonitorIntervalRef.current = null;
    }
    popupAwaitingResultRef.current = false;
  }, []);

  const startPopupMonitoring = useCallback(
    (popupWindow: Window) => {
      stopPopupMonitoring();
      popupWindowRef.current = popupWindow;
      popupAwaitingResultRef.current = true;

      popupMonitorIntervalRef.current = window.setInterval(() => {
        const currentPopup = popupWindowRef.current;
        if (!popupAwaitingResultRef.current) return;
        if (currentPopup && !currentPopup.closed) return;

        popupWindowRef.current = null;
        stopPopupMonitoring();
        setBannerState((currentBanner) =>
          currentBanner?.kind === "popup-open"
            ? {
                kind: "popup-closed",
              }
            : currentBanner,
        );
      }, 1000);
    },
    [stopPopupMonitoring],
  );

  const stripSessionParam = useCallback(
    (sessionId: string) => {
      const currentSession = String(searchParams.get("session") ?? "").trim();
      if (!currentSession || currentSession !== sessionId) return;

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("session");
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const postPopupOutcomeToOpener = useCallback(
    (sessionId: string, outcome: CampaignSocialPopupOutcome) => {
      if (
        !isPopupChildWindow ||
        typeof window === "undefined" ||
        !window.opener
      ) {
        return;
      }

      const message: CampaignSocialPopupMessage = {
        type: CAMPAIGN_SOCIAL_POPUP_MESSAGE_TYPE,
        campaignId,
        sessionId,
        outcome,
      };
      window.opener.postMessage(message, window.location.origin);
    },
    [campaignId, isPopupChildWindow],
  );

  const handleFinalizeSession = useCallback(
    async (sessionId: string) => {
      setBannerState({
        kind: "callback-finalizing",
        sessionId,
      });

      try {
        const result = await finalizeCampaignSocial(campaignId, sessionId);
        primeSocialCaches(result.social);
        await refreshSocialQueriesSafely();

        const connectedCount = countConnectedCampaignSocialPlatforms(
          result.social.uploadPostProfile,
        );
        const outcome: CampaignSocialPopupOutcome =
          connectedCount > 0 ? "connected" : "no_accounts";

        if (isPopupChildWindow) {
          setBannerState(
            outcome === "connected"
              ? { kind: "callback-success", sessionId }
              : { kind: "callback-no-accounts", sessionId },
          );
          postPopupOutcomeToOpener(sessionId, outcome);
          window.setTimeout(() => {
            window.close();
          }, 0);
          return;
        }

        setBannerState({
          kind:
            connectedCount > 0 ? "callback-success" : "callback-no-accounts",
          sessionId,
        });
      } catch (error) {
        const errorCode = readCampaignSocialErrorCode(error);
        if (errorCode === "CAMPAIGN_SOCIAL_LINK_SESSION_NOT_FOUND") {
          if (isPopupChildWindow) {
            postPopupOutcomeToOpener(sessionId, "invalid");
          }
          setBannerState({
            kind: "callback-invalid",
            sessionId,
          });
        } else if (errorCode === "CAMPAIGN_SOCIAL_LINK_SESSION_EXPIRED") {
          if (isPopupChildWindow) {
            postPopupOutcomeToOpener(sessionId, "expired");
          }
          setBannerState({
            kind: "callback-expired",
            sessionId,
          });
        } else if (errorCode === "CAMPAIGN_SOCIAL_LINK_SESSION_FAILED") {
          if (isPopupChildWindow) {
            postPopupOutcomeToOpener(sessionId, "failed");
          }
          setBannerState({
            kind: "callback-failed",
            sessionId,
          });
        } else {
          setBannerState({
            kind: "callback-retry",
            sessionId,
            message: readCampaignSocialErrorMessage(
              error,
              "We couldn’t confirm this social connection yet.",
            ),
          });
        }
      } finally {
        stripSessionParam(sessionId);
      }
    },
    [
      campaignId,
      isPopupChildWindow,
      postPopupOutcomeToOpener,
      primeSocialCaches,
      refreshSocialQueriesSafely,
      stripSessionParam,
    ],
  );

  useEffect(() => {
    if (!campaignId || !sessionIdFromQuery) return;
    if (handledSessionRef.current === sessionIdFromQuery) return;

    handledSessionRef.current = sessionIdFromQuery;
    void handleFinalizeSession(sessionIdFromQuery);
  }, [campaignId, handleFinalizeSession, sessionIdFromQuery]);

  useEffect(() => {
    if (isPopupChildWindow || typeof window === "undefined" || !campaignId) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const payload = event.data as CampaignSocialPopupMessage | null;
      if (!payload || typeof payload !== "object") return;
      if (payload.type !== CAMPAIGN_SOCIAL_POPUP_MESSAGE_TYPE) return;
      if (payload.campaignId !== campaignId) return;
      if (
        popupWindowRef.current &&
        event.source &&
        event.source !== popupWindowRef.current
      ) {
        return;
      }

      popupWindowRef.current = null;
      stopPopupMonitoring();
      setConnectPending(false);
      setBannerState(
        readCampaignSocialPopupOutcomeBannerState(
          payload.outcome,
          payload.sessionId,
        ),
      );
      void refreshSocialQueriesSafely();
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    campaignId,
    isPopupChildWindow,
    refreshSocialQueriesSafely,
    stopPopupMonitoring,
  ]);

  useEffect(() => {
    return () => {
      stopPopupMonitoring();
      popupWindowRef.current = null;
    };
  }, [stopPopupMonitoring]);

  const goTab = (tab: CampaignTabKey) => {
    setActiveTab(tab);
    navigateCampaignEditTab(navigate, campaignId, tab);
  };

  const handleConnect = useCallback(async () => {
    if (!campaignId) return;

    if (
      supportsPopupFlow &&
      !isPopupChildWindow &&
      popupAwaitingResultRef.current &&
      popupWindowRef.current &&
      !popupWindowRef.current.closed
    ) {
      popupWindowRef.current.focus();
      setBannerState({
        kind: "popup-open",
      });
      return;
    }

    const shouldLaunchPopup = supportsPopupFlow && !isPopupChildWindow;
    let popupWindow: Window | null = null;
    if (shouldLaunchPopup) {
      popupWindow = window.open(
        "",
        buildCampaignSocialPopupWindowName(campaignId),
        buildCampaignSocialPopupWindowFeatures(),
      );
      if (popupWindow) {
        primeCampaignSocialPopupWindow(popupWindow);
      }
    }

    setConnectPending(true);
    setBannerState(null);

    try {
      const result = await connectCampaignSocial(campaignId, {
        returnToPath: buildCampaignSocialReturnToPath(
          location.pathname,
          searchParams,
        ),
      });

      if (popupWindow && !popupWindow.closed) {
        popupWindowRef.current = popupWindow;
        popupWindow.location.href = result.accessUrl;
        popupWindow.focus();
        startPopupMonitoring(popupWindow);
        setBannerState({
          kind: "popup-open",
        });
        return;
      }

      if (popupWindow?.closed) {
        popupWindowRef.current = null;
        setBannerState({
          kind: "popup-closed",
        });
        return;
      }

      window.location.assign(result.accessUrl);
    } catch (error) {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      popupWindowRef.current = null;
      stopPopupMonitoring();

      const code = readCampaignSocialErrorCode(error);
      if (shouldRefreshSocialStateAfterError(code)) {
        await refreshSocialQueriesSafely();
      }

      setBannerState({
        kind: "connect-error",
        code,
        message: readCampaignSocialErrorMessage(
          error,
          "We couldn’t open Upload Post right now.",
        ),
      });
    } finally {
      setConnectPending(false);
    }
  }, [
    campaignId,
    isPopupChildWindow,
    location.pathname,
    refreshSocialQueriesSafely,
    searchParams,
    startPopupMonitoring,
    stopPopupMonitoring,
    supportsPopupFlow,
  ]);

  const focusOrReopenPopupWindow = useCallback(() => {
    const currentPopup = popupWindowRef.current;
    if (currentPopup && !currentPopup.closed) {
      currentPopup.focus();
      return;
    }

    void handleConnect();
  }, [handleConnect]);

  const closePreferenceModal = useCallback(() => {
    if (preferencePendingPlatform) return;
    setPreferenceModal(null);
    setPreferenceModalError(null);
  }, [preferencePendingPlatform]);

  const openPreferenceModal = useCallback(
    (platform: CampaignSocialPlatformKey, nextEnabled: boolean) => {
      if (actionsBlocked) return;
      setBannerState(null);
      setPreferenceModalError(null);
      setPreferenceModal({
        platform,
        nextEnabled,
      });
    },
    [actionsBlocked],
  );

  const handleConfirmPreference = useCallback(async () => {
    if (!campaignId || !preferenceModal) return;

    const platform = preferenceModal.platform;
    const nextEnabled = preferenceModal.nextEnabled;
    const platformLabel = PLATFORM_LABELS[platform];

    setBannerState(null);
    setPreferenceModalError(null);
    setPreferencePendingPlatform(platform);

    try {
      const result = await setCampaignSocialPlatformPreference(campaignId, {
        platform,
        enabled: nextEnabled,
      });
      primeSocialCaches(result.social);
      await refreshSocialQueriesSafely();

      setPreferenceModal(null);
      setBannerState({
        kind: "preference-success",
        platform,
        enabled: nextEnabled,
      });
    } catch (error) {
      const code = readCampaignSocialErrorCode(error);
      if (shouldRefreshSocialStateAfterError(code)) {
        await refreshSocialQueriesSafely();
      }

      const message = readCampaignSocialErrorMessage(
        error,
        `We couldn’t update ${platformLabel} posting yet.`,
      );

      if (shouldClosePreferenceModalAfterError(code)) {
        setPreferenceModal(null);
        setPreferenceModalError(null);
        setBannerState({
          kind: "preference-error",
          platform,
          enabled: nextEnabled,
          code,
          message,
        });
      } else {
        setPreferenceModalError(message);
      }
    } finally {
      setPreferencePendingPlatform(null);
    }
  }, [
    campaignId,
    preferenceModal,
    primeSocialCaches,
    refreshSocialQueriesSafely,
  ]);

  const banner = useMemo(() => {
    if (!bannerState) return null;

    const recoveryReason = getRecoveryReasonFromErrorCode(
      bannerState.code ?? null,
    );
    const recovery = getCampaignSocialRecoveryTarget({
      campaignId,
      socialStatus: effectiveSocialStatus,
      campaign: campaignData,
      reasonOverride: recoveryReason,
    });
    const canReconnect = isCampaignSocialManageEligible(effectiveSocialStatus);
    const actionDisabled = actionsBlocked;

    const renderRecoveryButton = () => (
      <Button
        type="button"
        variant="outline"
        disabled={actionDisabled}
        className="rounded-full border-[#D7DCE2] px-5 text-[#1E293B]"
        onClick={() => navigate(recovery.to)}
      >
        {recovery.label}
      </Button>
    );

    const renderConnectButton = (label: string) => (
      <Button
        type="button"
        disabled={actionDisabled}
        className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
        onClick={handleConnect}
      >
        {connectPending ? "Opening Upload Post..." : label}
      </Button>
    );

    const renderCloseWindowButton = () => (
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-[#D7DCE2] px-5 text-[#1E293B]"
        onClick={() => window.close()}
      >
        Close window
      </Button>
    );

    if (bannerState.kind === "popup-open") {
      return (
        <CampaignSocialFeedbackCard
          tone="info"
          eyebrow="Upload Post is open"
          title="Finish connecting in the Upload Post tab"
          description="Keep this campaign page open. Upload Post is handling the approval flow in another tab, and this page will refresh automatically when it returns."
          actions={
            <Button
              type="button"
              disabled={actionDisabled}
              className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
              onClick={focusOrReopenPopupWindow}
            >
              Open Upload Post
            </Button>
          }
        />
      );
    }

    if (bannerState.kind === "popup-closed") {
      return (
        <CampaignSocialFeedbackCard
          tone="warning"
          eyebrow="Connection interrupted"
          title="The Upload Post tab was closed before the connection finished"
          description="Re-open Upload Post to continue linking or managing this campaign’s social accounts."
          actions={
            canReconnect
              ? renderConnectButton("Re-open Upload Post")
              : renderRecoveryButton()
          }
        />
      );
    }

    if (bannerState.kind === "callback-finalizing") {
      return (
        <CampaignSocialFeedbackCard
          tone="loading"
          eyebrow="Finalizing"
          title="Finalizing campaign social connection"
          description="We’re confirming the latest Upload Post snapshot for this campaign. Please wait while we finish saving the current linked accounts."
        />
      );
    }

    if (bannerState.kind === "callback-success") {
      return (
        <CampaignSocialFeedbackCard
          tone="success"
          eyebrow="Connected"
          title="Campaign social accounts connected"
          description="The latest Upload Post snapshot was saved to this campaign successfully. Use Manage on any platform card to review or update linked accounts through Upload Post, and use posting controls on connected cards to pause or resume posting per platform."
        />
      );
    }

    if (bannerState.kind === "callback-no-accounts") {
      return (
        <CampaignSocialFeedbackCard
          tone="info"
          eyebrow="No accounts yet"
          title="Connection finished, but no accounts are connected"
          description="The Upload Post flow returned successfully, but it did not report any connected X, Instagram, or Facebook accounts for this campaign yet."
          actions={
            canReconnect
              ? renderConnectButton("Connect social accounts")
              : renderRecoveryButton()
          }
        />
      );
    }

    if (bannerState.kind === "callback-invalid") {
      return (
        <CampaignSocialFeedbackCard
          tone="warning"
          eyebrow="Invalid link"
          title="This social connection link is no longer valid"
          description="This link may belong to a different campaign, a different user, or a session that is no longer available. Start a fresh connection from the campaign Social Accounts tab if you still need it."
          actions={
            isPopupChildWindow
              ? renderCloseWindowButton()
              : canReconnect
              ? renderConnectButton("Connect social accounts")
              : renderRecoveryButton()
          }
        />
      );
    }

    if (bannerState.kind === "callback-expired") {
      return (
        <CampaignSocialFeedbackCard
          tone="warning"
          eyebrow="Link expired"
          title="This social connection link has expired"
          description="For security, campaign social connection links can only be used for a limited time. Start a fresh Upload Post connection to continue."
          actions={
            isPopupChildWindow
              ? renderCloseWindowButton()
              : canReconnect
              ? renderConnectButton("Start a new connection")
              : renderRecoveryButton()
          }
        />
      );
    }

    if (bannerState.kind === "callback-failed") {
      return (
        <CampaignSocialFeedbackCard
          tone="danger"
          eyebrow="Connection failed"
          title="This social connection attempt can’t be used anymore"
          description="Upload Post reported that this session can no longer be finalized. Start a fresh connection from the Social Accounts tab to try again."
          actions={
            isPopupChildWindow
              ? renderCloseWindowButton()
              : canReconnect
              ? renderConnectButton("Connect social accounts")
              : renderRecoveryButton()
          }
        />
      );
    }

    if (bannerState.kind === "callback-retry") {
      return (
        <CampaignSocialFeedbackCard
          tone="danger"
          eyebrow="Needs retry"
          title="We couldn’t confirm the social connection yet"
          description={
            bannerState.message ??
            "The connection may still have succeeded, but this page couldn’t finish finalizing it. Retry once to check again."
          }
          actions={
            <>
              <Button
                type="button"
                disabled={actionDisabled}
                className="rounded-full bg-[#117C7C] px-5 text-white hover:bg-[#0F6D6D]"
                onClick={() => {
                  if (!bannerState.sessionId) return;
                  handledSessionRef.current = bannerState.sessionId;
                  void handleFinalizeSession(bannerState.sessionId);
                }}
              >
                Retry finalizing
              </Button>
              {isPopupChildWindow
                ? renderCloseWindowButton()
                : !canReconnect
                  ? renderRecoveryButton()
                  : null}
            </>
          }
        />
      );
    }

    if (bannerState.kind === "connect-error") {
      return (
        <CampaignSocialFeedbackCard
          tone="danger"
          eyebrow="Couldn’t open Upload Post"
          title="Campaign social linking couldn’t start"
          description={
            bannerState.message ??
            "We couldn’t open Upload Post for this campaign right now."
          }
          actions={
            recoveryReason
              ? renderRecoveryButton()
              : canReconnect
                ? renderConnectButton("Try again")
                : renderRecoveryButton()
          }
        />
      );
    }

    if (bannerState.kind === "preference-success") {
      const platformLabel =
        bannerState.platform != null
          ? PLATFORM_LABELS[bannerState.platform]
          : "Platform";
      const postingEnabled = bannerState.enabled === true;

      return (
        <CampaignSocialFeedbackCard
          tone="success"
          eyebrow={postingEnabled ? "Posting enabled" : "Posting paused"}
          title={`${platformLabel} posting updated`}
          description={
            postingEnabled
              ? `${platformLabel} stays connected, and this campaign will keep it available for future posting.`
              : `${platformLabel} stays connected, but this campaign will pause posting to it until you enable posting again.`
          }
        />
      );
    }

    if (bannerState.kind === "preference-error") {
      const platformLabel =
        bannerState.platform != null
          ? PLATFORM_LABELS[bannerState.platform]
          : "This platform";

      if (bannerState.code === "CAMPAIGN_SOCIAL_PLATFORM_NOT_CONNECTED") {
        return (
          <CampaignSocialFeedbackCard
            tone="warning"
            eyebrow="Connection changed"
            title={`${platformLabel} is no longer connected`}
            description={`${platformLabel} has to stay connected before this campaign can change its posting state. Reconnect it through Upload Post if needed.`}
            actions={
              canReconnect
                ? renderConnectButton("Open Upload Post")
                : renderRecoveryButton()
            }
          />
        );
      }

      return (
        <CampaignSocialFeedbackCard
          tone="danger"
          eyebrow="Couldn’t update posting"
          title={`${platformLabel} posting couldn’t be updated`}
          description={
            bannerState.message ??
            `We couldn’t update ${platformLabel} posting right now.`
          }
          actions={
            recoveryReason
              ? renderRecoveryButton()
              : canReconnect
                ? renderConnectButton("Open Upload Post")
                : renderRecoveryButton()
          }
        />
      );
    }

    return null;
  }, [
    bannerState,
    campaignData,
    campaignId,
    actionsBlocked,
    connectPending,
    effectiveSocialStatus,
    focusOrReopenPopupWindow,
    handleConnect,
    handleFinalizeSession,
    isPopupChildWindow,
    navigate,
  ]);

  return (
    <CampaignLayout
      campaignId={campaignId}
      campaignName={campaignName}
      activeTab={activeTab}
      onTabChange={goTab}
      onBack={() => navigate(-1)}
      onRewards={() => {}}
    >
      <div className="mx-2 space-y-4 rounded-xl bg-[#F5F5F5] p-3">
        <CampaignSocialPanel
          campaignId={campaignId}
          campaign={campaignData}
          socialStatus={effectiveSocialStatus}
          isLoading={socialLoading}
          isError={socialError}
          feedback={banner}
          actionsBlocked={actionsBlocked}
          connectPending={connectPending}
          preferencePendingPlatform={preferencePendingPlatform}
          onConnect={() => {
            void handleConnect();
          }}
          onPlatformToggleEnabled={(platform, nextEnabled) => {
            openPreferenceModal(platform, nextEnabled);
          }}
          onRetry={() => {
            void refetchSocial();
          }}
        />
      </div>

      <CampaignActionConfirmModal
        open={preferenceModal != null}
        title={
          preferenceModal
            ? preferenceModal.nextEnabled
              ? `Enable posting to ${PLATFORM_LABELS[preferenceModal.platform]} for this campaign?`
              : `Disable posting to ${PLATFORM_LABELS[preferenceModal.platform]} for this campaign?`
            : "Update posting preference"
        }
        description={
          preferenceModal
            ? preferenceModal.nextEnabled
              ? `${PLATFORM_LABELS[preferenceModal.platform]} will stay connected, and this campaign will start using it for posting again as soon as you enable it.`
              : `${PLATFORM_LABELS[preferenceModal.platform]} will stay connected through Upload Post, but this campaign will pause posting to it until you enable posting again.`
            : undefined
        }
        confirmLabel={
          preferenceModal?.nextEnabled ? "Enable posting" : "Disable posting"
        }
        tone={preferenceModal?.nextEnabled ? "primary" : "secondary"}
        loading={preferencePendingPlatform != null}
        error={preferenceModalError}
        onClose={closePreferenceModal}
        onConfirm={() => {
          void handleConfirmPreference();
        }}
      />
    </CampaignLayout>
  );
}
