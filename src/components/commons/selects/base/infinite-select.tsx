// src/components/commons/selects/base/infinite-select.tsx
import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
import React from "react";
import Select, {
  components,
  MenuListProps,
  SingleValue,
  StylesConfig,
} from "react-select";

type BaseOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

export type InfiniteSelectProps<
  T,
  F extends Record<string, unknown> = Record<string, unknown>
> = {
  route: string;
  pageSize?: number;
  getFilters?: (search: string) => F;
  mapItemToOption: (item: T) => BaseOption<T>;
  onChange?: (option: BaseOption<T> | null) => void;
  placeholder?: string;
  isClearable?: boolean;
  selectProps?: Partial<React.ComponentProps<typeof Select<BaseOption<T>>>>;
  debounceMs?: number;
  minChars?: number;
  fetchThresholdPx?: number;
  /** When to start fetching data: "open" (on menu open) or "type" (after typing minChars). */
  fetchTrigger?: "open" | "type";
};

export default function InfiniteSelect<
  T,
  F extends Record<string, unknown> = Record<string, unknown>
>({
  route,
  pageSize = 50,
  getFilters,
  mapItemToOption,
  onChange,
  placeholder = "Search...",
  isClearable = true,
  selectProps,
  debounceMs = 300,
  minChars = 0,
  fetchThresholdPx = 120,
  fetchTrigger = "open",
}: InfiniteSelectProps<T, F>) {
  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setSearch(input), debounceMs);
    return () => window.clearTimeout(id);
  }, [input, debounceMs]);

  const effectiveSearch = search.length >= minChars ? search : "";

  // Keep an empty filters object stable to avoid queryKey churn before searching
  const emptyFiltersRef = React.useRef({} as F);
  const filters = React.useMemo(
    () => (getFilters ? getFilters(effectiveSearch) : emptyFiltersRef.current),
    [getFilters, effectiveSearch]
  );

  // Only enable fetching when user is actually "using" the select
  const enabled =
    fetchTrigger === "open" ? menuOpen : menuOpen && effectiveSearch.length > 0;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useApiInfiniteQuery<T, unknown, F>(route, filters, pageSize, {
      enabled,
      keepPreviousData: true,
    });

  const options = React.useMemo(() => {
    const pages = data?.pages ?? [];
    const flat: BaseOption<T>[] = [];
    for (const p of pages) {
      for (const item of (p as any).entries as T[]) {
        flat.push(mapItemToOption(item));
      }
    }
    return flat;
  }, [data, mapItemToOption]);

  const handleChange = React.useCallback(
    (v: SingleValue<BaseOption<T>>) => {
      onChange?.(v ?? null);
      // Optional: clear search text so next open starts fresh
      setInput("");
    },
    [onChange]
  );

  const handleInputChange = React.useCallback(
    (val: string, meta: { action: string }) => {
      if (meta.action === "input-change") setInput(val);
      return val;
    },
    []
  );

  const lastFetchTsRef = React.useRef(0);
  const tryFetchNext = React.useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTsRef.current < 300) return;
    if (hasNextPage && !isFetchingNextPage) {
      lastFetchTsRef.current = now;
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const MenuList = React.useMemo(() => {
    const Comp = (props: MenuListProps<BaseOption<T>, false>) => {
      const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const el = e.currentTarget;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distance < fetchThresholdPx) tryFetchNext();
      };
      return (
        <components.MenuList {...props} onScroll={onScroll}>
          {props.children}
        </components.MenuList>
      );
    };
    return Comp;
  }, [fetchThresholdPx, tryFetchNext]);

  /** ========= THEME / STYLES (light, rounded, all-black text) ========= */
  const RS_STYLES = React.useMemo<StylesConfig<BaseOption<T>, false>>(
    () => ({
      container: (base) => ({ ...base, width: "100%" }),
      control: (base, state) => ({
        ...base,
        minHeight: 44,
        height: 44,
        borderRadius: "99px",
        backgroundColor: "#ffffff",
        borderColor: state.isFocused ? "#111827" : "#E5E7EB",
        boxShadow: state.isFocused ? "0 0 0 3px rgba(17,24,39,0.08)" : "none",
        ":hover": { borderColor: "#111827" },
        fontSize: 16,
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        color: "#000000",
      }),
      placeholder: (base) => ({
        ...base,
        color: "#000000",
        opacity: 0.6,
        fontSize: 16,
      }),
      singleValue: (base) => ({
        ...base,
        color: "#000000",
        fontSize: 16,
      }),
      indicatorsContainer: (base) => ({
        ...base,
        paddingRight: 6,
      }),
      dropdownIndicator: (base, state) => ({
        ...base,
        color: "#111827",
        transition: "transform 120ms ease",
        transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "none",
        ":hover": { color: "#111827" },
      }),
      clearIndicator: (base) => ({
        ...base,
        color: "#6B7280",
        ":hover": { color: "#111827" },
      }),
      menu: (base) => ({
        ...base,
        borderRadius: 12,
        marginTop: 6,
        backgroundColor: "#ffffff",
        boxShadow: "0 12px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)",
        zIndex: 60,
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
        pointerEvents: "auto",
      }),
      menuList: (base) => ({
        ...base,
        maxHeight: 260,
        padding: 6,
      }),
      option: (base, state) => ({
        ...base,
        borderRadius: 10,
        padding: "10px 12px",
        color: "#000000",
        backgroundColor: state.isSelected
          ? "#F3F4F6"
          : state.isFocused
          ? "#F9FAFB"
          : "#ffffff",
        ":active": { backgroundColor: "#F3F4F6" },
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: "#000000",
        opacity: 0.7,
      }),
      loadingMessage: (base) => ({
        ...base,
        color: "#000000",
        opacity: 0.7,
      }),
    }),
    []
  );

  const RS_THEME = React.useCallback(
    (base: any) => ({
      ...base,
      borderRadius: 12,
      colors: {
        ...base.colors,
        primary: "#111827",
        primary25: "#F9FAFB",
        primary50: "#F3F4F6",
        neutral0: "#ffffff",
        neutral20: "#E5E7EB",
        neutral30: "#D1D5DB",
        neutral80: "#000000",
      },
    }),
    []
  );

  return (
    <Select<BaseOption<T>>
      className="rounded-full"
      placeholder={placeholder}
      isClearable={isClearable}
      options={options}
      // Control the typed text only while the menu is open.
      // When closed, let the selected value render in the control.
      inputValue={menuOpen ? input : undefined}
      onInputChange={handleInputChange}
      onChange={handleChange}
      onMenuOpen={() => setMenuOpen(true)}
      onMenuClose={() => setMenuOpen(false)}
      maxMenuHeight={260}
      filterOption={() => true}
      // Only show spinner once fetching is enabled
      isLoading={enabled && (isLoading || isFetchingNextPage)}
      noOptionsMessage={() => {
        if (!enabled) {
          if (fetchTrigger === "type" && input.length < minChars) {
            return `Type at least ${minChars} characters`;
          }
          return "Open the menu to load options";
        }
        if (isLoading) return "Options Loading...";
        if (fetchTrigger === "type" && input.length < minChars) {
          return `Type at least ${minChars} characters`;
        }
        return "No options";
      }}
      menuPortalTarget={selectProps?.menuPortalTarget ?? document.body}
      menuShouldScrollIntoView={false}
      components={{ MenuList, ...(selectProps?.components || {}) }}
      styles={{ ...RS_STYLES, ...(selectProps?.styles || {}) }}
      theme={selectProps?.theme ?? RS_THEME}
      classNamePrefix="xpoll-select"
      {...selectProps}
    />
  );
}
