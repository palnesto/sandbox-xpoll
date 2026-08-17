import InfiniteSelect from "./base/infinite-select";

type CityItem = {
  _id: string;
  name: string;
  state: { _id: string; name: string };
  country: { _id: string; name: string };
  label?: string; // backend also returns label; we compute it anyway
};

type Option = {
  value: string;
  label: string;
  data?: CityItem;
};

type Props = {
  onChange?: (option: Option | null) => void;
  pageSize?: number;
  placeholder?: string;
  /** extra props for react-select if you want to customize (styles, etc.) */
  selectProps?: Parameters<typeof InfiniteSelect<CityItem>>[0]["selectProps"];
};

export default function LocationSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search city...",
  selectProps,
}: Props) {
  return (
    <InfiniteSelect<CityItem>
      route="/location/cities"
      pageSize={pageSize}
      // Build filters from the current typed input
      getFilters={(search) => ({ q: search })}
      // Map each row to a select option
      mapItemToOption={(item) => ({
        value: item._id,
        label: `${item.name}, ${item.state.name}, ${item.country.name}`,
        data: item,
      })}
      // Log selection + bubble up
      onChange={(opt) => {
        if (opt?.data) {
          console.log("Selected location:", {
            cityId: opt.data._id,
            city: opt.data.name,
            state: opt.data.state,
            country: opt.data.country,
          });
        }
        onChange?.(opt as Option | null);
      }}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
