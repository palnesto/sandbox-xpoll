import TransactionUI from "@/components/exchange/TransactionUI";
import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionXrp() {
  return (
    <TransactionUI
      assetType={ASSETS.X_DROP}
      symbolFrom="XXRP"
      gradient="#EA3131"
    />
  );
}
