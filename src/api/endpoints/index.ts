export const endpoints = {
  healthCheck: "/health-check",
  referral: {
    log: "/external/referral/log",
  },
  grwb: {
    linkInitiate: "/external/grwb/link/initiate",
    linkVerify: "/external/grwb/link/verify",
    linkUnlink: "/external/grwb/link/unlink",
    sendGRWBInterationMailRequest: "/external/grwb/interactions",
    getGRWBUser: "/external/grwb/user-details",
  },
  auth: {
    login: "/public/user/login",
    logout: "/public/user/logout",
    signupInitiate: "/public/user/signup/initiate",
    signupVerify: "/public/user/signup/verify",
    oauthGoogle: "/public/user/oauth/google",
    oauthTwitter: "/public/user/oauth/twitter",
    linkEmailInitiate: "/external/auth/link/email/initiate",
    linkEmailVerify: "/external/auth/link/email/verify",
    oauthGoogleLink: "/external/auth/oauth/google/link",
    oauthTwitterLink: "/external/auth/oauth/twitter/link",
    passwordResetInitiate: "/public/user/password/forgot/initiate",
    passwordResetVerify: "/public/user/password/forgot/verify",
    passwordResetSet: "/public/user/password/forgot/set",
  },
  profile: {
    me: "/external/auth/me",
    meUpdate: "/external/profile",
    avatar: "/external/profile/avatars",
    usernameAvailability: "/external/profile/username/hello/availability",
    getSoulboundSubscription: "/external/profile/soulbound-subscription",
    getSoulboundSubscriptionPayments: (page = 1, pageSize = 20) =>
      `/external/profile/soulbound-subscription/payments?page=${page}&pageSize=${pageSize}`,
    getSoulboundSubscriptionAllowance:
      "/external/profile/soulbound-subscription/allowance",
    pauseSoulboundSubscription:
      "/external/profile/soulbound-subscription/pause",
    unpauseSoulboundSubscription:
      "/external/profile/soulbound-subscription/unpause",
    continueSoulboundSubscription:
      "/external/profile/soulbound-subscription/continue-now",
  },
  externalUsers: {
    all: "/external/external-users/all",
  },
  trial: {
    topRecommendations: "/external/trial/top-recommendations",
    getAllTrials: "/external/trial/list",
    getTrialById: (id: string) => `/external/trial/${id}`,
    trialCast: "/external/trial/cast",
    trialMarkSeen: "/external/trial/mark-seen",
    advancedListing: "/external/trial/advanced-listing",
  },
  location: {
    getAllCities: "/common/location/cities",
    getAllStates: "/common/location/states",
    getAllCountries: "/common/location/countries",
  },
  preference: {
    getQuestions: "/external/preference/mapping",
    submitPreference: "/external/preference/mapping",
  },
  poll: {
    getPolls: "/external/poll",
    createPolls: "/external/poll",
    pollCast: "/external/poll/cast",
    pollMarkSeen: "/external/poll/mark-seen",
    getPollById: (id: string) => `/external/poll/${id}`,
    myPolls: {
      getAllMyPolls: "/external/poll/my-polls",
      getMyPollsStats: "/external/poll/my-polls/stats",
      getMyPollById: (id: string) => `/external/poll/my-polls/${id}`,
      deleteMyPollById: (id: string) => `/external/poll/${id}`,
    },
  },
  assets: {
    sellIntent: "/external/actions/sell-intent",
    getAssetsInfo: "/common/assets/coins",
    getLedgers: "/external/asset-ledger/all",
    getSellIntentLedgers: "/external/asset-ledger/sell-intents",
    getStrainSellIntentLedgers: "/external/asset-ledger/strain-sell-intents",
    getSellIntentStats: "/external/asset-ledger/sell-intent-stats",
  },
  web3: {
    createXamanPayload: "/external/web3/createxamanpayload",
    getXamanPayload: (uuid: string) =>
      `/external/web3/getxamanpayload?uuid=${encodeURIComponent(uuid)}`,
  },
  strain: {
    getWeb2SellStatus: "/common/app-config/sell-strain-status",
    getClaimState: "/external/actions/strain/claim/state",
  },
  payment: {
    createPaymentIntent: "/external/payment/create-payment-intent",
    getPaymentById: (paymentId: string) => `/external/payment/${paymentId}`,
    updatePaymentClientState: (paymentId: string) =>
      `/external/payment/${paymentId}/client-state`,
    paymentSubscriptions: "/external/payment/subscriptions",
    getPaymentSubscriptionById: (subscriptionId: string) =>
      `/external/payment/subscriptions/${subscriptionId}`,
    getPaymentSubscriptionAllowance: (subscriptionId: string) =>
      `/external/payment/subscriptions/${subscriptionId}/allowance`,
    pausePaymentSubscription: (subscriptionId: string) =>
      `/external/payment/subscriptions/${subscriptionId}/pause`,
    unpausePaymentSubscription: (subscriptionId: string) =>
      `/external/payment/subscriptions/${subscriptionId}/unpause`,
    continuePaymentSubscription: (subscriptionId: string) =>
      `/external/payment/subscriptions/${subscriptionId}/continue-now`,
    offlineProducts: "/common/offline-products/products",
  },
  ad: {
    ad: {
      advancedListing: "/external/advertisement/ad/advanced-listing",
      markVisit: "/external/advertisement/ad/visit",
      markClick: "/external/advertisement/ad/click",
    },
  },
  industries: {
    advancedListing: "/external/industry/advanced-listing",
  },
  campaigns: {
    basic: {
      create: "/external/campaigns/basic/create",
    },
    public: {
      getCampaignById: (id: string) => `/public/campaigns/${id}`,
    },
    all: "/external/campaigns/all",
    plans: "/common/campaigns/plans",
    allPayments: "/external/payment/all-payments",
    makeLive: "/external/campaigns/make-live",
    myCampaigns: "/external/campaigns/my-campaigns",
    getCampaignByIdUser: (id: string) => `/external/campaigns/${id}/user`,
    getCampaignByIdOwner: (id: string) => `/external/campaigns/${id}/owner`,
    getCampaignSocial: (id: string) => `/external/campaigns/${id}/social`,
    getCampaignBlogSocialPublicationsBase: (
      campaignId: string,
      campaignBlogId: string,
    ) =>
      `/external/campaigns/${campaignId}/blogs/${campaignBlogId}/social-publications`,
    getCampaignBlogSocialPublicationRateLimitsBase: (campaignId: string) =>
      `/external/campaigns/${campaignId}/blogs/social-publication-rate-limits`,
    getCampaignBlogSocialPublications: (
      campaignId: string,
      campaignBlogId: string,
      page = 1,
      pageSize = 10,
    ) =>
      `/external/campaigns/${campaignId}/blogs/${campaignBlogId}/social-publications?page=${page}&pageSize=${pageSize}`,
    publishCampaignBlogSocialPublication: (
      campaignId: string,
      campaignBlogId: string,
    ) =>
      `/external/campaigns/${campaignId}/blogs/${campaignBlogId}/social-publications`,
    reconcileCampaignBlogSocialPublications: (
      campaignId: string,
      campaignBlogId: string,
    ) =>
      `/external/campaigns/${campaignId}/blogs/${campaignBlogId}/social-publications/reconcile-pending`,
    connectCampaignSocial: (id: string) =>
      `/external/campaigns/${id}/social/connect-url`,
    finalizeCampaignSocial: (id: string) =>
      `/external/campaigns/${id}/social/link/finalize`,
    syncCampaignSocial: (id: string) => `/external/campaigns/${id}/social/sync`,
    setCampaignSocialPlatformPreference: (id: string) =>
      `/external/campaigns/${id}/social/platform-preference`,
    disconnectCampaignSocial: (id: string) =>
      `/external/campaigns/${id}/social/connection`,
    // Campaign-scoped subscription endpoints back the Subscription Management
    // tab so the UI never has to filter a user-wide subscription list.
    getCampaignSubscription: (id: string) => `/external/campaigns/${id}/subscription`,
    getCampaignSubscriptionPayments: (id: string, page = 1, pageSize = 20) =>
      `/external/campaigns/${id}/subscription/payments?page=${page}&pageSize=${pageSize}`,
    getCampaignSubscriptionAllowance: (id: string) =>
      `/external/campaigns/${id}/subscription/allowance`,
    pauseCampaignSubscription: (id: string) =>
      `/external/campaigns/${id}/subscription/pause`,
    unpauseCampaignSubscription: (id: string) =>
      `/external/campaigns/${id}/subscription/unpause`,
    continueCampaignSubscription: (id: string) =>
      `/external/campaigns/${id}/subscription/continue-now`,
    shareRewards: (id: string) => `/external/campaigns/share-rewards/${id}`,
    donate: (id: string) => `/external/campaigns/${id}/donate`,
    setDonation: (id: string) => `/external/campaigns/${id}/donations`,
    edit: (id: string) => `/external/campaigns/${id}`,
    pause: "/external/campaigns/pause",
    end: "/external/campaigns/end",
    archive: "/external/campaigns/archive",
    delete: "/external/campaigns/delete",
    campaignMarkSeen: "/external/campaigns/mark-seen",
    createBookmark: (id: string) => `/external/campaigns/bookmark/${id}`,
    getBookmarks: "/external/campaigns/my-bookmarks",
    createTrial: "/external/campaigns/trial",
    suggestTrialPresign: "/external/campaigns/trial/suggest/presign",
    getTrialById: (id: string) => `/external/campaigns/trial/${id}`,
    updateTrial: (id: string) => `/external/campaigns/trial/${id}/resource-assets`,
    updateTrialPolls: (id: string) => `/external/campaigns/poll/${id}/resource-assets`,
    getTrialsListings: (id: string) => `/external/campaigns/${id}/trials`,
    deleteTrial: (id: string) => `/external/campaigns/trial/${id}`,
    createDraftTrial: "/external/trial-draft",
    getDraftTrialById: (id: string) => `/external/trial-draft/${id}`,
    deleteDraftTrial: (id: string) => `/external/trial-draft/${id}`,
    updateDraftTrial: (id: string) => `/external/trial-draft/${id}`,
    getDraftTrialListings: "/external/trial-draft/advanced-listing",
    getDraftTrialListingsUrl: (params: {
      belongsToCampaignId: string;
      page?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      q.set("belongsToCampaignId", params.belongsToCampaignId);
      if (params.page != null) q.set("page", String(params.page));
      if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
      return `/external/trial-draft/advanced-listing?${q.toString()}`;
    },
    updateTrialSequence: "/external/campaigns/trial/sequence",
    trailTopUp: "/external/campaigns/trial/top-up",
    myCampaignDonations: (id: string) =>
      `/external/campaigns/my-campaign-donations/${id}`,
    myDonations: "/external/campaigns/my-donations",
    getAnalytics: (id: string) => `/external/campaigns/${id}/analytics`,
    petitionToggle: (id: string) =>
      `/external/campaigns/${id}/petition-enable-toggle`,
    createPetition: "/external/petition",
    updatePetition: (id: string) => `/external/petition/${id}`,
    deletePetition: (id: string) => `/external/petition/${id}`,
    getPetitionById: (id: string) => `/external/petition/${id}`,
    getPetitionsListings: "/external/petition/advanced-listing",
    petitions: {
      castVote: "/external/petition/cast-vote",
    },
    createBlog: "/external/campaign-blog",
    setAsDraft: "/external/campaign-blog/draft",
    makeBlogLive: "/external/campaign-blog/live",
    updateBlog: (id: string) => `/external/campaign-blog/${id}`,
    deleteBlog: "external/campaign-blog",
    getBlogById: (id: string) => `/external/campaign-blog/${id}`,
    blogsAdvancedListing: "/external/campaign-blog/advanced-listing",
    getCampaignInkDAgents: (id: string) => `/external/campaigns/${id}/inkd-agents`,
    updateCampaignInkDAutoSocialPublish: (id: string) =>
      `/external/campaigns/${id}/inkd-auto-social-publish`,
    getCampaignInkDAgentRecentActivity: (
      campaignId: string,
      page = 1,
      pageSize = 10,
      lastNMinutes = 5,
    ) => {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        lastNMinutes: String(lastNMinutes),
      });
      return `/external/campaigns/${campaignId}/inkd-agents/task-logs?${query.toString()}`;
    },
    createCampaignInkDAgent: (id: string) => `/external/campaigns/${id}/inkd-agents`,
    getCampaignInkDAgentById: (campaignId: string, agentId: string) =>
      `/external/campaigns/${campaignId}/inkd-agents/${agentId}`,
    updateCampaignInkDAgent: (campaignId: string, agentId: string) =>
      `/external/campaigns/${campaignId}/inkd-agents/${agentId}`,
    changeCampaignInkDAgentStatus: (campaignId: string, agentId: string) =>
      `/external/campaigns/${campaignId}/inkd-agents/${agentId}/status`,
    getCampaignInkDAgentTaskLogs: (
      campaignId: string,
      agentId: string,
      page = 1,
      pageSize = 10,
      lastNMinutes = 5,
    ) => {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        lastNMinutes: String(lastNMinutes),
      });
      return `/external/campaigns/${campaignId}/inkd-agents/${agentId}/task-logs?${query.toString()}`;
    },
    campaignQr: {
      getCampaignQrListById: (queryParams: Record<string, string>) => {
        const baseUrl = "/external/campaigns/qr/advanced-listing";
        const searchParams = new URLSearchParams(queryParams).toString();
        const url = searchParams ? `${baseUrl}?${searchParams}` : baseUrl;
        return url;
      },
      getCampaignQrById: (id: string) => `/external/campaigns/qr/${id}`,
      getCampaignQrStats: (queryParams: Record<string, string>) => {
        const baseUrl = "/external/campaigns/qr/stats";
        const searchParams = new URLSearchParams(queryParams).toString();
        const url = searchParams ? `${baseUrl}?${searchParams}` : baseUrl;
        return url;
      },
      createCampaignQr: "/external/campaigns/qr",
      editCampaignQr: (id: string) => `/external/campaigns/qr/${id}`,
    },
    coOwner: {
      root: "/external/campaigns/co-owner",
      getByCampaignId: (campaignId: string) =>
        `/external/campaigns/co-owner/campaign/${campaignId}`,
      getById: (coOwnerMapId: string) =>
        `/external/campaigns/co-owner/${coOwnerMapId}`,
    },
    events: {
      listForOwner: (
        campaignId: string,
        status?: "draft" | "published",
      ) =>
        status
          ? `/external/campaigns/${campaignId}/events?status=${status}`
          : `/external/campaigns/${campaignId}/events`,
      getByIdForOwner: (campaignId: string, eventId: string) =>
        `/external/campaigns/${campaignId}/events/${eventId}`,
      attendees: (campaignId: string, eventId: string) =>
        `/external/campaigns/${campaignId}/events/${eventId}/attendees`,
      create: (campaignId: string) =>
        `/external/campaigns/${campaignId}/events`,
      update: (campaignId: string, eventId: string) =>
        `/external/campaigns/${campaignId}/events/${eventId}`,
      delete: (campaignId: string, eventId: string) =>
        `/external/campaigns/${campaignId}/events/${eventId}`,
      publish: (campaignId: string, eventId: string) =>
        `/external/campaigns/${campaignId}/events/${eventId}/publish`,
    },
  },
  events: {
    discover: "/external/events/discover",
    getByIdForViewer: (eventId: string) => `/external/events/${eventId}`,
    buy: (eventId: string) => `/external/events/${eventId}/buy`,
    myTickets: "/external/events/my-tickets",
    myPurchasedEvents: "/external/events/my-purchased-events",
  },
  linkForward: (entityType: string, entityId: string) =>
    `/external/entity-link/list-forward/${entityType}/${entityId}`,

  standaloneTrail: {
    create: "/external/trial",
    suggestTrialPresign: "/external/trial/suggest/presign",
    editTrial: (id: string) => `/external/trial/${id}/resource-assets`,
    editPoll: (id: string) => `/external/trial/poll/${id}/resource-assets`,
    delete: (id: string) => `/external/trial/${id}`,
    getById: (id: string) => `/external/trial/${id}`,
    getAll: "/external/trial/my-trials",
    getStats: "/external/trial/my-trials/stats",
    topUp: "/external/trial/top-up",
    createDraftTrial: "/external/trial-draft",
    getDraftTrialListingsUrl: (params: { page?: number; pageSize?: number }) => {
      const q = new URLSearchParams();
      q.set("standalone", "true");
      if (params.page != null) q.set("page", String(params.page));
      if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
      return `/external/trial-draft/advanced-listing?${q.toString()}`;
    },
  },
  inkd:{
    getAllInkdBlogs: "/external/inkd/blogs", 
    getInkdBlogsById: (id: string) => `/external/inkd/blogs/${id}`,
    getInkdBlogsByIdNew: (id: string) => `/external/inkd/blogs/${id}`,
    getInkdBlogsTrails:(blogId: string) => `/external/inkd/blogs/${blogId}/trials`,
    markSeen: (blogId: string) => `/external/inkd/blogs/${blogId}/mark-seen`,
    shareLog: "/external/inkd/share/log",
    topIndustries: "/common/inkd/top-industries"
  }
};
