import { endpoints } from "@/api/endpoints";
import InfiniteSelect, { InfiniteSelectProps } from "./base/infinite-select";

export type ListingOption<T> = {
  value: string;
  label: string;
  data?: T;
};

type SelectPropsFor<T> = InfiniteSelectProps<T>["selectProps"];

export type TrialListItem = {
  _id: string;
  name?: string;
  title?: string;
  label?: string;
  // optional if you want image support:
  resourceAssets?: { type?: string; value?: string }[];
};

type TrialSelectProps = {
  onChange?: (option: ListingOption<TrialListItem> | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: SelectPropsFor<TrialListItem>;
  // ✅ allow arrays for belongsToCampaignIds, excludeIds
  additionalFilters?: Record<string, any>;
};

export function TrialSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search trial title or description...",
  selectProps,
  additionalFilters,
}: TrialSelectProps) {
  return (
    <InfiniteSelect<TrialListItem>
      route={endpoints.trial.advancedListing}
      pageSize={pageSize}
      getFilters={(search) => ({
        title: search || undefined,
        description: search || undefined,
        ...(additionalFilters || {}),
      })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.label ?? item.title ?? item.name ?? item._id,
        data: item,
      })}
      onChange={(opt) => onChange?.(opt as ListingOption<TrialListItem> | null)}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
