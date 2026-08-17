import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ASSETS } from "@/components/commons/constants";
import CommonButton from "../commons/CommonButton";
import { useNavigate } from "react-router";

const STORAGE_KEY = "signup-bonus-modal-dismissed";

export function setSignupBonusModalDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore
  }
}

export function getSignupBonusModalDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function SignupBonusModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const src = ASSETS.signupBonusModalVideoUrl;
  const navigate = useNavigate();
  const handleOpenChange = (next: boolean) => {
    if (!next) setSignupBonusModalDismissed();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl xl:max-w-4xl p-0 gap-0 border-0 bg-transparent shadow-none"
        onPointerDownOutside={() => handleOpenChange(false)}
        onEscapeKeyDown={() => handleOpenChange(false)}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="absolute right-1/2 translate-x-1/2 -top-10 z-10 text-white border border-white rounded-full p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {src ? (
            <video
              src={src}
              autoPlay
              playsInline
              loop
              className="w-full aspect-video object-contain"
            />
          ) : (
            <div className="aspect-video w-full flex items-center justify-center text-white/80">
              No video configured
            </div>
          )}
          <section className="hidden lg:flex gap-2 pt-2">
            <CommonButton
              text="Create Campaign"
              onClick={() => navigate("/campaigns/create")}
            />
            <CommonButton
              text="Explore XPOLL"
              onClick={() => handleOpenChange(false)}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
