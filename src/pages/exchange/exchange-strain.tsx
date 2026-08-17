import CoinDetail from "@/components/exchange/CoinDetail";
import chestImg from "@/assets/exchangeHigh.webp";
import { ASSETS, assetSpecs } from "@/utils/currency-assets/asset";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
// import BackButton from "@/components/commons/back-button";
// import { LockKeyhole } from "lucide-react";

export default function StrainClaimPage() {
  const { data } = useApiQuery(endpoints.strain.getWeb2SellStatus);
  const isSellStrainActive = data?.data?.data?.isSellStrainActive ?? false;

  return (
    <section className="absolute left-0 right-0 h-full w-full">
      <CoinDetail
        assetType={ASSETS.X_HIGH}
        label="XSTRAIN"
        gradient="linear-gradient(180deg,#31EA62 0%,#28db58 100%)"
        chestImgColor={chestImg}
        coinImgColor={assetSpecs[ASSETS.X_HIGH].img}
        explicitDisable={!isSellStrainActive}
        explicitDisableText={
          !isSellStrainActive ? "Strain Claim Unavailable" : "Claim Unavailable"
        }
      />
      {/* {!isSellStrainActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />

          <div className="relative flex flex-col justify-center items-center w-full max-w-sm md:max-w-lg rounded-2xl border border-black/10 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
            <BackButton className="absolute top-4 left-4" to={"/exchange"} />
            <>
              <div className="mx-auto p-4 flex h-28 w-28 items-center justify-center rounded-full bg-black/5">
                <LockKeyhole className=" text-black h-full w-full" />
              </div>

              <h2 className="text-center my-4 text-xl md:text-2xl font-semibold">
                XSTRAIN → STRAIN Conversion
              </h2>

              <span className="text-black/60">Drop Hits Jan 20, 2026.</span>
              <p className="text-center  text-black/60">
                Stack XSTRAIN. Trust The Signal.
              </p>
              <a
                href="/trial"
                className="my-4 rounded-full bg-blue px-6 py-3 text-white"
              >
                Start Polling
              </a>
            </>
          </div>
        </div>
      )} */}
    </section>
  );
}
