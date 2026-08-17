import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

const LG_BREAKPOINT = 1024;
export function useIsBeforeLg() {
  const [isBeforeLg, setIsBeforeLg] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const onChange = () => setIsBeforeLg(window.innerWidth < LG_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsBeforeLg(window.innerWidth < LG_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isBeforeLg;
}

const XL_BREAKPOINT = 1280;

export function useIsBeforeXl() {
  const [isBeforeXl, setIsBeforeXl] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${XL_BREAKPOINT}px)`);
    const onChange = () => {
      setIsBeforeXl(window.innerWidth < XL_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsBeforeXl(window.innerWidth < XL_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isBeforeXl;
}
