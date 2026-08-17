import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { NewForYouCampaignsBlock } from "@/components/dashboard/NewCampaigns";
import { ParticipatedCampaignsBlock } from "@/components/dashboard/ParticipatedCampaigns";
import { useApiInfinitePagedQuery } from "@/hooks/useApiInfinitePagedQuery";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import {
  ApiCampaign,
  CampaignCardModel,
  mapApiCampaignToParticipatedCard,
} from "@/types/campaigns";
import { queryClient } from "@/api/queryClient";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import Select, { type MultiValue, components } from "react-select";
import {
  coinAssets,
  assetSpecs,
  type AssetType,
} from "@/utils/currency-assets/asset";

type BookmarkEntry = { _id: string };
type IndustryItem = {
  _id: string;
  name: string;
  description?: string | null;
};
type BaseOption<T = unknown> = { value: string; label: string; data?: T };
type RewardAssetOption = { value: AssetType; label: string; iconUrl: string };

export default function AllCampaigns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const openCampaign = (id: string) => {
    navigate(`/campaigns/all-campaigns/${id}`);
  };

  const [nameInput, setNameInput] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<
    BaseOption<IndustryItem>[]
  >([]);
  const [selectedRewardAssets, setSelectedRewardAssets] = useState<
    RewardAssetOption[]
  >([]);
  const [hasAppliedCoinFromUrl, setHasAppliedCoinFromUrl] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedName(nameInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [nameInput]);

  const rewardAssetOptions = useMemo<RewardAssetOption[]>(
    () =>
      coinAssets
        .map((assetId) => {
          const spec = assetSpecs[assetId];
          return {
            value: assetId,
            label: `${spec.parentSymbol} (${spec.symbol})`,
            iconUrl: spec.img,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  useEffect(() => {
    if (hasAppliedCoinFromUrl) return;
    const coin = searchParams.get("coin");
    if (!coin) return;
    const opt = rewardAssetOptions.find((o) => o.value === coin);
    if (opt) {
      setSelectedRewardAssets([opt]);
      setHasAppliedCoinFromUrl(true);
    }
  }, [searchParams, rewardAssetOptions, hasAppliedCoinFromUrl]);

  const onIndustrySelect = (opt: BaseOption<IndustryItem> | null) => {
    if (!opt) return;
    setSelectedIndustries((prev) => {
      if (prev.some((x) => x.value === opt.value)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, opt];
    });
  };

  const removeIndustry = (industryId: string) => {
    setSelectedIndustries((prev) =>
      prev.filter((item) => item.value !== industryId),
    );
  };

  const onRewardAssetsChange = (next: MultiValue<RewardAssetOption>) => {
    setSelectedRewardAssets([...(next ?? [])].slice(0, 3));
  };

  const removeRewardAsset = (assetId: AssetType) => {
    setSelectedRewardAssets((prev) =>
      prev.filter((asset) => asset.value !== assetId),
    );
  };

  /** Selected value in control: show only asset image, scroll horizontally if overflow */
  const RewardAssetMultiValue = (props: any) => (
    <components.MultiValue {...props}>
      <img
        src={props.data.iconUrl}
        alt={props.data.label}
        className="h-5 w-5 rounded-full object-cover shrink-0"
      />
    </components.MultiValue>
  );

  const linkedIndustriesFilter = useMemo(
    () => selectedIndustries.map((industry) => industry.value).join(","),
    [selectedIndustries],
  );

  const rewardAssetsFilter = useMemo(
    () => selectedRewardAssets.map((asset) => asset.value).join(","),
    [selectedRewardAssets],
  );

  const campaignFilters = useMemo(() => {
    const next: Record<string, string> = {};
    if (debouncedName) next.name = debouncedName;
    if (linkedIndustriesFilter) next.linkedIndustries = linkedIndustriesFilter;
    if (rewardAssetsFilter) next.rewardAssets = rewardAssetsFilter;
    return next;
  }, [debouncedName, linkedIndustriesFilter, rewardAssetsFilter]);

  const bookmarksRoute = `${endpoints.campaigns.getBookmarks}?page=1&pageSize=500`;

  const { data: bookmarksResp, isLoading: bookmarksLoading } =
    useApiQuery(bookmarksRoute);

  const bookmarkedIdSet = useMemo(() => {
    const root = bookmarksResp?.data?.data ?? {};
    const entries: BookmarkEntry[] = Array.isArray(root.entries)
      ? root.entries
      : [];
    return new Set(entries.map((e) => String(e._id)));
  }, [bookmarksResp]);

  const [optimisticSaved, setOptimisticSaved] = useState<
    Record<string, boolean>
  >({});

  const isSavedFor = (id: string) => {
    const key = String(id);
    if (key in optimisticSaved) return optimisticSaved[key];
    return bookmarkedIdSet.has(key);
  };

  const timersRef = useRef<Record<string, number | undefined>>({});
  const [pending, setPending] = useState<{
    id: string;
    enabled: boolean;
  } | null>(null);

  const bookmarkRouteForMutation = pending
    ? endpoints.campaigns.createBookmark(pending.id)
    : endpoints.campaigns.createBookmark("noop");

  const { mutate: toggleBookmark, isPending: postingBookmark } = useApiMutation(
    {
      method: "POST",
      route: bookmarkRouteForMutation,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [bookmarksRoute] });
      },
      onSettled: (_d: any, _e: any, _v: any) => {
        if (pending?.id) {
          setOptimisticSaved((prev) => {
            const next = { ...prev };
            delete next[pending.id];
            return next;
          });
        }
        setPending(null);
      },
    } as any,
  ) as any;

  useEffect(() => {
    if (!pending) return;
    toggleBookmark({ enabled: pending.enabled });
  }, [pending?.id, pending?.enabled]);

  const debounceToggle = (id: string, nextEnabled: boolean) => {
    const key = String(id);

    setOptimisticSaved((prev) => ({ ...prev, [key]: nextEnabled }));

    const existing = timersRef.current[key];
    if (existing) window.clearTimeout(existing);

    timersRef.current[key] = window.setTimeout(() => {
      setPending({ id: key, enabled: nextEnabled });
    }, 250);
  };

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => {
        if (t) window.clearTimeout(t);
      });
    };
  }, []);

  const participatedFilters = useMemo(
    () => ({ ...campaignFilters, variant: "participated" }),
    [campaignFilters],
  );

  const { items: participatedApiItems, isLoading: participatedLoading } =
    useApiInfinitePagedQuery<ApiCampaign, Record<string, string>>({
      route: endpoints.campaigns.all,
      filters: participatedFilters,
      pageSize: 50,
    });

  const participated: CampaignCardModel[] = useMemo(() => {
    return participatedApiItems.map((c) => ({
      ...mapApiCampaignToParticipatedCard(c),
      isSaved: isSavedFor(c._id),
    }));
  }, [participatedApiItems, bookmarkedIdSet, optimisticSaved]);

  return (
    <section className="h-[calc(100vh-64px)] overflow-y-auto">
      <div className="sticky top-0 z-50 bg-white/70 backdrop-blur border-b">
        <header className="flex flex-wrap xl:flex-nowrap md:items-start justify-between gap-3 p-4">
          <section className="flex items-center gap-2 shrink-0 pt-1">
            <button
              onClick={() => navigate("/home")}
              className="px-2 border-white border-r-2 border-l-2 rounded-xl bg-[#dbdcdf30] hover:bg-black/5"
            >
              <ArrowLeft />
            </button>
            <h1 className="text-lg xl:text-xl font-semibold">Campaigns</h1>
          </section>

          <section className="order-3 xl:order-2 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="SEARCH BY CAMPAIGNS"
                className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#0DACAD] placeholder:text-xs"
              />

              <IndustryInfiniteSelect
                placeholder={
                  selectedIndustries.length >= 3
                    ? "Max 3 industries selected"
                    : "SEARCH INDUSTRIES"
                }
                queryParams={{
                  ...(selectedIndustries.length > 0
                    ? {
                        excludeIds: selectedIndustries
                          .map((industry) => industry.value)
                          .join(","),
                      }
                    : {}),
                }}
                onChange={onIndustrySelect}
                selectProps={{
                  isDisabled: selectedIndustries.length >= 3,
                  value: null,
                  styles: {
                    placeholder: (base) => ({ ...base, fontSize: 12 }),
                    menuPortal: (base) => ({ ...base, zIndex: 10000 }),
                    menu: (base) => ({ ...base, zIndex: 10000 }),
                  },
                }}
              />

              <Select<RewardAssetOption, true>
                isMulti
                options={rewardAssetOptions}
                value={selectedRewardAssets}
                onChange={onRewardAssetsChange}
                formatOptionLabel={(option) => (
                  <div className="flex items-center gap-2">
                    <img
                      src={option.iconUrl}
                      alt={option.label}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                    <span>{option.label}</span>
                  </div>
                )}
                placeholder={
                  selectedRewardAssets.length >= 3
                    ? "Max 3 assets selected"
                    : "SEARCH BY COINS"
                }
                closeMenuOnSelect={true}
                hideSelectedOptions={false}
                isOptionDisabled={(option) =>
                  selectedRewardAssets.length >= 3 &&
                  !selectedRewardAssets.some(
                    (asset) => asset.value === option.value,
                  )
                }
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : undefined
                }
                components={{ MultiValue: RewardAssetMultiValue }}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: 40,
                    borderRadius: 9999,
                    borderColor: state.isFocused ? "#0DACAD" : "rgba(0,0,0,0.15)",
                    boxShadow: "none",
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    padding: "0 10px",
                    display: "flex",
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    gap: 6,
                    alignItems: "center",
                  }),
                  placeholder: (base) => ({
                    ...base,
                    fontSize: 12,
                  }),
                  menu: (base) => ({ ...base, zIndex: 10000 }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 10000,
                    pointerEvents: "auto",
                  }),
                  multiValue: (base) => ({
                    ...base,
                    margin: 0,
                    padding: 0,
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  }),
                }}
              />
            </div>

            {(selectedIndustries.length > 0 ||
              selectedRewardAssets.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedIndustries.map((industry) => (
                  <span
                    key={industry.value}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E4F2DF] px-3 py-1 text-xs text-[#315326]"
                  >
                    {industry.label}
                    <button
                      type="button"
                      onClick={() => removeIndustry(industry.value)}
                      className="rounded-full p-0.5 hover:bg-[#78BC61]/20 transition"
                      aria-label={`Remove ${industry.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}

                {selectedRewardAssets?.map((asset) => (
                  <span
                    key={asset.value}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E5F5FD] px-3 py-1 text-xs text-[#0A6288]"
                  >
                    <img
                      src={asset.iconUrl}
                      alt={asset.label}
                      className="h-4 w-4 rounded-full object-cover"
                    />
                    {asset.label}
                    <button
                      type="button"
                      onClick={() => removeRewardAsset(asset.value)}
                      className="rounded-full p-0.5 hover:bg-[#8ad3f4]/20 transition"
                      aria-label={`Remove ${asset.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <button
            onClick={() => navigate("/campaigns/my-campaigns")}
            className="order-2 xl:order-3 shrink-0 rounded-full bg-[#0DACAD18] border border-[#0DACAD] text-[#0DACAD] px-2 lg:px-5 py-1 text-sm lg:text-lg uppercase"
          >
            MY CAMPAIGNS
          </button>
        </header>
      </div>

      <div className="space-y-6 w-full p-4 h-[100vh]">
        {!participatedLoading && participated.length > 0 && (
          <ParticipatedCampaignsBlock
            items={participated}
            onItemClick={(c) => openCampaign(c._id)}
            onToggleSave={(id, next) => {
              const c = participated.find((x) => String(x._id) === String(id));
              if (c?.status !== "live") return;
              if (postingBookmark) return;
              debounceToggle(String(id), Boolean(next));
            }}
          />
        )}

        <NewForYouCampaignsBlock
          filters={campaignFilters}
          onItemClick={(c) => openCampaign(c._id)}
          onToggleSave={(id, next) => {
            if (postingBookmark) return;
            debounceToggle(String(id), Boolean(next));
          }}
          isSavedFor={isSavedFor}
        />
      </div>

      {bookmarksLoading ? (
        <div className="mt-3 text-sm text-black/50">Loading bookmarks…</div>
      ) : null}
    </section>
  );
}
