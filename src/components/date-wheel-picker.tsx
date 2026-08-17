import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  pickerColumn: {
    width: "33%",
    overflowY: "scroll",
    scrollSnapType: "y mandatory",
    WebkitOverflowScrolling: "touch",
    borderRadius: 8,
    perspective: 1000,
    scrollbarWidth: "none" as any,
    msOverflowStyle: "none",
    transformStyle: "preserve-3d",
    position: "relative",
  },
  pickerItemBase: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    scrollSnapAlign: "center",
    fontSize: 16,
    fontWeight: 500,
    color: "#333",
    transition: "transform 0.2s ease, opacity 0.2s ease",
    userSelect: "none",
  },
  highlightOverlayBase: {
    position: "absolute",
    left: 0,
    right: 0,
    border: "1px solid #eee",
    background: "#eee",
    borderRadius: 4,
    pointerEvents: "none",
    zIndex: -1,
  },
};

const clampSet =
  <T,>(set: React.Dispatch<React.SetStateAction<T>>) =>
  (next: T) =>
    set((prev) => (Object.is(prev, next) ? prev : next));

const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month + 1, 0).getDate();
function useStableCallback<T extends (...args: any[]) => any>(fn?: T) {
  const ref = useRef(fn);
  ref.current = fn;

  return useCallback(((...args: any[]) => ref.current?.(...args)) as T, []);
}

function areEqualPropsIgnoreFns<P extends Record<string, any>>(
  prev: P,
  next: P
) {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const k of prevKeys) {
    const pv = prev[k];
    const nv = next[k];
    if (typeof pv === "function" || typeof nv === "function") continue;
    if (!Object.is(pv, nv)) return false;
  }
  return true;
}

type WheelColumnProps<T> = {
  values: T[];
  valueToLabel: (v: T, idx: number) => React.ReactNode;
  onSelect: (v: T) => void;
  selectedRef: React.MutableRefObject<T>;
  itemHeight: number;
  rows: number;
  initialIndex: number;
  paddingCount: number;
  justifyStart?: boolean;
  paddingLeft?: number;
};

const WheelColumn = memo(function WheelColumn<T>({
  values,
  valueToLabel,
  onSelect,
  selectedRef,
  itemHeight,
  rows,
  initialIndex,
  paddingCount,
  justifyStart,
  paddingLeft = 0,
}: WheelColumnProps<T>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const ticking = useRef(false);

  const update3DEffect = useCallback(() => {
    const container = ref.current;
    if (!container) return;
    const items = Array.from(container.children) as HTMLDivElement[];
    const center =
      container.scrollTop + itemHeight * Math.floor(rows / 2) + itemHeight / 2;
    const maxAngle = 360;

    for (const item of items) {
      const itemCenter = item.offsetTop + itemHeight / 2;
      const distance = itemCenter - center;
      const indexOffset = distance / itemHeight;
      const angle = indexOffset * 20;
      const rotateX = Math.max(-maxAngle, Math.min(maxAngle, angle));
      const scale = Math.max(0.96, 1 - Math.abs(distance) / 1000);
      const opacity = Math.max(0.3, 1 - Math.abs(distance) / 75);

      item.style.transform = `rotateX(${rotateX}deg) scale(${scale})`;
      item.style.opacity = `${opacity}`;
      item.style.transformOrigin = "left center";
      item.style.backfaceVisibility = "hidden";
      item.style.willChange = "transform, opacity";

      const nearCenter = Math.abs(indexOffset) < 0.5;
      if (nearCenter) {
        const marginAdjustment = -Math.abs(rotateX) * 0.12;
        (item.style as any).marginTop = `${marginAdjustment}px`;
        (item.style as any).marginBottom = `${marginAdjustment}px`;
      } else {
        (item.style as any).marginTop = "0px";
        (item.style as any).marginBottom = "0px";
      }
    }
  }, [itemHeight, rows]);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      ticking.current = false;
      const container = ref.current;
      if (!container) return;

      const visibleCenter =
        container.scrollTop +
        itemHeight * Math.floor(rows / 2) +
        itemHeight / 2;

      const items = Array.from(container.children) as HTMLDivElement[];
      let closestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemCenter = item.offsetTop + itemHeight / 2;
        const distance = Math.abs(itemCenter - visibleCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      const valueIndex = closestIndex - paddingCount;
      const v = values[valueIndex];
      if (v !== undefined && !Object.is(v, selectedRef.current)) {
        selectedRef.current = v;
        onSelect(v); // guarded upstream
      }

      update3DEffect();
    });
  }, [
    itemHeight,
    paddingCount,
    rows,
    values,
    onSelect,
    selectedRef,
    update3DEffect,
  ]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.scrollTo({ top: initialIndex * itemHeight, behavior: "auto" });
    requestAnimationFrame(update3DEffect);
  }, [initialIndex, itemHeight, update3DEffect]);

  return (
    <div
      style={{
        ...STYLES.pickerColumn,
        height: itemHeight * rows,
      }}
      ref={ref}
      onScroll={handleScroll}
    >
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>

      {Array.from({ length: paddingCount }).map((_, i) => (
        <div
          key={`pad-top-${i}`}
          style={{ ...STYLES.pickerItemBase, height: itemHeight }}
        />
      ))}

      {values.map((v, i) => (
        <div
          key={`val-${i}`}
          style={{
            ...STYLES.pickerItemBase,
            height: itemHeight,
            justifyContent: justifyStart ? "flex-start" : "center",
            paddingLeft: justifyStart ? paddingLeft : 0,
          }}
        >
          {valueToLabel(v, i)}
        </div>
      ))}

      {Array.from({ length: paddingCount }).map((_, i) => (
        <div
          key={`pad-bottom-${i}`}
          style={{ ...STYLES.pickerItemBase, height: itemHeight }}
        />
      ))}
    </div>
  );
});

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
};

const ITEM_HEIGHT = 25;
const ROWS = 5;
const defaultDateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  month: "long",
};

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
}: DateScrollPickerProps) {
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleString(locale, dateTimeFormatOptions)
      ),
    [locale, dateTimeFormatOptions]
  );
  const years = useMemo(
    () => Array.from({ length: yearCount }, (_, i) => startYear + i),
    [startYear, yearCount]
  );

  const [selectedDay, _setSelectedDay] = useState(defaultDay);
  const [selectedMonth, _setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, _setSelectedYear] = useState(defaultYear);
  const [daysInMonth, setDaysInMonth] = useState(31);

  const setSelectedDay = useCallback(clampSet(_setSelectedDay), []);
  const setSelectedMonth = useCallback(clampSet(_setSelectedMonth), []);
  const setSelectedYear = useCallback(clampSet(_setSelectedYear), []);

  const dayRefVal = useRef(selectedDay);
  const monthRefVal = useRef(selectedMonth);
  const yearRefVal = useRef(selectedYear);

  useEffect(() => {
    dayRefVal.current = selectedDay;
    monthRefVal.current = selectedMonth;
    yearRefVal.current = selectedYear;
  }, [selectedDay, selectedMonth, selectedYear]);

  const rows = useMemo(
    () => (visibleRows % 2 === 0 ? visibleRows + 1 : visibleRows),
    [visibleRows]
  );
  const paddingCount = Math.floor(rows / 2);

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  useEffect(() => {
    const dim = getDaysInMonth(monthRefVal.current, yearRefVal.current);
    setDaysInMonth((prev) => (prev === dim ? prev : dim));
    if (dayRefVal.current > dim) {
      setSelectedDay(dim);
    }
  }, [selectedMonth, selectedYear, setSelectedDay]);

  const renderDay = useCallback((d: number) => d, []);
  const renderMonth = useCallback((i: number) => months[i], [months]);
  const renderYear = useCallback((y: number) => y, []);

  const _onDateChange = useStableCallback(onDateChange);

  const emitTimer = useRef<number | null>(null);
  const emitChange = useCallback(
    (y: number, m: number, d: number) => {
      if (!_onDateChange) return;
      if (emitOnScrollEndMs > 0) {
        if (emitTimer.current) window.clearTimeout(emitTimer.current);
        emitTimer.current = window.setTimeout(() => {
          _onDateChange(new Date(y - 1, m - 1, d));
        }, emitOnScrollEndMs);
      } else {
        _onDateChange(new Date(y - 1, m - 1, d));
      }
    },
    [_onDateChange, emitOnScrollEndMs]
  );

  useEffect(() => {
    emitChange(selectedYear, selectedMonth, selectedDay);
  }, [selectedDay, selectedMonth, selectedYear, emitChange]);

  const initialDayIndex = Math.max(0, defaultDay - 1);
  const initialMonthIndex = defaultMonth;
  const initialYearIndex = Math.max(
    0,
    years.findIndex((y) => y === defaultYear)
  );

  return (
    <div className={className} style={STYLES.container}>
      <div style={{ ...STYLES.pickerWrapper, height: itemHeight * rows }}>
        <WheelColumn
          values={days}
          valueToLabel={renderDay}
          onSelect={setSelectedDay}
          selectedRef={dayRefVal}
          itemHeight={itemHeight}
          rows={rows}
          initialIndex={initialDayIndex}
          paddingCount={paddingCount}
          justifyStart
          paddingLeft={45}
        />

        <WheelColumn
          values={months.map((_, i) => i)}
          valueToLabel={renderMonth}
          onSelect={setSelectedMonth}
          selectedRef={monthRefVal}
          itemHeight={itemHeight}
          rows={rows}
          initialIndex={initialMonthIndex}
          paddingCount={paddingCount}
          justifyStart
        />
        <WheelColumn
          values={years}
          valueToLabel={renderYear}
          onSelect={setSelectedYear}
          selectedRef={yearRefVal}
          itemHeight={itemHeight}
          rows={rows}
          initialIndex={initialYearIndex}
          paddingCount={paddingCount}
        />

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

const DateScrollPicker = memo(DateScrollPickerBase, areEqualPropsIgnoreFns);
export default DateScrollPicker;
export { DateScrollPickerBase as _UnmemoizedDateScrollPicker };
export type { WheelColumnProps };
