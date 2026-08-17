import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import BackButton from "./back-button";
import CommonButton from "./CommonButton";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  showBackButton?: boolean;
  className?: string;
  disabled?: boolean;
  backTo?: string;
}

export const ResponsiveModal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showBackButton = true,
  className,
  disabled,
  backTo,
}: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={`px-6 pb-2 mx-1 text-black rounded-t-xl rounded-b-[35px] [&>div:first-child]:hidden ${className}`}
        >
          <DrawerHeader className="flex items-center">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <BackButton
                  to={backTo ?? undefined}
                  onClick={
                    !backTo
                      ? () => {
                          onOpenChange(false);
                        }
                      : undefined
                  }
                />
              )}
              <DrawerTitle className="text-2xl font-bold">{title}</DrawerTitle>
            </div>

            <DrawerDescription className="font-semibold text-lg text-black">
              {description}
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="px-4 flex w-full flex-col gap-8">
            <div>{children}</div>
            <div className="flex w-full flex-col gap-3">
              <CommonButton
                text={actionLabel}
                className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onAction}
                disabled={disabled}
              />
              {secondaryActionLabel && onSecondaryAction ? (
                <CommonButton
                  text={secondaryActionLabel}
                  className="w-full border border-[#0DACAD] bg-white text-[#0DACAD] hover:bg-[#eafcfb] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onSecondaryAction}
                  disabled={disabled}
                />
              ) : null}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-md p-10 bg-white text-black rounded-xl ${className}`}
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          {showBackButton && (
            <BackButton
              to={backTo ?? undefined}
              onClick={
                !backTo
                  ? () => {
                      onOpenChange(false);
                    }
                  : undefined
              }
              className="left-4 top-10 absolute"
            />
          )}
          <DrawerTitle className="text-xl font-bold pl-10">{title}</DrawerTitle>

          <DrawerDescription className="font-semibold text-lg text-black">
            {description}
          </DrawerDescription>
        </DialogHeader>

        <div>{children}</div>

        <DialogFooter
          className={`flex w-full gap-3 ${secondaryActionLabel && onSecondaryAction ? "!flex-col" : "flex-col"}`}
        >
          <CommonButton
            text={actionLabel}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onAction}
          />
          {secondaryActionLabel && onSecondaryAction ? (
            <CommonButton
              text={secondaryActionLabel}
              className="w-full border border-[#0DACAD] bg-white text-[#0DACAD] hover:bg-[#eafcfb] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
              onClick={onSecondaryAction}
            />
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
