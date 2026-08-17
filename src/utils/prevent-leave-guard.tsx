import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { UNSAFE_NavigationContext } from "react-router-dom";

type PreventLeaveGuardProps = {
  when: boolean;
  message?: string;
  blockUnload?: boolean;
  children?: (api: {
    requestLeave: (next?: () => void) => void;
    isOpen: boolean;
  }) => React.ReactNode;
};

const SENTINEL_KEY = "__preventLeaveGuard__";

/**
 * Centralized leave guard for React Router v6/v7.
 *
 * Blocks ALL navigation when active:
 * - Hard refresh (F5 / Cmd+R / Ctrl+R)
 * - Browser reload icon
 * - Browser back / forward arrows
 * - React Router navigation (Link, navigate(), route changes)
 * - Tab close / direct URL change
 * - UI back/tab buttons (when wired via requestLeave, or intercepted by blocker)
 *
 * Two-path behavior (browser limitation):
 * - F5, reload icon, closing tab, direct URL change → native beforeunload ONLY
 *   (Browsers do not allow custom UI during beforeunload)
 * - Back/forward arrows, React Router, UI buttons → custom modal (Stay / Confirm)
 *
 * How it works:
 * - navigator.block: intercepts in-app navigations (Link, navigate(), back/forward) BEFORE unmount.
 *   Works with BrowserRouter (useBlocker requires data router). On Confirm: unblock + tx.retry().
 *   On Stay: do not retry, keep user on page.
 * - popstate: fallback for browser back/forward when navigator.block may not fire.
 * - proceedingRef: when user confirms (requestLeave) and we call their callback (which navigates),
 *   the blocker must not re-intercept. We set proceedingRef before calling.
 */
export function PreventLeaveGuard({
  when,
  message = "If you refresh this page or go back, you will lose the filled info.",
  blockUnload = true,
  children,
}: PreventLeaveGuardProps) {
  const nav = useContext(UNSAFE_NavigationContext)?.navigator as unknown as
    | { block: (fn: (tx: { retry: () => void }) => void) => () => void }
    | null
    | undefined;

  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<null | (() => void)>(null);
  const pendingTxRef = useRef<null | (() => void)>(null);
  const proceedingRef = useRef(false);
  const popstateProceedingRef = useRef(false);
  const sentinelPushedRef = useRef(false);
  const openedFromPopstateRef = useRef(false);

  // ---- React Router: navigator.block (works with BrowserRouter) ----
  // Blocks in-app navigations BEFORE unmount. useBlocker requires data router.
  useEffect(() => {
    if (!when || !nav?.block) return;

    const unblock = nav.block((tx) => {
      if (proceedingRef.current || popstateProceedingRef.current) {
        unblock();
        tx.retry();
        return;
      }
      pendingTxRef.current = () => {
        unblock();
        tx.retry();
      };
      setOpen(true);
    });

    return unblock;
  }, [when, nav]);

  const showModal = open;

  // ---- beforeunload: native dialog only (no custom modal possible) ----
  useEffect(() => {
    if (!when || !blockUnload) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when, blockUnload]);

  // ---- Popstate: browser back/forward (supplement to useBlocker) ----
  // Push sentinel when guard activates. On popstate: show modal. Stay: history.forward()
  // (avoids stacking). Confirm: set flag, history.back().
  useEffect(() => {
    if (!when) {
      sentinelPushedRef.current = false;
      return;
    }

    const pushSentinel = () => {
      if (sentinelPushedRef.current) return;
      try {
        window.history.pushState(
          { [SENTINEL_KEY]: true },
          "",
          window.location.href,
        );
        sentinelPushedRef.current = true;
      } catch {
        sentinelPushedRef.current = false;
      }
    };

    const onPopState = () => {
      if (popstateProceedingRef.current) {
        popstateProceedingRef.current = false;
        sentinelPushedRef.current = false;
        return;
      }
      if (!when) return;
      sentinelPushedRef.current = false;
      pushSentinel();
      openedFromPopstateRef.current = true;
      setOpen(true);
      pendingActionRef.current = () => {
        popstateProceedingRef.current = true;
        window.history.back();
      };
    };

    pushSentinel();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      sentinelPushedRef.current = false;
    };
  }, [when]);

  // ---- Confirm: allow the pending navigation to proceed ----
  const confirmLeave = useCallback(() => {
    setOpen(false);
    openedFromPopstateRef.current = false;

    const pendingTx = pendingTxRef.current;
    pendingTxRef.current = null;
    if (pendingTx) {
      pendingTx();
      return;
    }

    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pendingAction) {
      proceedingRef.current = true;
      pendingAction();
    }
  }, []);

  // ---- Cancel / Stay: block navigation, keep user on page ----
  const cancelLeave = useCallback(() => {
    if (openedFromPopstateRef.current) {
      window.history.forward();
      openedFromPopstateRef.current = false;
    }
    pendingTxRef.current = null;
    pendingActionRef.current = null;
    setOpen(false);
  }, []);

  // ---- requestLeave: for UI buttons (tab change, back) - backward compat ----
  const requestLeave = useCallback(
    (next?: () => void) => {
      if (!when) return next?.();
      if (showModal) return;
      pendingActionRef.current = next ?? null;
      setOpen(true);
    },
    [when, showModal],
  );

  const api = useMemo(
    () => ({
      requestLeave,
      isOpen: showModal,
    }),
    [requestLeave, showModal],
  );

  return (
    <>
      {typeof children === "function" ? children(api) : null}

      <AlertDialog open={showModal} onOpenChange={(v) => !v && cancelLeave()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Leave this page?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              {message}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave} className="text-lg p-5">
              Stay
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmLeave}
              className="p-5 bg-red-500 text-lg text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
