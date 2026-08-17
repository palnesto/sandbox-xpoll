import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
) {
  const timerRef = useRef<number | null>(null);
  const lastArgsRef = useRef<TArgs | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (!lastArgsRef.current) return;
    fn(...lastArgsRef.current);
    cancel();
  }, [cancel, fn]);

  const debounced = useCallback(
    (...args: TArgs) => {
      lastArgsRef.current = args;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (!lastArgsRef.current) return;
        fn(...lastArgsRef.current);
        cancel();
      }, delayMs);
    },
    [cancel, delayMs, fn]
  );

  // cleanup on unmount
  useEffect(() => cancel, [cancel]);

  return { debounced, cancel, flush };
}
