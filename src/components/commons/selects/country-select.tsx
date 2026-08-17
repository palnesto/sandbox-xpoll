import { endpoints } from "@/api/endpoints";
import InfiniteSelect from "./base/infinite-select";

type CountryItem = {
  _id: string;
  name: string;
  iso3?: string;
  label?: string;
};

type Option = {
  value: string;
  label: string;
  data?: CountryItem;
};

type Props = {
  onChange?: (option: Option | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: Parameters<
    typeof InfiniteSelect<CountryItem>
  >[0]["selectProps"];
};

export default function CountrySelect({
  onChange,
  pageSize = 50,
  placeholder = "Search country...",
  selectProps,
}: Props) {
  return (
    <InfiniteSelect<CountryItem>
      route={endpoints.location.getAllCountries}
      pageSize={pageSize}
      getFilters={(search) => ({ q: search })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.name,
        data: item,
      })}
      onChange={(opt) => {
        if (opt?.data) {
          console.log("Selected country:", {
            countryId: opt.data._id,
            name: opt.data.name,
            iso3: opt.data.iso3,
          });
        }
        onChange?.(opt as Option | null);
      }}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
