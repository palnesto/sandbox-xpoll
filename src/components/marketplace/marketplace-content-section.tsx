import TopCoins from "@/components/dashboard/TopCoins";
import { AssetTokenCheckout } from "@/components/payment/asset-token-checkout";
import { LedgerHistoryList } from "@/components/profile/LedgerHistoryList";
import MemoMarketplaceSubscriptions from "@/components/profile/MarketPlaceSubscriptions";

export function MarketplaceContentSection() {
  return (
    <>
      <TopCoins />
      <AssetTokenCheckout />
      <MemoMarketplaceSubscriptions />
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center">Purchase History</h2>
        <LedgerHistoryList
          actions={["asset-purchase"]}
          emptyText="No purchases yet."
        />
      </div>
    </>
  );
}
