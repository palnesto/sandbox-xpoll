import { endpoints } from "@/api/endpoints";
import CommonButton from "@/components/commons/CommonButton";
import { CitySelect } from "@/components/commons/selects/city-select";
import { useApiMutation } from "@/hooks/useApiMutation";
import { heightStyles } from "@/styles";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* helpers */
function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseYMD(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

type Gender = "male" | "female" | "other";

export default function InfoPage() {
  const { mutate: updateMeMutate, isPending: saving } = useApiMutation({
    route: endpoints.profile.meUpdate,
    method: "PATCH",
    onSuccess: () => {
      window.location.reload();
    },
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const startYear = currentYear - 100;

  const [cityId, setCityId] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);

  // --- DOB state ---
  const [dobYMD, setDobYMD] = useState<string>("");
  const dobDate = useMemo(() => (dobYMD ? parseYMD(dobYMD) : null), [dobYMD]);
  const [dobOpen, setDobOpen] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const minDate = new Date(startYear, 0, 1);
  const maxDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const handleNext = () => {
    setSubmitted(true);
    if (!cityId || !gender || !dobDate) return;

    const payload = {
      cityId,
      gender,
      dob: dobDate.toISOString(),
    };

    updateMeMutate(payload);
  };

  return (
    <div
      style={{ ...heightStyles }}
      className="text-black bg-[#F2F3F5] min flex flex-col items-center py-7 px-4 lg:px-0"
    >
      {/* City */}
      <div
        style={{ maxWidth: 490 }}
        className="bg-white/70 p-4 rounded-lg w-full"
      >
        <h3 className="font-semibold mb-2">Select a city</h3>
        <div className="border-b-2 rounded-b-xl border-[#20C2BE] text-[17px]">
          <CitySelect
            placeholder="Type to search cities…"
            onChange={(opt) => setCityId(opt?.data?._id ?? null)}
          />
        </div>
        {submitted && !cityId && (
          <p className="text-xs text-red-600 mt-1">City is required</p>
        )}
      </div>

      {/* Gender */}
      <div
        style={{ maxWidth: 490 }}
        className="bg-white/70 p-4 rounded-lg w-full mt-4"
      >
        <h3 className="font-semibold mb-2">Select gender</h3>
        <div
          role="radiogroup"
          aria-label="Gender"
          className="grid grid-cols-3 gap-2"
        >
          {(["male", "female", "other"] as Gender[]).map((g) => {
            const active = gender === g;
            return (
              <button
                key={g}
                role="radio"
                aria-checked={active}
                onClick={() => setGender(g)}
                className={[
                  "h-10 rounded-full border transition",
                  "text-sm font-medium",
                  active
                    ? "bg-[#20C2BE] text-white border-[#20C2BE] shadow"
                    : "bg-white text-[#07161B] border-black/10",
                ].join(" ")}
              >
                {g[0].toUpperCase() + g.slice(1)}
              </button>
            );
          })}
        </div>
        {submitted && !gender && (
          <p className="text-xs text-red-600 mt-1">Gender is required</p>
        )}
      </div>

      {/* DOB */}
      <div className="mt-6 px-1 pb-6 w-full" style={{ maxWidth: 490 }}>
        <Label
          htmlFor="dob"
          className="px-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-black/50 mb-2"
        >
          Date of birth
        </Label>

        <Popover open={dobOpen} onOpenChange={setDobOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="dob"
              className="w-full justify-between font-normal h-11"
            >
              {dobDate ? format(dobDate, "dd-MM-yyyy") : "dd-mm-yyyy"}
              <ChevronDownIcon className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden" align="start">
            <Calendar
              mode="single"
              selected={dobDate ?? undefined}
              captionLayout="dropdown"
              fromYear={minDate.getFullYear()}
              toYear={maxDate.getFullYear()}
              defaultMonth={dobDate ?? maxDate}
              onSelect={(date) => {
                if (!date) return;
                if (date < minDate) date = minDate;
                if (date > maxDate) date = maxDate;
                setDobYMD(toYMD(date));
                setDobOpen(false);
              }}
              disabled={(d) => d < minDate || d > maxDate}
            />
          </PopoverContent>
        </Popover>

        {submitted && !dobDate && (
          <p className="text-xs text-red-600 mt-1">Date of birth is required</p>
        )}
      </div>

      {/* Submit */}
      <CommonButton
        text={saving ? "Saving..." : "Next"}
        onClick={(e) => {
          e.preventDefault();
          handleNext();
        }}
        className="bottom-7 fixed w-72 disabled:bg-gray-300 disabled:opacity-50"
        disabled={saving || !cityId || !gender || !dobDate}
      />
    </div>
  );
}
