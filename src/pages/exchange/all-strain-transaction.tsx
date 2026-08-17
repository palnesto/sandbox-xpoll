import { AllStrainTransactions } from "@/components/exchange/AllStrainTransaction";

import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionsAptos() {
  return <AllStrainTransactions assetType={ASSETS.X_HIGH} />;
}
