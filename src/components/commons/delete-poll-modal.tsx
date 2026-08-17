import { useEffect, useState } from "react";

import { useApiMutation } from "@/hooks/useApiMutation"; // 👈 add this
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import CommonButton from "./CommonButton";
import { queryClient } from "@/api/queryClient";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, [breakpoint]);
  return isMobile;
}

export function ConfirmEndPoll({
  id,
  onEnded,
  className,
}: {
  id: string;
  onEnded: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const { mutate: endPoll, isPending: ending } = useApiMutation({
    route: endpoints.poll.myPolls.deleteMyPollById(id),
    method: "DELETE",
    onSuccess: () => {
      setOpen(false);
      onEnded();
      queryClient.invalidateQueries({
        queryKey: [endpoints.poll.myPolls.getMyPollsStats],
      });
    },
    onError: (e) => {
      console.error("End poll failed", e);
      setOpen(false);
    },
  });

  return (
    <>
      <Button
        variant="secondary"
        className={[
          "rounded-full text-xs bg-rose-50 text-rose-600 hover:bg-rose-200 ring-1 ring-rose-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen(true)}
      >
        End Poll
      </Button>

      {/* Desktop: Dialog */}
      {!isMobile && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-center">End this poll?</DialogTitle>
              <DialogDescription className="text-center">
                Ending this poll will close voting and lock in the results. Once
                ended, no further responses can be submitted, and the poll
                cannot be reopened.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={ending}
                className="rounded-full text-[#0DACAD] border border-[#0DACAD] w-full max-w-[25rem] p-7"
              >
                Cancel
              </Button>
              <CommonButton
                text={ending ? "Ending…" : "Confirm"}
                variant="destructive"
                onClick={() => endPoll(undefined)}
                disabled={ending}
                className="rounded-full w-full"
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile: Drawer */}
      {isMobile && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-2 rounded-b-3xl text-center">
            <DrawerHeader>
              <DrawerTitle>End this poll?</DrawerTitle>
              <DrawerDescription>
                Ending this poll will close voting and lock in the results. Once
                ended, no further responses can be submitted, and the poll
                cannot be reopened.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pt-3 flex flex-row items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={ending}
                className="rounded-full border border-black/30 w-full max-w-[25rem] p-7"
              >
                Cancel
              </Button>
              <CommonButton
                text={ending ? "Ending…" : "Confirm"}
                variant="destructive"
                onClick={() => endPoll(undefined)}
                disabled={ending}
                className="rounded-full w-full"
              />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
