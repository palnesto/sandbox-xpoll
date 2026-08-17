import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getCampaignSocialDisconnectDescription } from "@/lib/campaign/social-ui";

export function CampaignSocialDisconnectDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirm: () => Promise<boolean>;
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-3xl border border-black/10 bg-white">
        <AlertDialogHeader className="space-y-3 text-left">
          <AlertDialogTitle className="text-xl font-semibold text-[#111827]">
            Disconnect Social Accounts from this campaign?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-[#5F7283]">
            {getCampaignSocialDisconnectDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-3 sm:justify-end">
          <AlertDialogCancel
            disabled={props.loading}
            className="rounded-full border-[#D7DCE2] text-[#1E293B]"
          >
            Keep connected
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={props.loading}
            onClick={() => {
              void props.onConfirm();
            }}
            className="rounded-full bg-[#B91C1C] text-white hover:bg-[#A11111]"
          >
            {props.loading ? "Disconnecting..." : "Disconnect"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
