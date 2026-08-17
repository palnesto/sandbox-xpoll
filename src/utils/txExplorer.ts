export function getTxExplorerUrl(txHash: string): string {
  if (!txHash) return "#";

  const paymentNetwork = String(import.meta.env.VITE_PAYMENT_NETWORK ?? "")
    .trim()
    .toLowerCase();
  const viteEnvMode = String(import.meta.env.VITE_MODE ?? "")
    .trim()
    .toLowerCase();
  const isMainnet =
    paymentNetwork === "mainnet" ||
    (paymentNetwork !== "testnet" && viteEnvMode === "production");
  return isMainnet
    ? `https://basescan.org/tx/${txHash}`
    : `https://sepolia.basescan.org/tx/${txHash}`;
}
