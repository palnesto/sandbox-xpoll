import { AllTransactions } from "@/components/exchange/AllTransactions";
import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionsXrp() {
  return <AllTransactions assetType={ASSETS.X_DROP} />; // symbol auto = "XRP"
}
