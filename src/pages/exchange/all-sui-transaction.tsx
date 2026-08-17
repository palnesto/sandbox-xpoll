import { AllTransactions } from "@/components/exchange/AllTransactions";
import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionsSui() {
  return <AllTransactions assetType={ASSETS.X_MYST} />; // symbol auto = "SUI"
}
