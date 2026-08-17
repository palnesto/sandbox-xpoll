import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fully custom date+time picker (no native <input type="date" /> or
 * <input type="time" />). Avoids the cross-browser quirks where the
 * native date popup can hijack clicks meant for the time field.
 *
 * Value shape: "YYYY-MM-DDTHH:MM"
 */
type Props = {
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
  placeholder?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute steps

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parts(value: string) {
  // Returns { y, m, d, hh, mm } from "YYYY-MM-DDTHH:MM" (any field may be 0/empty)
  if (!value) {
    const now = new Date();
    return {
      y: now.getFullYear(),
      m: now.getMonth() + 1,
      d: now.getDate(),
      hh: 9,
      mm: 0,
    };
  }
  const [dateStr, timeStr] = value.split("T");
  const [y, m, d] = (dateStr ?? "").split("-").map((s) => parseInt(s, 10));
  const [hh, mm] = (timeStr ?? "").split(":").map((s) => parseInt(s, 10));
  return {
    y: Number.isFinite(y) ? y : new Date().getFullYear(),
    m: Number.isFinite(m) ? m : new Date().getMonth() + 1,
    d: Number.isFinite(d) ? d : new Date().getDate(),
    hh: Number.isFinite(hh) ? hh : 9,
    mm: Number.isFinite(mm) ? mm : 0,
  };
}

function buildValue(y: number, m: number, d: number, hh: number, mm: number) {
  return `${y}-${pad2(m)}-${pad2(d)}T${pad2(hh)}:${pad2(mm)}`;
}

function daysInMonth(y: number, m: number) {
  // m is 1-indexed
  return new Date(y, m, 0).getDate();
}

function formatDisplay(value: string): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function DateTimePopover({
  value,
  onChange,
  error,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const p = useMemo(() => parts(value), [value]);

  // Calendar's currently-displayed month (not the same as selected month).
  const [view, setView] = useState({ y: p.y, m: p.m });
  // Keep the view in sync when value changes externally.
  useEffect(() => {
    if (!value) return;
    setView({ y: p.y, m: p.m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickDay = (d: number) => {
    onChange(buildValue(view.y, view.m, d, p.hh, p.mm));
  };
  const pickHour = (hh: number) => {
    onChange(buildValue(p.y, p.m, p.d, hh, p.mm));
  };
  const pickMinute = (mm: number) => {
    onChange(buildValue(p.y, p.m, p.d, p.hh, mm));
  };
  const shiftMonth = (delta: number) => {
    setView((cur) => {
      let m = cur.m + delta;
      let y = cur.y;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      return { y, m };
    });
  };

  // Build calendar grid: 6 weeks × 7 days
  const monthGrid = useMemo(() => {
    const first = new Date(view.y, view.m - 1, 1);
    const firstWeekday = first.getDay(); // 0..6
    const total = daysInMonth(view.y, view.m);
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [view]);

  const selectedDay =
    p.y === view.y && p.m === view.m && value ? p.d : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full rounded-xl border px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition",
          error
            ? "border-red-500"
            : "border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-gray-200",
          !value && "text-gray-400",
        )}
      >
        <span className="truncate">
          {value ? formatDisplay(value) : placeholder ?? "Pick date & time"}
        </span>
        <Calendar className="w-4 h-4 text-black/50 shrink-0" />
      </button>

      {open ? (
        <div
          className="absolute z-50 mt-2 left-0 sm:w-[320px] w-full rounded-2xl border border-black/10 bg-white shadow-xl p-4"
          // stop clicks inside the popover from doing anything weird
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
              Pick date & time
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-black/5 text-black/60"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-md p-1 hover:bg-black/5 text-black/70"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold text-[#222]">
              {MONTHS[view.m - 1]} {view.y}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-md p-1 hover:bg-black/5 text-black/70"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 text-[10px] text-black/45 font-semibold uppercase mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center py-0.5">
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((d, i) =>
              d === null ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={cn(
                    "h-8 rounded-md text-xs font-medium transition",
                    selectedDay === d
                      ? "bg-[#0EA5A5] text-white"
                      : "hover:bg-black/5 text-[#222]",
                  )}
                >
                  {d}
                </button>
              ),
            )}
          </div>

          {/* Time row */}
          <div className="mt-4 pt-3 border-t border-black/5">
            <label className="text-[11px] font-medium text-black/60">
              Time
            </label>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={p.hh}
                onChange={(e) => pickHour(parseInt(e.target.value, 10))}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))}
              </select>
              <span className="text-black/50 font-semibold">:</span>
              <select
                value={p.mm - (p.mm % 5)}
                onChange={(e) => pickMinute(parseInt(e.target.value, 10))}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-4 flex items-center gap-2">
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs text-black/60 hover:text-black/90 underline"
              >
                Clear
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#0EA5A5] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#0c9a9a]"
            >
              <Check className="w-3.5 h-3.5" />
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
