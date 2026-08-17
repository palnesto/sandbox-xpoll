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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectLabel: string;
  walletAddress?: string | null;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

function formatWalletAddress(value?: string | null) {
  const wallet = String(value ?? "").trim();
  if (!wallet) return "your connected wallet";
  if (wallet.length <= 14) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export function ContinueNowConfirmDialog({
  open,
  onOpenChange,
  subjectLabel,
  walletAddress,
  loading = false,
  onConfirm,
}: Props) {
  const displayWallet = formatWalletAddress(walletAddress);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-3xl border border-black/10 bg-white">
        <AlertDialogHeader className="space-y-3 text-left">
          <AlertDialogTitle className="text-xl font-semibold text-[#111]">
            Start Continue now?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-[#5F5F5F]">
            We’ll try this {subjectLabel} payment again now using {displayWallet}
            , the wallet already set up for auto-renew. You do not need to sign
            anything again in your wallet for this step.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:justify-end">
          <AlertDialogCancel
            disabled={loading}
            className="rounded-full border-[#D7DCE2] text-[#1E293B]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={() => {
              void onConfirm();
            }}
            className="rounded-full bg-[#0EA5A5] text-white hover:bg-[#0C9A9A]"
          >
            {loading ? "Submitting..." : "Start Continue now"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
