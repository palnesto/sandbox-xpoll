import { useEffect, useRef } from "react";

export function useIntersectionObserver(opts: {
  onIntersect: () => void;
  enabled?: boolean;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}) {
  const {
    onIntersect,
    enabled = true,
    root = null,
    rootMargin = "400px", // prefetch before it reaches bottom
    threshold = 0,
  } = opts;

  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { root, rootMargin, threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, root, rootMargin, threshold, onIntersect]);

  return ref;
}
