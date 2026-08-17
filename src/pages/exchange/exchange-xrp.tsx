import CoinDetail from "@/components/exchange/CoinDetail";
import { ASSETS, assetSpecs } from "@/utils/currency-assets/asset";
import xrpChest from "@/assets/exchangeXrp.webp";

export default function ExchangeXrpPage() {
  return (
    <CoinDetail
      assetType={ASSETS.X_DROP}
      label="XXRP"
      gradient="linear-gradient(180deg,#FF5858 0%,#F13E3E 100%)"
      chestImgColor={xrpChest}
      coinImgColor={assetSpecs[ASSETS.X_DROP].img}
    />
  );
}
