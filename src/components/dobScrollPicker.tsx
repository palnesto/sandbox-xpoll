import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Picker from "react-scrollable-picker";

export type DateScrollPickerProps = {
  itemHeight?: number;
  visibleRows?: number;
  startYear?: number;
  yearCount?: number;
  locale?: string;
  dateTimeFormatOptions?: Intl.DateTimeFormatOptions;
  defaultYear?: number;
  defaultMonth?: number; // 0..11
  defaultDay?: number; // 1..31
  highlightOverlayStyle?: React.CSSProperties;
  className?: string;
  onDateChange?: (date: Date) => void;
  emitOnScrollEndMs?: number;
  excludeCurrentYear?: boolean;
};

const ITEM_HEIGHT = 25;
const ROWS = 5;

const STYLES: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "inherit",
    margin: "16px auto",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  pickerWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    gap: 8,
  },
  columnWrap: {
    width: "33%",
    overscrollBehavior: "contain",
  },
  highlightOverlayBase: {
    position: "absolute",
    left: 0,
    right: 0,
    border: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(0,0,0,0.05)",
    borderRadius: 6,
    pointerEvents: "none",
    zIndex: 0,
  },
};

const defaultDateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  month: "long",
};

const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month + 1, 0).getDate();

function DateScrollPickerBase({
  itemHeight = ITEM_HEIGHT,
  visibleRows = ROWS,
  startYear = 2000,
  yearCount = 100,
  locale = "default",
  dateTimeFormatOptions = defaultDateTimeFormatOptions,
  defaultYear = new Date().getFullYear(),
  defaultMonth = new Date().getMonth(),
  defaultDay = new Date().getDate(),
  highlightOverlayStyle,
  className,
  onDateChange,
  emitOnScrollEndMs = 0,
  excludeCurrentYear = false,
}: DateScrollPickerProps) {
  const rows = useMemo(
    () => (visibleRows % 2 === 0 ? visibleRows + 1 : visibleRows),
    [visibleRows]
  );
  const pickerHeight = itemHeight * rows;

  // month labels
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleString(locale, dateTimeFormatOptions)
      ),
    [locale, dateTimeFormatOptions]
  );

  // years
  const today = new Date();
  const computedYearCount = useMemo(() => {
    if (excludeCurrentYear) {
      return Math.max(0, today.getFullYear() - startYear); // stops at last year
    }
    return yearCount;
  }, [excludeCurrentYear, startYear, yearCount, today]);

  const years = useMemo(
    () => Array.from({ length: computedYearCount }, (_, i) => startYear + i),
    [startYear, computedYearCount]
  );

  // value state
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [day, setDay] = useState(defaultDay);

  useEffect(() => {
    if (excludeCurrentYear && year === today.getFullYear()) {
      setYear(today.getFullYear() - 1);
    }
  }, [excludeCurrentYear, today, year]);

  const daysInMonth = useMemo(() => getDaysInMonth(month, year), [month, year]);
  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  const optionGroups = useMemo(() => {
    const dayOpts = Array.from({ length: daysInMonth }, (_, i) => {
      const v = i + 1;
      return { value: v, label: String(v).padStart(2, "0") };
    });
    const monthOpts = monthLabels.map((label, i) => ({ value: i, label }));
    const yearOpts = years.map((y) => ({ value: y, label: String(y) }));

    return { day: dayOpts, month: monthOpts, year: yearOpts } as const;
  }, [daysInMonth, monthLabels, years]);

  const valueGroups = useMemo(() => ({ day, month, year }), [day, month, year]);

  // debounce emit
  const emitTimer = useRef<number | null>(null);
  const emit = useCallback(
    (y: number, m: number, d: number) => {
      if (!onDateChange) return;
      const out = new Date(y, m, d);
      if (emitOnScrollEndMs > 0) {
        if (emitTimer.current) window.clearTimeout(emitTimer.current);
        emitTimer.current = window.setTimeout(
          () => onDateChange(out),
          emitOnScrollEndMs
        );
      } else {
        onDateChange(out);
      }
    },
    [onDateChange, emitOnScrollEndMs]
  );

  useEffect(() => {
    emit(year, month, day);
  }, [year, month, day, emit]);

  const handleChange = useCallback(
    (name: "day" | "month" | "year", val: number) => {
      if (name === "year") setYear(val);
      else if (name === "month") setMonth(val);
      else setDay(val);
    },
    []
  );

  return (
    <div className={className} style={STYLES.container}>
      <div
        style={{
          ...STYLES.pickerWrapper,
          height: pickerHeight,
          position: "relative",
        }}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <div style={STYLES.columnWrap}>
          <Picker
            optionGroups={{ day: optionGroups.day }}
            valueGroups={{ day }}
            onChange={handleChange as any}
            itemHeight={itemHeight}
            height={pickerHeight}
            width={"100%"}
          />
        </div>
        <div style={STYLES.columnWrap}>
          <Picker
            optionGroups={{ month: optionGroups.month }}
            valueGroups={{ month }}
            onChange={handleChange as any}
            itemHeight={itemHeight}
            height={pickerHeight}
            width={"100%"}
          />
        </div>
        <div style={STYLES.columnWrap}>
          <Picker
            optionGroups={{ year: optionGroups.year }}
            valueGroups={{ year }}
            onChange={handleChange as any}
            itemHeight={itemHeight}
            height={pickerHeight}
            width={"100%"}
          />
        </div>
        <div
          style={{
            ...STYLES.highlightOverlayBase,
            top: itemHeight * Math.floor(rows / 2),
            height: itemHeight,
            ...highlightOverlayStyle,
          }}
        />
      </div>
    </div>
  );
}

const DateScrollPicker = memo(DateScrollPickerBase);
export default DateScrollPicker;
