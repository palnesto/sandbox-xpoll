import { CopyIconButton } from "@/components/ui/copy-icon-button";
import { getTxExplorerUrl } from "@/utils/txExplorer";

type Props = {
  txHash?: string | null;
};

function formatTxHash(value?: string | null) {
  const txHash = String(value ?? "").trim();
  if (!txHash) return "—";
  if (txHash.length <= 18) return txHash;
  return `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;
}

export function TxHashLink({ txHash }: Props) {
  const value = String(txHash ?? "").trim();
  if (!value) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <a
        href={getTxExplorerUrl(value)}
        target="_blank"
        rel="noreferrer"
        title={value}
        className="break-all text-sm font-semibold text-[#0f766e] underline decoration-[#7dd3cf] underline-offset-2 hover:text-[#115e59]"
      >
        {formatTxHash(value)}
      </a>
      <CopyIconButton
        value={value}
        srLabel="Copy transaction hash"
        copiedLabel="Transaction hash copied"
        className="shrink-0 text-[#0f766e]"
        iconClassName="h-4 w-4 text-[#0f766e]"
      />
    </div>
  );
}
