import TransactionUI from "@/components/exchange/TransactionUI";
import { ASSETS } from "@/utils/currency-assets/asset";

export default function TransactionAptos() {
  return (
    <TransactionUI
      assetType={ASSETS.X_OCTA}
      symbolFrom="XAPTOS"
      gradient="#6C31EA"
    />
  );
}
