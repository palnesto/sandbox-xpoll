// src/components/commons/selects/user-select.tsx
import React from "react";
import Select from "react-select";
import {
  components,
  type OptionProps,
  type SingleValueProps,
} from "react-select";
import InfiniteSelect from "@/components/commons/selects/base/infinite-select";
import { endpoints } from "@/api/endpoints";
import { LEVELS } from "@/config/levelConfig";

export type ExternalUserLite = {
  _id: string;
  role: "user";
  googleEmail: string | null;
  twitterUsername: string | null;
  twitterName: string | null;
  email: string | null;
  externalAccountId: string;
  username: string | null;
  civicScore: number | null;
  level: number | null;
  gender: string | null;
  avatar: { _id: string; name: string; imageUrl: string } | null;
};

type Filters = {
  username?: string;
  email?: string;
  excludeIds?: string;
} & Record<string, unknown>;
type UserOption = {
  value: string;
  label: string;
  data?: ExternalUserLite;
};

const LevelBadge = ({ levelId }: { levelId: number | null }) => {
  const lvl = LEVELS.find((l) => l.id === (levelId ?? 1)) ?? LEVELS[0];

  return (
    <div className="shrink-0 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
      <img src={lvl.image} alt={lvl.title} className="h-4 w-4" />

      {/* Hide text on very small widths, keep icon only */}
      <span className="hidden sm:inline text-xs font-medium text-gray-900">
        {lvl.title}
      </span>
    </div>
  );
};

const Avatar = ({ u }: { u: ExternalUserLite }) => {
  const url = u.avatar?.imageUrl;
  const fallback = (u.username?.[0] ?? u.email?.[0] ?? "U").toUpperCase();
  return url ? (
    <img
      src={url}
      alt={u.avatar?.name ?? "avatar"}
      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
    />
  ) : (
    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-semibold">
      {fallback}
    </div>
  );
};

const UserOptionRow = (props: OptionProps<UserOption, false>) => {
  const u = props.data?.data;
  if (!u) {
    return <components.Option {...props}>{props.label}</components.Option>;
  }
  const username = u?.username ?? "unknown";
  const email = u?.email ?? u?.googleEmail ?? null;

  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3">
        <Avatar u={u} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">
                {username}
              </div>
              {email ? (
                <div className="hidden sm:block truncate text-xs text-gray-600">
                  {email}
                </div>
              ) : null}
            </div>
            <LevelBadge levelId={u?.level ?? 1} />
          </div>
        </div>
      </div>
    </components.Option>
  );
};

const UserSingleValue = (props: SingleValueProps<UserOption, false>) => {
  const u = props.data?.data;
  if (!u) {
    return (
      <components.SingleValue {...props}>
        {props.data.label}
      </components.SingleValue>
    );
  }
  const username = u?.username ?? "unknown";
  const email = u?.email ?? u?.googleEmail ?? null;

  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0">
          <Avatar u={u} />
        </div>

        {/* On tiny widths show just username, email hidden */}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">
            {username}
          </div>
          {email ? (
            <div className="hidden sm:block truncate text-xs text-gray-600">
              {email}
            </div>
          ) : null}
        </div>
      </div>
    </components.SingleValue>
  );
};

export default function UserSelect({
  onChange,
  placeholder = "Select a user...",
  route = endpoints.externalUsers.all,
  queryParams,
  getQueryParams,
  selectProps,
}: {
  onChange?: (user: ExternalUserLite | null) => void;
  placeholder?: string;
  route?: string;
  queryParams?: Record<string, unknown>;
  getQueryParams?: (search: string) => Record<string, unknown>;
  selectProps?: Partial<React.ComponentProps<typeof Select<UserOption>>>;
}) {
  return (
    <InfiniteSelect<ExternalUserLite, Filters>
      route={route}
      pageSize={20}
      minChars={1}
      fetchTrigger="type"
      placeholder={placeholder}
      getFilters={(search) => {
        const base: Filters = {
          ...(getQueryParams ? getQueryParams(search) : queryParams),
        };
        const term = search?.trim();

        if (term) {
          base.username = term;
          base.email = term;
        } else {
          delete base.username;
          delete base.email;
        }

        return base;
      }}
      mapItemToOption={(u) => {
        const email = u.email || u.googleEmail || "";
        const label = email
          ? `${u.username ?? "unknown"} • ${email}`
          : (u.username ?? "unknown");
        return {
          value: u.externalAccountId || u._id,
          label,
          data: u,
        };
      }}
      onChange={(opt) => onChange?.(opt?.data ?? null)}
      selectProps={{
        classNamePrefix: "user-select",
        menuPortalTarget: document.body,
        menuPosition: "fixed",
        noOptionsMessage: () => "Start typing to search users",
        components: {
          Option: UserOptionRow,
          SingleValue: UserSingleValue,
          ...(selectProps?.components ?? {}),
        },
        styles: {
          menuPortal: (base) => ({ ...base, zIndex: 100000 }),
          menu: (base) => ({ ...base, zIndex: 100000 }),
          ...(selectProps?.styles ?? {}),
        },
        ...(selectProps ?? {}),
      }}
    />
  );
}
