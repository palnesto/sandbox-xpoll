import TransactionUI from "@/components/exchange/TransactionUI";
import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionSui() {
  return (
    <TransactionUI
      assetType={ASSETS.X_MYST}
      symbolFrom="XSUI"
      gradient="#31CAEA"
    />
  );
}
