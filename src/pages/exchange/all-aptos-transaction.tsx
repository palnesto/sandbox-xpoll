import { AllTransactions } from "@/components/exchange/AllTransactions";
import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionsAptos() {
  return <AllTransactions assetType={ASSETS.X_OCTA} />; // symbol auto = "APTOS"
}
