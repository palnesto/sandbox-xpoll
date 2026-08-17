import CoinDetail from "@/components/exchange/CoinDetail";
import { ASSETS, assetSpecs } from "@/utils/currency-assets/asset";
import suiChest from "@/assets/exchangeSui.webp";

export default function ExchangeSuiPage() {
  return (
    <>
      <CoinDetail
        assetType={ASSETS.X_MYST}
        label="XSUI"
        gradient="linear-gradient(180deg,#42E0E7 0%,#2CC5E3 100%)"
        chestImgColor={suiChest}
        coinImgColor={assetSpecs[ASSETS.X_MYST].img}
      />
    </>
  );
}
