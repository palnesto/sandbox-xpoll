import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, Unplug, Wallet } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import type { CheckoutStep, WalletAction, WalletStepNotice } from "@/components/payment/checkout-core";
import {
  AnimatedDotsText,
  AssetMetric,
  CheckoutModal,
  CheckoutSection,
  FooterButton,
  NoticePanel,
  SummaryRows,
} from "@/components/payment/checkout-ui";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import {
  BUY_CONFIG_CRYPTO_DECIMALS,
  BUY_CONFIG_CRYPTO_TOKEN_KEYS,
  formatTokenAmountFromMinor,
} from "@/lib/payments/buy-config";
import {
  SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC,
  parseAtomicBigInt,
} from "@/lib/payments/subscription-allowance";
import { getEvmPaymentChainById } from "@/lib/payments/evm-network";
import { useSubscriptionAllowanceRefill } from "@/lib/payments/useSubscriptionAllowanceRefill";
import { shortenWalletAddress, waitForWalletAddress } from "@/lib/payments/wallet";
import { TxHashLink } from "./tx-hash-link";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectLabel: string;
  walletAddress: string | null | undefined;
  chainId: number | null | undefined;
  tokenAddress: string | null | undefined;
  spenderAddress: string | null | undefined;
  currentAllowanceAtomic: string | null | undefined;
  onSuccess?: () => Promise<unknown> | unknown;
};

type Stage = "wallet" | "review" | "done";

function formatAllowanceAtomic(amountAtomic: string | null | undefined) {
  const parsed = parseAtomicBigInt(amountAtomic);
  if (parsed === null) return "—";
  return `${formatTokenAmountFromMinor(
    Number(parsed),
    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
}

function buildSteps(stage: Stage): CheckoutStep[] {
  const currentIndex =
    stage === "wallet" ? 0 : stage === "review" ? 1 : 2;
  return ["Wallet", "Review", "Done"].map((label, index) => ({
    label,
    state:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "active"
          : "upcoming",
  }));
}

export function SubscriptionAllowanceRefillDialog(props: Props) {
  const { open } = useAppKit();
  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const refill = useSubscriptionAllowanceRefill();

  const [stage, setStage] = useState<Stage>("wallet");
  const [walletAction, setWalletAction] = useState<WalletAction>(null);
  const [walletNotice, setWalletNotice] = useState<WalletStepNotice | null>(null);
  const [refilledAllowanceAtomic, setRefilledAllowanceAtomic] = useState<
    string | null
  >(null);

  const requiredWalletAddress = String(props.walletAddress ?? "").trim();
  const tokenAddress = String(props.tokenAddress ?? "").trim();
  const spenderAddress = String(props.spenderAddress ?? "").trim();
  const requiredChainId = Number(props.chainId ?? 0);
  const networkName =
    getEvmPaymentChainById(requiredChainId)?.name ?? `Chain ${requiredChainId}`;
  const connectedAddress = String(address ?? "").trim();
  const hasConnectedAddress = isConnected && connectedAddress.length > 0;
  const walletMatches =
    hasConnectedAddress &&
    requiredWalletAddress.length > 0 &&
    connectedAddress.toLowerCase() === requiredWalletAddress.toLowerCase();
  const chainMatches =
    walletMatches &&
    Number.isFinite(requiredChainId) &&
    requiredChainId > 0 &&
    Number(connectedChainId ?? 0) === requiredChainId;
  const initialAllowanceAtomic = String(props.currentAllowanceAtomic ?? "").trim();
  const currentAllowanceAtomic =
    refilledAllowanceAtomic ?? (initialAllowanceAtomic || null);
  const currentAllowanceDisplay = formatAllowanceAtomic(currentAllowanceAtomic);
  const targetAllowanceDisplay = `${formatTokenAmountFromMinor(
    Number(SUBSCRIPTION_ALLOWANCE_TARGET_ATOMIC),
    BUY_CONFIG_CRYPTO_DECIMALS.USDC,
  )} ${BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC}`;
  const readiness = useMemo(() => {
    if (!requiredWalletAddress || !Number.isFinite(requiredChainId) || requiredChainId <= 0) {
      return {
        tone: "warning" as const,
        title: "Allowance refill is unavailable",
        description: "This subscription is missing the wallet or network details needed for an allowance refill.",
      };
    }

    if (!hasConnectedAddress) {
      return {
        tone: "warning" as const,
        title: "Connect the saved wallet",
        description: `Connect ${shortenWalletAddress(requiredWalletAddress)} to refill this auto-renew allowance.`,
      };
    }

    if (!walletMatches) {
      return {
        tone: "warning" as const,
        title: "Use the saved wallet",
        description: `This ${props.subjectLabel} uses ${shortenWalletAddress(requiredWalletAddress)} for auto-renew. Disconnect the current wallet and connect that wallet to continue.`,
      };
    }

    if (!chainMatches) {
      return {
        tone: "warning" as const,
        title: "Switch network",
        description: `Switch to ${networkName} to refill this auto-renew allowance.`,
      };
    }

    return {
      tone: "success" as const,
      title: "Wallet ready",
      description:
        "The saved wallet and network are ready. Continue to review the allowance refill.",
    };
  }, [
    chainMatches,
    hasConnectedAddress,
    networkName,
    props.subjectLabel,
    requiredChainId,
    requiredWalletAddress,
    walletMatches,
  ]);

  useEffect(() => {
    if (!props.open) {
      setStage("wallet");
      setWalletAction(null);
      setWalletNotice(null);
      setRefilledAllowanceAtomic(null);
      refill.reset();
    }
  }, [props.open]);

  async function handleConnectWallet() {
    setWalletAction("connect");
    setWalletNotice(null);
    try {
      await open();
      const nextAddress =
        (await waitForWalletAddress({
          attempts: 40,
          intervalMs: 300,
        })) ?? null;

      if (!nextAddress) {
        setWalletNotice({
          source: "connect",
          tone: "warning",
          title: "Wallet connection canceled",
          description: "No wallet was connected. Connect the saved wallet to continue.",
        });
        return;
      }

      if (nextAddress.toLowerCase() !== requiredWalletAddress.toLowerCase()) {
        setWalletNotice({
          source: "connect",
          tone: "danger",
          title: "Wrong wallet connected",
          description: `This ${props.subjectLabel} uses ${shortenWalletAddress(requiredWalletAddress)} for auto-renew. Disconnect the current wallet and connect that wallet instead.`,
        });
        return;
      }

      setWalletNotice(null);
    } catch (error) {
      setWalletNotice({
        source: "connect",
        tone: "danger",
        title: "We couldn't connect that wallet",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Connect the saved wallet to continue with this refill.",
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function handleDisconnectWallet() {
    setWalletAction("disconnect");
    setWalletNotice(null);
    try {
      await disconnectAsync();
      setWalletNotice({
        source: "disconnect",
        tone: "warning",
        title: "Wallet disconnected",
        description: `Connect ${shortenWalletAddress(requiredWalletAddress)} to continue.`,
      });
    } catch (error) {
      setWalletNotice({
        source: "disconnect",
        tone: "danger",
        title: "We couldn't disconnect the wallet",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Disconnect the current wallet and try again.",
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function handleSwitchNetwork() {
    setWalletAction("switch");
    setWalletNotice(null);
    try {
      await switchChainAsync({ chainId: requiredChainId });
      setWalletNotice(null);
    } catch (error) {
      setWalletNotice({
        source: "switch",
        tone: "warning",
        title: "Network switch canceled",
        description: `Switch to ${networkName} to continue with this refill.`,
      });
    } finally {
      setWalletAction(null);
    }
  }

  async function handleConfirmRefill() {
    if (
      !requiredWalletAddress ||
      !tokenAddress ||
      !spenderAddress ||
      !Number.isFinite(requiredChainId) ||
      requiredChainId <= 0
    ) {
      return;
    }

    try {
      const result = await refill.refillAllowance({
        walletAddress: requiredWalletAddress as `0x${string}`,
        tokenAddress: tokenAddress as `0x${string}`,
        spenderAddress: spenderAddress as `0x${string}`,
        chainId: requiredChainId,
      });
      setRefilledAllowanceAtomic(result.allowanceAtomic);
      await props.onSuccess?.();
      setStage("done");
    } catch {
      setStage("review");
    }
  }

  return (
    <CheckoutModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Refill auto-renew allowance"
      subtitle={`Use the saved wallet for this ${props.subjectLabel} to reset the USDC approval back to ${targetAllowanceDisplay}.`}
      eyebrow="Allowance Refill"
      steps={buildSteps(stage)}
      dismissible={!refill.isPending}
    >
      {stage === "wallet" ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <CheckoutSection
            title="Wallet readiness"
            caption="Make sure the saved wallet and network are ready before the refill starts."
          >
            <NoticePanel
              tone={readiness.tone}
              title={readiness.title}
              description={readiness.description}
            />

            <div className="mt-5 grid gap-3">
              <AssetMetric
                label="Saved wallet"
                value={
                  requiredWalletAddress ? (
                    <span className="inline-flex items-center gap-2">
                      <span>{shortenWalletAddress(requiredWalletAddress)}</span>
                      <CopyIconButton
                        value={requiredWalletAddress}
                        srLabel="Copy saved wallet address"
                        className="text-black/45 hover:text-[#132238]"
                      />
                    </span>
                  ) : (
                    "Unavailable"
                  )
                }
                caption="Used for auto-renew"
              />
              <AssetMetric
                label="Connected wallet"
                value={
                  hasConnectedAddress ? (
                    <span className="inline-flex items-center gap-2">
                      <span>{shortenWalletAddress(connectedAddress)}</span>
                      <CopyIconButton
                        value={connectedAddress}
                        srLabel="Copy connected wallet address"
                        className="text-black/45 hover:text-[#132238]"
                      />
                    </span>
                  ) : (
                    "Not connected"
                  )
                }
                caption={walletMatches ? "Correct wallet" : "Needs attention"}
              />
              <AssetMetric
                label="Network"
                value={chainMatches ? networkName : "Needs switch"}
                caption={`Required: ${networkName}`}
              />
              <AssetMetric
                label="Current allowance"
                value={currentAllowanceDisplay}
                caption="Saved USDC approval"
              />
            </div>

            {walletNotice ? (
              <div className="mt-5">
                <NoticePanel
                  tone={walletNotice.tone}
                  title={walletNotice.title}
                  description={walletNotice.description}
                />
              </div>
            ) : null}
          </CheckoutSection>

          <CheckoutSection
            title="Before you continue"
            caption="This step only prepares the saved wallet and network for the refill."
          >
            <SummaryRows
              rows={[
                { label: "For", value: props.subjectLabel },
                { label: "Saved wallet", value: requiredWalletAddress ? shortenWalletAddress(requiredWalletAddress) : "Unavailable" },
                { label: "Network", value: networkName },
                { label: "Allowance cap", value: targetAllowanceDisplay },
              ]}
            />

            <div className="mt-6 flex flex-col gap-3">
              <FooterButton
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
                disabled={refill.isPending || walletAction !== null}
              >
                Close
              </FooterButton>

              {hasConnectedAddress ? (
                <FooterButton
                  type="button"
                  className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                  disabled={walletAction !== null || refill.isPending}
                  onClick={handleDisconnectWallet}
                >
                  {walletAction === "disconnect" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Disconnecting wallet
                    </>
                  ) : (
                    <>
                      <Unplug className="h-4 w-4" />
                      Disconnect wallet
                    </>
                  )}
                </FooterButton>
              ) : null}

              {!walletMatches ? (
                <FooterButton
                  type="button"
                  className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                  disabled={walletAction !== null || refill.isPending}
                  onClick={handleConnectWallet}
                >
                  {walletAction === "connect" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting wallet
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      Connect saved wallet
                    </>
                  )}
                </FooterButton>
              ) : !chainMatches ? (
                <FooterButton
                  type="button"
                  className="bg-[#132238] text-white hover:bg-[#0f172a]"
                  disabled={walletAction !== null || refill.isPending}
                  onClick={handleSwitchNetwork}
                >
                  {walletAction === "switch" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Switching network
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Switch to {networkName}
                    </>
                  )}
                </FooterButton>
              ) : (
                <FooterButton
                  type="button"
                  className="bg-[#132238] text-white hover:bg-[#0f172a]"
                  disabled={walletAction !== null || refill.isPending}
                  onClick={() => setStage("review")}
                >
                  Continue to review
                  <ArrowRight className="h-4 w-4" />
                </FooterButton>
              )}
            </div>
          </CheckoutSection>
        </div>
      ) : stage === "review" ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <CheckoutSection
            title="Review allowance refill"
            caption="This resets the saved USDC approval to the capped amount used by auto-renew."
          >
            {refill.statusText ? (
              <NoticePanel
                tone="neutral"
                title="Allowance refill in progress"
                description={refill.statusText}
              />
            ) : (
              <NoticePanel
                tone="neutral"
                title="Ready to refill"
                description={`This will reset the saved wallet approval back to ${targetAllowanceDisplay}. It does not add on top of the current allowance.`}
              />
            )}

            {refill.error ? (
              <div className="mt-4">
                <NoticePanel
                  tone="danger"
                  title="We couldn't refill the allowance"
                  description={refill.error}
                />
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              <AssetMetric
                label="Saved wallet"
                value={shortenWalletAddress(requiredWalletAddress)}
                caption="Auto-renew wallet"
              />
              <AssetMetric
                label="Network"
                value={networkName}
                caption="Wallet must stay on this network"
              />
              <AssetMetric
                label="Current allowance"
                value={currentAllowanceDisplay}
                caption="Before refill"
              />
              <AssetMetric
                label="After refill"
                value={targetAllowanceDisplay}
                caption="Target cap"
              />
            </div>

            {refill.txHash ? (
              <div className="mt-5">
                <NoticePanel
                  tone="success"
                  title="Wallet transaction submitted"
                  description="We are waiting for chain confirmation on the allowance update."
                >
                  <div className="pt-1">
                    <TxHashLink txHash={refill.txHash} />
                  </div>
                </NoticePanel>
              </div>
            ) : null}
          </CheckoutSection>

          <CheckoutSection
            title="What happens next"
            caption="After this wallet approval confirms, the saved allowance shown on the subscription card will refresh."
          >
            <SummaryRows
              rows={[
                { label: "Current allowance", value: currentAllowanceDisplay },
                { label: "Target allowance", value: targetAllowanceDisplay },
                { label: "Token", value: BUY_CONFIG_CRYPTO_TOKEN_KEYS.USDC },
                { label: "Cap rule", value: "Exact reset to 3000, never additive" },
              ]}
            />

            <div className="mt-6 flex flex-col gap-3">
              <FooterButton
                type="button"
                variant="outline"
                disabled={refill.isPending}
                onClick={() => setStage("wallet")}
              >
                Back to wallet step
              </FooterButton>
              <FooterButton
                type="button"
                className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                disabled={refill.isPending}
                onClick={handleConfirmRefill}
              >
                {refill.isPending ? (
                  <AnimatedDotsText text="Refilling allowance" />
                ) : (
                  `Refill to ${targetAllowanceDisplay}`
                )}
              </FooterButton>
            </div>
          </CheckoutSection>
        </div>
      ) : (
        <div className="space-y-5">
          <CheckoutSection
            title="Allowance updated"
            caption="The saved auto-renew wallet now has the capped allowance again."
          >
            <NoticePanel
              tone="success"
              title="Refill complete"
              description={`The saved wallet can now spend up to ${targetAllowanceDisplay} for this ${props.subjectLabel}.`}
            />

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <AssetMetric
                label="Wallet"
                value={shortenWalletAddress(requiredWalletAddress)}
                caption="Saved auto-renew wallet"
              />
              <AssetMetric
                label="Allowance now"
                value={formatAllowanceAtomic(currentAllowanceAtomic)}
                caption="Updated cap"
              />
            </div>

            {refill.txHash ? (
              <div className="mt-5">
                <NoticePanel
                  tone="neutral"
                  title="Transaction hash"
                  description="You can open the approval transaction in the explorer."
                >
                  <div className="pt-1">
                    <TxHashLink txHash={refill.txHash} />
                  </div>
                </NoticePanel>
              </div>
            ) : null}
          </CheckoutSection>

          <FooterButton
            type="button"
            className="bg-[#132238] text-white hover:bg-[#0f172a]"
            onClick={() => props.onOpenChange(false)}
          >
            Done
          </FooterButton>
        </div>
      )}
    </CheckoutModal>
  );
}
