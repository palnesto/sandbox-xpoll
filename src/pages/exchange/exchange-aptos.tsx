import CoinDetail from "@/components/exchange/CoinDetail";
import aptosChest from "@/assets/exchangeAptos.webp";
import { ASSETS, assetSpecs } from "@/utils/currency-assets/asset";

export default function ExchangeAptosPage() {
  return (
    <CoinDetail
      assetType={ASSETS.X_OCTA}
      label="XAPTOS"
      gradient="linear-gradient(180deg,#7C7AF8 0%,#6D5BF0 100%)"
      chestImgColor={aptosChest}
      coinImgColor={assetSpecs[ASSETS.X_OCTA].img}
    />
  );
}
