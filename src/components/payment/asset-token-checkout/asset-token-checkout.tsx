import { useEffect, useMemo, useRef, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";

import { endpoints } from "@/api/endpoints";
import {
  buildCheckoutResult,
  buildCheckoutSteps,
  mapCryptoCheckoutFlowError,
  type CheckoutRail,
  type CheckoutResult,
  type CheckoutStage,
  type WalletAction,
  type WalletStepNotice,
} from "@/components/payment/checkout-core";
import {
  CheckoutModal,
  CheckoutPageShell,
  EmptyStateCard,
  FooterButton,
  PageLoadingGrid,
} from "@/components/payment/checkout-ui";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  getEnabledCryptoPrice,
  getEnabledFiatPrice,
  normalizeAssetBuyConfig,
} from "@/lib/payments/buy-config";
import {
  isEvmPaymentIntentResponse,
  isPaymentFlowHandledError,
  PAYMENT_PROVIDER_CODE,
  requestPaymentIntent,
  type EvmPaymentIntentResponse,
  type PaymentFlowError,
  type PaymentIntentRecord,
} from "@/lib/payments/core";
import { getDefaultEvmPaymentChain } from "@/lib/payments/evm-network";
import { useEvmUsdcPayment } from "@/lib/payments/useEvmUsdcPayment";
import { useStripePayment } from "@/lib/payments/useStripePayment";
import { waitForWalletAddress } from "@/lib/payments/wallet";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { PAYMENT_INTENT_PURPOSE } from "../payment-configs";
import { AssetPurchaseCard } from "./asset-purchase-card";
import { ConfigureStep } from "./configure-step";
import { ResultStep } from "./result-step";
import { ReviewStep } from "./review-step";
import { StripeCheckoutStep } from "./stripe-checkout-step";
import type { AssetMarketCard, CoinAsset } from "./types";
import {
  formatOwnedAmount,
  getApiData,
  getDefaultRail,
  getErrorMessage,
  invalidateAssetPurchaseQueries,
  normalizeAssetId,
  validateQuantity,
} from "./utils";
import { WalletStep } from "./wallet-step";

export function AssetTokenCheckout() {
  const navigate = useNavigate();
  const { open: openWalletModal } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const stripePayment = useStripePayment();
  const cryptoPayment = useEvmUsdcPayment();
  const paymentChain = getDefaultEvmPaymentChain();

  const {
    data: coinsRaw,
    isLoading: isLoadingAssets,
    isError: hasAssetError,
    refetch: refetchAssets,
  } = useApiQuery(endpoints.assets.getAssetsInfo);
  const { data: meRaw } = useApiQuery(endpoints.profile.me);

  const coins = useMemo(() => {
    const payload = getApiData<CoinAsset[] | { data?: CoinAsset[] }>(coinsRaw);
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  }, [coinsRaw]);

  const me = useMemo(() => getApiData<Record<string, unknown>>(meRaw), [meRaw]);

  const assetMappings = useMemo(() => {
    if (!me || typeof me !== "object") return {};
    const value = me as {
      assetMappings?: Record<string, unknown>;
      assets?: Record<string, unknown>;
    };
    return value.assetMappings ?? value.assets ?? {};
  }, [me]);

  const assets = useMemo<AssetMarketCard[]>(() => {
    return coins
      .map((coin) => {
        const id = normalizeAssetId(coin) as AssetType;
        const spec = assetSpecs[id];
        if (!id || !spec) return null;

        const buyConfig = normalizeAssetBuyConfig(coin.buyConfig);
        const usdPricing = getEnabledFiatPrice(buyConfig, "USD");
        const usdcPricing = getEnabledCryptoPrice(
          buyConfig,
          BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
        );
        const mapping =
          typeof assetMappings === "object" && assetMappings !== null
            ? (
                assetMappings as Record<
                  string,
                  {
                    amount?: string | number | bigint;
                    value?: string | number | bigint;
                  }
                >
              )[id]
            : undefined;
        const ownedBase = mapping?.amount ?? mapping?.value ?? "0";

        return {
          id,
          buyConfig,
          decimal: coin.decimal ?? spec.decimal,
          displayName: coin.name || spec.name,
          displaySymbol: coin.symbol || spec.symbol,
          iconUrl: spec.img ?? null,
          isBuyable: Boolean(usdPricing || usdcPricing),
          minTokens: buyConfig?.minParentTokensPerOrder ?? 1,
          name: coin.name,
          ownedAmount: formatOwnedAmount(id, String(ownedBase)),
          parentLabel: coin.parent || spec.parent,
          symbol: coin.symbol || spec.symbol,
          usdPricing,
          usdcPricing,
        };
      })
      .filter((asset): asset is AssetMarketCard => Boolean(asset))
      .filter((asset) => asset.isBuyable)
      .sort((left, right) => left.parentLabel.localeCompare(right.parentLabel));
  }, [assetMappings, coins]);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stage, setStage] = useState<CheckoutStage>("configure");
  const [quantityInput, setQuantityInput] = useState("");
  const [selectedRail, setSelectedRail] = useState<CheckoutRail | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<WalletAction>(null);
  const [walletNotice, setWalletNotice] = useState<WalletStepNotice | null>(
    null,
  );
  const [isStripeSubmitting, setIsStripeSubmitting] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] =
    useState<PaymentIntentRecord | null>(null);
  const [cryptoIntent, setCryptoIntent] =
    useState<EvmPaymentIntentResponse | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  const quantityError = useMemo(
    () => validateQuantity(selectedAsset, quantityInput),
    [quantityInput, selectedAsset],
  );

  const quantity = useMemo(() => {
    if (quantityError) return null;
    return Number(quantityInput);
  }, [quantityError, quantityInput]);

  const usdTotalMinor = useMemo(() => {
    if (!selectedAsset?.usdPricing || quantity == null) return null;
    return selectedAsset.usdPricing.entry.rateInMinor * quantity;
  }, [quantity, selectedAsset]);

  const usdcTotalMinor = useMemo(() => {
    if (!selectedAsset?.usdcPricing || quantity == null) return null;
    return selectedAsset.usdcPricing.entry.rateInMinor * quantity;
  }, [quantity, selectedAsset]);

  const walletReady = Boolean(isConnected || address);
  const chainMatches = walletReady && chainId === paymentChain.id;
  const latestWalletReadyRef = useRef<boolean>(walletReady);
  const hasBlockingCheckoutAction =
    walletAction !== null ||
    stripePayment.isStarting ||
    isStripeSubmitting ||
    cryptoPayment.isPending;

  useEffect(() => {
    latestWalletReadyRef.current = walletReady;
  }, [walletReady]);

  useEffect(() => {
    if (walletReady && walletAction === "connect") {
      setWalletAction(null);
    }
  }, [walletAction, walletReady]);

  useEffect(() => {
    if (address) {
      setWalletNotice((current) =>
        current?.source === "connect" ? null : current,
      );
    }
  }, [address]);

  useEffect(() => {
    if (chainMatches) {
      setWalletNotice((current) =>
        current?.source === "switch" ? null : current,
      );
    }
  }, [chainMatches]);

  const steps = useMemo(
    () =>
      buildCheckoutSteps({
        rail: selectedRail,
        stage,
      }),
    [selectedRail, stage],
  );

  function resetEphemeralState() {
    setFormError(null);
    setRequestError(null);
    setWalletAction(null);
    setWalletNotice(null);
    setIsStripeSubmitting(false);
    setActivePaymentId(null);
    setPaymentRecord(null);
    setCryptoIntent(null);
    setResult(null);
    stripePayment.reset();
    cryptoPayment.reset();
  }

  function openCheckout(assetId: string) {
    const asset = assets.find((item) => item.id === assetId) ?? null;
    setSelectedAssetId(assetId);
    setQuantityInput(String(asset?.minTokens ?? 1));
    setSelectedRail(getDefaultRail(asset));
    setStage("configure");
    setIsModalOpen(true);
    resetEphemeralState();
  }

  function closeCheckout(nextOpen: boolean) {
    if (!nextOpen && hasBlockingCheckoutAction) {
      return;
    }

    setIsModalOpen(nextOpen);
    if (!nextOpen) {
      setSelectedAssetId(null);
      setStage("configure");
      setQuantityInput("");
      setSelectedRail(null);
      resetEphemeralState();
    }
  }

  function resetPaymentArtifacts() {
    setRequestError(null);
    setWalletNotice(null);
    setIsStripeSubmitting(false);
    setActivePaymentId(null);
    setPaymentRecord(null);
    setCryptoIntent(null);
    setResult(null);
    stripePayment.reset();
    cryptoPayment.reset();
  }

  function onQuantityChange(value: string) {
    setQuantityInput(value);
    setFormError(null);
    resetPaymentArtifacts();
  }

  function onRailChange(rail: CheckoutRail) {
    setSelectedRail(rail);
    setFormError(null);
    resetPaymentArtifacts();
  }

  function continueFromConfigure() {
    if (!selectedAsset) {
      setFormError("Select an asset to continue.");
      return;
    }
    if (!selectedAsset.isBuyable) {
      setFormError("This asset is currently unavailable for purchase.");
      return;
    }
    if (quantityError) {
      setFormError(quantityError);
      return;
    }

    const rail = selectedRail ?? getDefaultRail(selectedAsset);
    if (!rail) {
      setFormError("Choose a payment method to continue.");
      return;
    }
    if (rail === "fiat" && !selectedAsset.usdPricing) {
      setFormError("Card payment is not available for this asset right now.");
      return;
    }
    if (rail === "crypto" && !selectedAsset.usdcPricing) {
      setFormError("Crypto payment is not available for this asset right now.");
      return;
    }

    setFormError(null);
    setSelectedRail(rail);
    setStage(rail === "crypto" ? "wallet" : "review");
  }

  async function connectWallet() {
    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("connect");

    try {
      await openWalletModal();
      const nextAddress = await waitForWalletAddress({
        attempts: 40,
        intervalMs: 300,
      });

      if (!nextAddress && !latestWalletReadyRef.current) {
        setWalletNotice({
          source: "connect",
          tone: "warning",
          title: "Wallet not connected",
          description:
            "Wallet connection was not completed. Choose a wallet and connect to continue.",
        });
        return;
      }
    } catch {
      if (!latestWalletReadyRef.current) {
        setWalletNotice({
          source: "connect",
          tone: "warning",
          title: "Wallet not connected",
          description:
            "Wallet connection was not completed. Choose a wallet and connect to continue.",
        });
      }
    } finally {
      setWalletAction(null);
    }
  }

  async function switchNetwork() {
    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("switch");

    try {
      await switchChainAsync({ chainId: paymentChain.id });
    } catch {
      setWalletNotice({
        source: "switch",
        tone: "warning",
        title: "Network not switched",
        description: `Switch to ${paymentChain.name} to continue with crypto payment.`,
      });
    } finally {
      setWalletAction(null);
    }
  }

  function disconnectWallet() {
    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("disconnect");

    try {
      disconnect();
      setWalletNotice({
        source: "connect",
        tone: "warning",
        title: "Wallet disconnected",
        description:
          "Your wallet has been disconnected. Connect another wallet to continue with crypto payment.",
      });
    } catch {
      setWalletNotice({
        source: "connect",
        tone: "danger",
        title: "Wallet could not be disconnected",
        description:
          "We couldn't disconnect the wallet right now. Try again to switch wallets.",
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function createCryptoQuote() {
    if (!selectedAsset || quantity == null) return;

    setRequestError(null);
    setWalletNotice(null);
    setWalletAction("quote");

    try {
      const amountMinor = quantity * Math.pow(10, selectedAsset.decimal);
      const paymentIntent = await requestPaymentIntent({
        purpose: PAYMENT_INTENT_PURPOSE.PURCHASE_ASSET_TOKEN,
        providerCode: PAYMENT_PROVIDER_CODE.EVM,
        context: {
          assetType: selectedAsset.id,
          currency: BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC,
          amountMinor,
        },
      });

      if (!isEvmPaymentIntentResponse(paymentIntent)) {
        throw new Error("We couldn't prepare your crypto payment.");
      }

      setActivePaymentId(paymentIntent.paymentId);
      setCryptoIntent(paymentIntent);
      setStage("review");
    } catch (error) {
      setWalletNotice({
        source: "quote",
        tone: "danger",
        title: "We couldn't prepare payment",
        description: getErrorMessage(
          error,
          "We couldn't prepare your crypto payment.",
        ),
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function startStripeCheckout() {
    if (!selectedAsset || quantity == null) return;

    setRequestError(null);

    try {
      const amountMinor = quantity * Math.pow(10, selectedAsset.decimal);
      const response = await stripePayment.start({
        purpose: PAYMENT_INTENT_PURPOSE.PURCHASE_ASSET_TOKEN,
        context: {
          assetType: selectedAsset.id,
          currency: "USD",
          amountMinor,
        },
        fallbackErrorMessage: "We couldn't start card payment.",
      });

      setActivePaymentId(response.paymentId);
      setStage("stripe");
    } catch (error) {
      setRequestError(
        getErrorMessage(error, "We couldn't start card payment."),
      );
    }
  }

  async function finalizeSuccessfulPurchase(input: {
    payment: PaymentIntentRecord | null;
    paymentId?: string | null;
    txHash?: string | null;
  }) {
    setPaymentRecord(input.payment);
    setActivePaymentId(input.paymentId ?? input.payment?._id ?? null);
    await invalidateAssetPurchaseQueries(
      input.paymentId ?? input.payment?._id ?? null,
    );
    setResult(
      buildCheckoutResult({
        kind: "success",
        title: "Purchase complete",
        description:
          "The asset purchase has been confirmed. Your balance and purchase history are now refreshing.",
        payment: input.payment ?? null,
        paymentId: input.paymentId ?? input.payment?._id ?? null,
        txHash: input.txHash ?? null,
        retryStage: null,
      }),
    );
    setStage("result");
  }

  async function handleStripeResolved(nextResult: CheckoutResult) {
    setPaymentRecord(nextResult.payment ?? null);
    setResult(nextResult);

    if (nextResult.kind === "success") {
      await finalizeSuccessfulPurchase({
        payment: nextResult.payment,
        paymentId: nextResult.payment?._id ?? nextResult.paymentId,
      });
      return;
    }

    setStage("result");
  }

  async function payWithCrypto() {
    if (!cryptoIntent) return;

    setRequestError(null);

    try {
      const paymentOutcome = await cryptoPayment.pay(cryptoIntent);
      await finalizeSuccessfulPurchase({
        payment: paymentOutcome.payment,
        paymentId: paymentOutcome.payment._id,
        txHash: paymentOutcome.txHash,
      });
    } catch (error) {
      if (isPaymentFlowHandledError(error)) {
        setPaymentRecord(null);
        if (error.recoveryStage === "wallet") {
          setWalletNotice({
            source: walletReady ? "switch" : "connect",
            tone: "warning",
            title: "Wallet action needed",
            description:
              (error instanceof Error && error.message) ||
              "Reconnect your wallet to continue.",
          });
          setStage("wallet");
          return;
        }

        if (error.recoveryStage === "review") {
          setRequestError(
            (error instanceof Error && error.message) ||
              cryptoPayment.error ||
              "The wallet payment could not be completed.",
          );
          setStage("review");
          return;
        }

        setResult(
          mapCryptoCheckoutFlowError(
            error as PaymentFlowError,
            (error instanceof Error && error.message) ||
              cryptoPayment.error ||
              "The wallet payment could not be completed.",
          ),
        );
        setStage("result");
        return;
      }

      setResult(
        buildCheckoutResult({
          kind: "failed",
          title: "Crypto payment failed",
          description: getErrorMessage(
            error,
            "The wallet payment could not be completed.",
          ),
          retryLabel: "Back to review",
          retryStage: "review",
        }),
      );
      setStage("result");
    }
  }

  function retryFromResult() {
    if (!result?.retryStage) return;
    setRequestError(null);
    setResult(null);
    if (
      result.retryStage === "review" &&
      selectedRail === "crypto" &&
      !cryptoIntent
    ) {
      setStage("wallet");
      return;
    }
    setStage(result.retryStage);
  }

  const modalSubtitle = selectedAsset
    ? `Buy ${selectedAsset.parentLabel} with card or crypto in one guided checkout.`
    : "Choose an asset and complete your purchase in one guided checkout.";

  const resultPayment = result?.payment ?? paymentRecord;
  const resultTxHash =
    result?.txHash ??
    resultPayment?.display?.crypto?.txHash ??
    resultPayment?.settlement?.payload?.txHash ??
    null;
  const resultPaymentId =
    resultPayment?._id ?? result?.paymentId ?? activePaymentId ?? null;

  function openMarketplacePaymentHistory() {
    closeCheckout(false);
    navigate("/marketplace", {
      state: {
        marketplaceTab: "payments",
        highlightPaymentId: resultPaymentId,
        highlightRequestKey: Date.now(),
      },
    });
  }

  return (
    <>
      <CheckoutPageShell
        title="Buy Data Asset Coins"
        subtitle="Choose a data asset, review the total, and complete the purchase in one clear flow."
      >
        {isLoadingAssets ? (
          <PageLoadingGrid />
        ) : hasAssetError ? (
          <EmptyStateCard
            title="Marketplace assets could not be loaded"
            description="Retry the asset request to restore availability, rates, and purchase actions."
            action={
              <FooterButton
                type="button"
                className="bg-[#132238] text-white hover:bg-[#0f172a]"
                onClick={() => refetchAssets()}
              >
                <RefreshCw className="h-4 w-4" />
                Retry assets
              </FooterButton>
            }
          />
        ) : assets.length === 0 ? (
          <EmptyStateCard
            title="No buyable asset coins are available"
            description="There are no asset coins available to buy right now."
          />
        ) : (
          <div className="grid gap-4">
            {assets.map((asset) => (
              <AssetPurchaseCard
                key={asset.id}
                asset={asset}
                onBuy={openCheckout}
              />
            ))}
          </div>
        )}
      </CheckoutPageShell>

      <CheckoutModal
        open={isModalOpen}
        onOpenChange={closeCheckout}
        dismissible={false}
        eyebrow={selectedAsset?.displaySymbol ?? "Asset checkout"}
        title={selectedAsset ? `Buy ${selectedAsset.parentLabel}` : "Buy asset"}
        subtitle={modalSubtitle}
        steps={steps}
      >
        {stage === "configure" ? (
          <ConfigureStep
            selectedAsset={selectedAsset}
            quantityInput={quantityInput}
            quantity={quantity}
            quantityError={quantityError}
            formError={formError}
            usdTotalMinor={usdTotalMinor}
            usdcTotalMinor={usdcTotalMinor}
            selectedRail={selectedRail}
            onQuantityChange={onQuantityChange}
            onRailChange={onRailChange}
            onClose={() => closeCheckout(false)}
            onContinue={continueFromConfigure}
          />
        ) : null}

        {stage === "wallet" ? (
          <WalletStep
            walletReady={walletReady}
            chainMatches={chainMatches}
            paymentChainName={paymentChain.name}
            address={address}
            usdcTotalMinor={usdcTotalMinor}
            walletAction={walletAction}
            walletNotice={walletNotice}
            selectedAsset={selectedAsset}
            quantity={quantity}
            onBack={() => setStage("configure")}
            onConnectWallet={connectWallet}
            onDisconnectWallet={disconnectWallet}
            onSwitchNetwork={switchNetwork}
            onContinue={createCryptoQuote}
          />
        ) : null}

        {stage === "review" && selectedRail ? (
          <ReviewStep
            selectedRail={selectedRail}
            selectedAsset={selectedAsset}
            quantity={quantity}
            usdTotalMinor={usdTotalMinor}
            usdcTotalMinor={usdcTotalMinor}
            address={address}
            networkLabel={paymentChain.name}
            requestError={requestError}
            cryptoStatusText={cryptoPayment.statusText}
            cryptoError={cryptoPayment.error}
            isCryptoPending={cryptoPayment.isPending}
            hasCryptoIntent={Boolean(cryptoIntent)}
            isStripeStarting={stripePayment.isStarting}
            onBackToWallet={() => setStage("wallet")}
            onBackToConfigure={() => setStage("configure")}
            onPayWithCrypto={payWithCrypto}
            onStartStripeCheckout={startStripeCheckout}
          />
        ) : null}

        {stage === "stripe" &&
        selectedAsset &&
        quantity != null &&
        stripePayment.clientSecret &&
        activePaymentId ? (
          <StripeCheckoutStep
            clientSecret={stripePayment.clientSecret}
            paymentId={activePaymentId}
            asset={selectedAsset}
            quantity={quantity}
            totalUsdMinor={usdTotalMinor}
            onBack={() => setStage("review")}
            onResolved={handleStripeResolved}
            onSubmittingChange={setIsStripeSubmitting}
          />
        ) : null}

        {stage === "result" && result ? (
          <ResultStep
            result={result}
            selectedAsset={selectedAsset}
            quantity={quantity}
            selectedRail={selectedRail}
            resultPayment={resultPayment}
            resultTxHash={resultTxHash}
            usdTotalMinor={usdTotalMinor}
            usdcTotalMinor={usdcTotalMinor}
            address={address}
            onClose={() => closeCheckout(false)}
            onRetry={retryFromResult}
            onViewPayment={openMarketplacePaymentHistory}
          />
        ) : null}
      </CheckoutModal>
    </>
  );
}
