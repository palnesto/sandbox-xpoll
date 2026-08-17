// src/components/commons/selects/industry-infinite-select.tsx
import React from "react";
import Select from "react-select";
import InfiniteSelect from "@/components/commons/selects/base/infinite-select";
import { endpoints } from "@/api/endpoints";

type IndustryItem = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
};

type BaseOption<T = unknown> = { value: string; label: string; data?: T };

type Props = {
  onChange?: (opt: BaseOption<IndustryItem> | null) => void;
  placeholder?: string;
  pageSize?: number;
  minChars?: number;
  debounceMs?: number;

  /**
   * ✅ Pass API query params directly (except "name" which is set from search).
   * Example:
   *  queryParams={{ includeArchived: false, excludeIds: "id1,id2" }}
   */
  queryParams?: Record<string, unknown>;

  /**
   * ✅ If you need query params to depend on `search`, use this.
   * If provided, it wins over `queryParams`.
   */
  getQueryParams?: (search: string) => Record<string, unknown>;

  selectProps?: Partial<
    React.ComponentProps<typeof Select<BaseOption<IndustryItem>>>
  >;
};

/**
 * User app Industry Infinite Select
 * - Uses existing shared InfiniteSelect + useApiInfiniteQuery implementation
 * - Keeps API params stable, only adds/removes `name` based on debounced search
 */
export default function IndustryInfiniteSelect({
  onChange,
  placeholder = "Search industries...",
  pageSize = 50,
  minChars = 0,
  debounceMs = 300,
  queryParams,
  getQueryParams,
  selectProps,
}: Props) {
  return (
    <InfiniteSelect<IndustryItem, Record<string, unknown>>
      route={endpoints.industries.advancedListing}
      pageSize={pageSize}
      debounceMs={debounceMs}
      minChars={minChars}
      fetchTrigger="open"
      getFilters={(search) => {
        // Always create a fresh object so we never mutate user-provided params.
        const base: Record<string, unknown> = getQueryParams
          ? { ...(getQueryParams(search) ?? {}) }
          : { ...(queryParams ?? {}) };

        const s = search?.trim();
        if (s) base.name = s;
        else delete base.name;

        return base;
      }}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.name,
        data: item,
      })}
      onChange={onChange as any}
      placeholder={placeholder}
      selectProps={{
        ...selectProps,
        // Default portal for proper layering in modals/drawers
        menuPortalTarget: selectProps?.menuPortalTarget ?? document.body,
      }}
    />
  );
}
