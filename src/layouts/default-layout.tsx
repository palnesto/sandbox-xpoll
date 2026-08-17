// src/layouts/default-layout.tsx
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { NAV_ITEMS } from "@/config/navbar";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import ResponsiveNav from "@/components/commons/ResponsiveNav";
import { cn } from "@/lib/utils";
import {
  heightBarsStyles,
  heightBottomBarStyles,
  heightStyles,
} from "@/styles";
import { Loader2 } from "lucide-react";
import {
  RouteOnReachConfig,
  runOnReachForLocation,
  useOnReachTick,
} from "@/lib/redirection/on-reach";
import {
  popAuthIntentIfValid,
  popOnboardingIntentIfValid,
  setOnboardingIntent,
} from "@/lib/redirection/auth-intent";
import {
  logCampaignRuOnlyFromUrl,
  logCampaignRuTrialFromUrl,
} from "@/lib/referral";
import {
  logInkDBlogShareFromUrl,
  logInkDTrialShareFromUrl,
} from "@/lib/referral/inkd-share";
import { logPollRuOnlyFromUrl } from "@/lib/referral/poll";
import { logTrialRuOnlyFromUrl } from "@/lib/referral/trial";
import { markCampaignQrVisitFromUrl } from "@/lib/campaign";

const noTopOn: string[] = [
  "/add-campaign",
  "/add-polls/basic-info",
  "/add-polls/add-options",
  "/add-polls/add-rewards",
  "/add-polls/preview",
  "/exchange/exchange-sui",
  "/exchange/exchange-xrp",
  "/exchange/exchange-aptos",
  "/exchange/exchange-strain",
  "/exchange/transaction-sui",
  "/exchange/transaction-xrp",
  "/exchange/transaction-aptos",
  "/exchange/transaction-strain",
  "/exchange/all-sui-transaction",
  "/exchange/all-xrp-transaction",
  "/exchange/all-aptos-transaction",
  "/exchange/all-strain-transaction",
  "/profile",
  "/profile/civic-score",
  "/profile/level-progress",
  "/profile/exchange-history",
  "/profile/reward-history",
  "/profile/payment",
  "/profile/pledged-tokens",
  "/profile/donation-history",
  "/my-polls",
  "/feed/polls",
  "/disclaimer",
  "/avatar",
  "/preferences",
  "/enquiry",
  "/certificate",
  "/info",
];

const noBottomOn: string[] = [
  "/add-campaign",
  "/add-polls/basic-info",
  "/add-polls/add-options",
  "/add-polls/add-rewards",
  "/add-polls/preview",
  "/exchange/exchange-sui",
  "/exchange/exchange-xrp",
  "/exchange/exchange-aptos",
  "/exchange/exchange-strain",
  "/exchange/transaction-sui",
  "/exchange/transaction-xrp",
  "/exchange/transaction-aptos",
  "/exchange/transaction-strain",
  "/profile/civic-score",
  "/profile/level-progress",
  "/my-polls",
  "/feed/polls",
  "/disclaimer",
  "/avatar",
  "/preferences",
  "/enquiry",
  "/certificate",
  "/info",
];

const noSidebarOn: string[] = [
  "/exchange/exchange-sui",
  "/exchange/exchange-xrp",
  "/exchange/exchange-aptos",
  "/exchange/exchange-strain",
  "/exchange/transaction-sui",
  "/exchange/transaction-xrp",
  "/exchange/transaction-aptos",
  "/exchange/transaction-strain",
  "/feed/polls",
  "/disclaimer",
  "/avatar",
  "/preferences",
  "/enquiry",
  "/certificate",
  "/info",
];

type Extras = {
  me?: any;
};

export default function DefaultLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();

  // Prevent double-apply in React StrictMode (dev)
  const didApplyOnboardingIntentRef = useRef(false);

  const { data: meData, isLoading } = useApiQuery(endpoints.profile.me);
  const me = useMemo(() => meData?.data?.data, [meData]);

  const tick = useOnReachTick((s) => s.tick);
  const extras: Extras = { me };

  const configs: RouteOnReachConfig<Extras>[] = useMemo(
    () => [
      {
        id: "visit-inkd-blog-share",
        match: {
          type: "regex",
          re: /^\/inkd\/inkd-blog\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["inkdRu"],
          require: ["inkdRu"],
          count: { inkdRu: { exact: 1 } },
          validate: {
            inkdRu: (v) => typeof v === "string" && v.trim().length > 0,
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async () => {
          await logInkDBlogShareFromUrl();
        },
      },
      {
        id: "visit-inkd-trial-share",
        match: {
          type: "regex",
          re: /^\/trial\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["inkdRu"],
          require: ["inkdRu"],
          count: { inkdRu: { exact: 1 } },
          validate: {
            inkdRu: (v) => typeof v === "string" && v.trim().length > 0,
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async () => {
          await logInkDTrialShareFromUrl();
        },
      },
      {
        id: "visit-campaign-detail-ru-trial",
        match: {
          type: "regex",
          re: /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["ru", "trialId"],
          require: ["ru", "trialId"],
          count: { ru: { exact: 1 }, trialId: { exact: 1 } },
          validate: {
            ru: (v) => typeof v === "string" && v.trim().length > 0,
            trialId: (v) => /^[a-fA-F0-9]{24}$/.test(v),
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async (ctx) => {
          const m = ctx.pathname.match(
            /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/,
          );
          const campaignId = m?.[1];
          const ru = ctx.query.ru?.[0];
          const trialId = ctx.query.trialId?.[0];
          if (!campaignId || !ru || !trialId) return;

          // const str = `[onReach] campaign detail (ru + trial) ${JSON.stringify({
          //   campaignId,
          //   trialId,
          //   ru,
          //   canonicalPath: ctx.canonicalPath,
          // })}`;
          // appToast.info(str);
          // console.log(str);
          await logCampaignRuTrialFromUrl();
        },
      },
      {
        id: "visit-campaign-detail-ru-only",
        match: {
          type: "regex",
          re: /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["ru"],
          require: ["ru"],
          count: { ru: { exact: 1 } },
          validate: {
            ru: (v) => typeof v === "string" && v.trim().length > 0,
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async (ctx) => {
          const m = ctx.pathname.match(
            /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/,
          );
          const campaignId = m?.[1];
          const ru = ctx.query.ru?.[0];
          if (!campaignId || !ru) return;

          // const str = `[onReach] campaign detail (ru-only) ${JSON.stringify({
          //   campaignId,
          //   ru,
          // })}`;
          // appToast.info(str);
          // console.log(str);
          await logCampaignRuOnlyFromUrl();
        },
      },
      {
        id: "visit-feed-poll-ru-only",
        match: {
          type: "regex",
          re: /^\/feed\/polls\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["ru"],
          require: ["ru"],
          count: { ru: { exact: 1 } },
          validate: {
            ru: (v) => typeof v === "string" && v.trim().length > 0,
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async (ctx) => {
          const m = ctx.pathname.match(/^\/feed\/polls\/([a-fA-F0-9]{24})\/?$/);
          const pollId = m?.[1];
          const ru = ctx.query.ru?.[0];
          if (!pollId || !ru) return;

          // const str = `[onReach] feed poll (ru-only) ${JSON.stringify({
          //   pollId,
          //   ru,
          // })}`;
          // appToast.info(str);
          // console.log(str);
          await logPollRuOnlyFromUrl();
        },
      },
      {
        id: "visit-trial-ru-only",
        match: {
          type: "regex",
          re: /^\/trial\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["ru"],
          require: ["ru"],
          count: { ru: { exact: 1 } },
          validate: {
            ru: (v) => typeof v === "string" && v.trim().length > 0,
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async (ctx) => {
          const m = ctx.pathname.match(/^\/trial\/([a-fA-F0-9]{24})\/?$/);
          const trialId = m?.[1];
          const ru = ctx.query.ru?.[0];
          if (!trialId || !ru) return;

          // const str = `[onReach] trial detail (ru-only) ${JSON.stringify({
          //   trialId,
          //   ru,
          // })}`;
          // appToast.info(str);
          // console.log(str);
          await logTrialRuOnlyFromUrl();
        },
      },
      {
        id: "visit-campaign-detail-qr-only",
        match: {
          type: "regex",
          re: /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/,
        },
        querySpec: {
          allowOnly: ["qr"],
          require: ["qr"],
          count: { qr: { exact: 1 } },
          validate: {
            qr: (v) => /^[a-fA-F0-9]{24}$/.test(v),
          },
        },
        rateLimitMs: 15 * 60 * 1000,
        onReach: async (ctx) => {
          const m = ctx.pathname.match(
            /^\/campaigns\/all-campaigns\/([a-fA-F0-9]{24})\/?$/,
          );
          const campaignId = m?.[1];
          const qr = ctx.query.qr?.[0];

          if (!campaignId || !qr) return;
          markCampaignQrVisitFromUrl();
          // const str = `[onReach] campaign detail (qr-only) ${JSON.stringify({
          //   campaignId,
          //   qr,
          //   canonicalPath: ctx.canonicalPath,
          // })}`;
          // console.log(str);
          // appToast.info(str);
        },
      },
    ],
    [tick],
  );

  const {
    isDisclaimerPageDone,
    isInfoPageDone,
    isAvatarPageDone,
    isPreferencePageDone,
    isCertificatePageDone,
  } = useMemo(() => {
    const profileData = me?.profile;
    const xpollAppData = profileData?.apps?.xpoll;
    const xpollMeta = xpollAppData?.meta ?? {};
    const rootMeta = profileData?.meta ?? {};

    const username = !!xpollAppData?.username;
    const avatar = !!xpollAppData?.avatar;
    const gender = !!xpollAppData?.gender;
    const dob = !!xpollAppData?.dob;
    const city = !!rootMeta?.city;
    const state = !!rootMeta?.state;
    const country = !!rootMeta?.country;

    const isLocationDone = !!city && !!state && !!country;
    const isDisclaimerPageDone = !!xpollMeta.isDisclaimerAccepted;
    const isInfoPageDone = !!isLocationDone && !!gender && !!dob;
    const isAvatarPageDone = !!avatar && !!username;
    const isPreferencePageDone = !!xpollMeta.isPreferenceSubmitted;
    const isCertificatePageDone = !!xpollMeta.isCertificateGiven;

    return {
      isDisclaimerPageDone,
      isInfoPageDone,
      isAvatarPageDone,
      isPreferencePageDone,
      isCertificatePageDone,
    };
  }, [me]);

  const isPollFeedPage = pathname.startsWith("/feed/polls");
  const isSepecificTrialPage = pathname.startsWith("/trial");
  const isMyPollsPage = pathname.startsWith("/my-polls");

  const fullWidthBasePaths = useMemo(
    () => [
      "/add-campaign",
      "/standalone-trails",
      "/disclaimer",
      "/info",
      "/avatar",
      "/enquiry",
      "/certificate",
      "/campaigns",
      "/marketplace",
      "/bookmarks",
      "/profile/payment",
      "/subscriptionSuccessful",
      "/coins",
    ],
    [],
  );

  const isFullWidthPage = useMemo(() => {
    return fullWidthBasePaths.some(
      (base) => pathname === base || pathname.startsWith(`${base}/`),
    );
  }, [pathname, fullWidthBasePaths]);

  const elementsInPathname = pathname.split("/");
  const onTrialPage =
    pathname.startsWith("/trial") && elementsInPathname.length > 2;
  const onMyPollsPage =
    pathname.startsWith("/my-polls") && elementsInPathname.length > 2;
  const onFeedPollsPage =
    pathname.startsWith("/feed/polls") && elementsInPathname.length > 2;

  const shouldShowTopBar = useMemo(
    () =>
      !noTopOn.includes(pathname) &&
      !onTrialPage &&
      !onMyPollsPage &&
      !onFeedPollsPage,
    [pathname, onTrialPage, onMyPollsPage, onFeedPollsPage],
  );

  const shouldShowBottomBar = useMemo(
    () =>
      !noBottomOn.includes(pathname) &&
      !onTrialPage &&
      !onMyPollsPage &&
      !onFeedPollsPage,
    [pathname, onTrialPage, onMyPollsPage, onFeedPollsPage],
  );

  const shouldShowSidebar = useMemo(
    () => !noSidebarOn.includes(pathname) && !onTrialPage && !onFeedPollsPage,
    [pathname, onTrialPage, onFeedPollsPage],
  );

  const steps = useMemo(
    () => [
      { unmet: () => !isDisclaimerPageDone, path: "/disclaimer" },
      { unmet: () => isDisclaimerPageDone && !isInfoPageDone, path: "/info" },
      {
        unmet: () =>
          isDisclaimerPageDone && isInfoPageDone && !isAvatarPageDone,
        path: "/avatar",
      },
      {
        unmet: () =>
          isDisclaimerPageDone &&
          isInfoPageDone &&
          isAvatarPageDone &&
          !isPreferencePageDone,
        path: "/enquiry",
      },
      {
        unmet: () =>
          isDisclaimerPageDone &&
          isInfoPageDone &&
          isAvatarPageDone &&
          isPreferencePageDone &&
          !isCertificatePageDone,
        path: "/certificate",
      },
    ],
    [
      isDisclaimerPageDone,
      isInfoPageDone,
      isAvatarPageDone,
      isPreferencePageDone,
      isCertificatePageDone,
    ],
  );

  const nextStepIndex = useMemo(() => {
    if (isLoading || !me) return -1;
    return steps.findIndex((s) => s.unmet());
  }, [isLoading, me, steps]);

  const currentStepIndex = useMemo(() => {
    if (!me) return -1;
    return steps.findIndex((s) => s.path === pathname);
  }, [pathname, me, steps]);

  const onboardingRedirectPath = useMemo(() => {
    if (isLoading || !me) return null;
    if (currentStepIndex === nextStepIndex) return null;
    return nextStepIndex >= 0 ? steps[nextStepIndex].path : "/home";
  }, [isLoading, me, currentStepIndex, nextStepIndex, steps]);

  const isOnboardingStepRoute = useMemo(() => {
    return steps.some((s) => s.path === pathname);
  }, [steps, pathname]);

  const getHeightStyles = useCallback(() => {
    if (isPollFeedPage || isSepecificTrialPage || isMyPollsPage)
      return heightStyles;
    const haveBottomBar = !noBottomOn.includes(pathname);
    const haveTopBar = !noTopOn.includes(pathname);
    if (haveTopBar && haveBottomBar) return heightBarsStyles;
    if (haveTopBar) return heightStyles;
    if (haveBottomBar) return heightBottomBarStyles;
    return heightStyles;
  }, [pathname, isPollFeedPage, isSepecificTrialPage, isMyPollsPage]);

  // DBG: overall state snapshot whenever these change
  useEffect(() => {
    console.log("[DBG][layout]", {
      pathname: location.pathname,
      search: location.search,
      isLoading,
      hasMe: !!me,
      onboardingRedirectPath,
      nextStepIndex,
      currentStepIndex,
      isOnboardingStepRoute,
      didApplyOnboardingIntent: didApplyOnboardingIntentRef.current,
      tick,
    });
  }, [
    location.pathname,
    location.search,
    isLoading,
    me,
    onboardingRedirectPath,
    nextStepIndex,
    currentStepIndex,
    isOnboardingStepRoute,
    tick,
  ]);

  // Run onReach only when onboarding is complete
  useEffect(() => {
    console.log("[DBG][effect:onReach] run", {
      pathname: location.pathname,
      onboardingRedirectPath,
      hasMe: !!extras.me,
      tick,
    });

    if (onboardingRedirectPath) {
      console.log("[DBG][effect:onReach] SKIP because onboardingRedirectPath", {
        onboardingRedirectPath,
      });
      return;
    }

    void runOnReachForLocation({
      location: { pathname: location.pathname, search: location.search },
      configs,
      extras,
    });
  }, [
    location.pathname,
    location.search,
    configs,
    tick,
    extras.me,
    onboardingRedirectPath,
  ]);

  // After onboarding completes, redirect once to the held target (if any)
  useEffect(() => {
    if (onboardingRedirectPath) return;

    if (didApplyOnboardingIntentRef.current) return;
    didApplyOnboardingIntentRef.current = true;

    // Priority 1: original private route intent (from PrivateRoute)
    const authIntended = popAuthIntentIfValid();

    // Priority 2: intent saved when onboarding forced redirect
    const onboardingIntended = popOnboardingIntentIfValid();

    const intended = authIntended ?? onboardingIntended;
    if (!intended) return;

    const current = location.pathname + location.search;
    if (current === intended) return;

    navigate(intended, { replace: true });
  }, [onboardingRedirectPath, location.pathname, location.search, navigate]);

  const HeightStyles = useMemo(() => getHeightStyles(), [getHeightStyles]);

  if (onboardingRedirectPath) {
    console.log("[DBG][render] onboarding redirect", {
      from: location.pathname + location.search,
      to: onboardingRedirectPath,
      isOnboardingStepRoute,
    });

    if (!isOnboardingStepRoute) {
      console.log("[DBG][render] storing onboarding intent", {
        pathname: location.pathname,
        search: location.search,
      });
      setOnboardingIntent(location.pathname, location.search);
    } else {
      console.log("[DBG][render] NOT storing intent (already onboarding step)");
    }

    return <Navigate to={onboardingRedirectPath} replace />;
  }

  if (isLoading) {
    console.log("[DBG][render] loading me...");
    return <Loader2 className="h-6 w-6 animate-spin m-auto" />;
  }

  return (
    <div className="flex h-full flex-col lg:flex-row border-[10px] min-h-[100dvh] max-h-[100dvh] border-[#25FBEC]">
      <ResponsiveNav
        items={NAV_ITEMS}
        logo={{ src: "", alt: "MySite", href: "/home" }}
        user={{
          name: me?.displayName || me?.name || "Jane Doe",
          href: "/profile",
        }}
        showSidebar={shouldShowSidebar}
        showTopBar={shouldShowTopBar}
        showBottomBar={shouldShowBottomBar}
        mobileContent={
          <main style={HeightStyles} className={cn("flex-1 overflow-y-auto")}>
            <div className="w-full bg-[#F2F3F5] h-full">{children}</div>
          </main>
        }
      />

      <main
        style={{ ...heightStyles }}
        className=
        {cn(
          "w-full overflow-x-hidden bg-[#F2F3F5] hidden lg:block flex-1 h-screen overflow-y-auto bg-[#F2F3F5]",
          isFullWidthPage ? "max-w-none mx-0" : "max-w-2xl mx-auto",
        )}
      >
         
          {/* {<div className="fixed inset-0 bg-black/50 z-50"></div>}      
          show this overlay conditionally
          */}
          {children}
         
      </main>
    </div>
  );
}
