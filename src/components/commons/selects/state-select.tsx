import { endpoints } from "@/api/endpoints";
import InfiniteSelect from "./base/infinite-select";

type StateItem = {
  _id: string;
  name: string;
  country: { _id: string; name: string };
  label?: string;
};

type Option = {
  value: string;
  label: string;
  data?: StateItem;
};

type Props = {
  onChange?: (option: Option | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: Parameters<typeof InfiniteSelect<StateItem>>[0]["selectProps"];
};

export default function StateSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search state...",
  selectProps,
}: Props) {
  return (
    <InfiniteSelect<StateItem>
      route={endpoints.location.getAllStates}
      pageSize={pageSize}
      getFilters={(search) => ({ q: search })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: `${item.name}, ${item.country.name}`,
        data: item,
      })}
      onChange={(opt) => {
        if (opt?.data) {
          console.log("Selected state:", {
            stateId: opt.data._id,
            state: opt.data.name,
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
