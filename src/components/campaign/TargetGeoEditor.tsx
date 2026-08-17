import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { X as XIcon } from "lucide-react";
import { CitySelect } from "@/components/commons/selects/city-select";
import { Badge } from "../ui/badge";

type BaseOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

type Props = {
  watch: any;
  setValue: any;
  basePath: string;
  label?: string;
  selectProps?: Record<string, any>;
  disabled?: boolean;
};

const CITY_CACHE_KEY = "xpoll_city_label_cache_v1";

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readCityCache(): Record<string, { label: string; data?: any }> {
  if (typeof window === "undefined") return {};
  return safeJsonParse(window.localStorage.getItem(CITY_CACHE_KEY), {});
}

function writeCityCache(next: Record<string, { label: string; data?: any }>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CITY_CACHE_KEY, JSON.stringify(next));
  } catch {}
}

function extractFirstCityId(v: any): string | null {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  const first = arr[0];
  if (!first) return null;
  if (typeof first === "string") return first;
  const id = String(first?._id ?? "");
  return id || null;
}

function extractFirstCityLabel(v: any): string | null {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  const first = arr[0];
  if (!first || typeof first !== "object") return null;
  const name = String(first?.name ?? "").trim();
  return name || null;
}

export default function TargetGeoEditor({
  watch,
  setValue,
  basePath,
  label = "Target Geo",
  selectProps,
  disabled = false,
}: Props) {
  const citiesPath = `${basePath}.cities`;

  const citiesRaw = watch(citiesPath);
  const cityId = useMemo(() => extractFirstCityId(citiesRaw), [citiesRaw]);

  const [selCity, setSelCity] = useState<BaseOption | null>(null);
  useEffect(() => {
    if (!Array.isArray(citiesRaw)) return;
    if (citiesRaw.length <= 1) return;

    const firstId = extractFirstCityId(citiesRaw);
    if (!firstId) {
      setValue(citiesPath as any, [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    setValue(citiesPath as any, [firstId], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [citiesRaw, citiesPath, setValue]);

  useEffect(() => {
    if (!cityId) {
      setSelCity(null);
      return;
    }

    const labelFromObj = extractFirstCityLabel(citiesRaw);
    if (labelFromObj) {
      setSelCity({ value: cityId, label: labelFromObj });
      const cache = readCityCache();
      cache[cityId] = { label: labelFromObj };
      writeCityCache(cache);
      return;
    }

    const cache = readCityCache();
    const cachedLabel = cache?.[cityId]?.label;

    setSelCity({
      value: cityId,
      label: cachedLabel || "Selected City",
    });
  }, [cityId, citiesRaw]);

  const setSingleCity = (opt: BaseOption | null) => {
    setSelCity(opt);

    setValue(citiesPath as any, opt ? [opt.value] : [], {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (opt) {
      setValue(`${basePath}.countries` as any, [], { shouldDirty: true });
      setValue(`${basePath}.states` as any, [], { shouldDirty: true });
    }

    if (opt?.value) {
      const cache = readCityCache();
      cache[opt.value] = { label: opt.label, data: opt.data };
      writeCityCache(cache);
    }
  };

  const clearCity = () => {
    if (disabled) return;
    setSingleCity(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#5E6366]">{label}</label>

      <CitySelect
        placeholder="Select one city"
        value={selCity}
        onChange={(opt: BaseOption | null) => {
          if (disabled) return;
          setSingleCity(opt);
        }}
        selectProps={{
          ...selectProps,
          isMulti: false,
          closeMenuOnSelect: true,
          isClearable: false,
          isDisabled: disabled,
        }}
      />

      {selCity ? (
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary" className="gap-1">
            {selCity.label}
            {!disabled ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full"
                onClick={clearCity}
                aria-label="Remove selected city"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            ) : null}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
