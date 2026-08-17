import { useMemo, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useCoinPrefsStore } from "@/stores/coin_prefs.store";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  ASSETS,
  assetSpecs,
  type AssetType,
} from "@/utils/currency-assets/asset";
import { shortenAmount } from "@/utils/currency-assets/amount-formatter";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { getSignupBonusModalDismissed } from "@/components/modals/SignupBonusModal";

export type CoinRow = {
  symbol: string;
  price: number;
  iconUrl?: string;
  assetType: AssetType; // add this
  baseAmount: string | number | bigint; // add this
};

const MAX = 4;

export default function TopCoins({ title = "Top Coins" }: { title?: string }) {
  const [open, setOpen] = useState(false);
  const { selectedSymbols, toggle, setSelected } = useCoinPrefsStore();

  // 🔹 fetch user + assets
  const { data: meData, isLoading } = useApiQuery(endpoints.profile.me);
  const me = useMemo(() => {
    return meData?.data?.data ?? meData?.data ?? meData ?? null;
  }, [meData]);

  // 🔹 first-time signup: show only xPoll until they dismiss the signup bonus modal
  const ledgersUrl = `${endpoints.assets.getLedgers}?page=1&pageSize=10`;
  const { data: ledgersData } = useApiQuery(ledgersUrl, {
    queryKey: [ledgersUrl],
    enabled: !!me,
  });
  const showOnlyXPoll = useMemo(() => {
    const root = (ledgersData as any)?.data?.data ?? (ledgersData as any)?.data ?? ledgersData;
    const items = Array.isArray(root?.items) ? root.items : [];
    const hasSignupBonus = items.some((item: { action?: string }) => item.action === "signup-bonus");
    return hasSignupBonus && !getSignupBonusModalDismissed();
  }, [ledgersData]);

  // 🔹 transform into CoinRow[] (filter to xPoll only for first-time signup)
  const coins: CoinRow[] = useMemo(() => {
    if (!me) return [];

    const mappings = me?.assetMappings ?? me?.assets ?? {};
    const rows: CoinRow[] = [];

    for (const k of Object.keys(mappings)) {
      const m = mappings[k];
      const assetType = (m?.assetType ?? k) as AssetType;
      if (!(assetType in assetSpecs)) continue;

      const baseAmount = m?.amount ?? m?.value ?? 0;

      const price = unwrapString(
        amount({
          op: "toParent",
          assetId: assetType,
          value: baseAmount,
          output: "string",
          trim: true,
          group: false,
        }),
      );

      const symbol =
        assetType === ASSETS.X_POLL
          ? "XPOLL"
          : (assetSpecs[assetType].parent?.toUpperCase?.() ??
            assetSpecs[assetType].symbol);

      rows.push({
        symbol,
        price: Number(price),
        iconUrl: assetSpecs[assetType].img,
        assetType,
        baseAmount, // 👈 keep raw
      });
    }

    // keep consistent order
    const order = [ASSETS.X_MYST, ASSETS.X_OCTA, ASSETS.X_DROP, ASSETS.X_POLL];
    rows.sort((a, b) => {
      const ai = order.findIndex(
        (t) =>
          (a.symbol === "XPOLL" && t === ASSETS.X_POLL) ||
          (a.symbol !== "XPOLL" &&
            `${assetSpecs[t].parent?.toUpperCase()}` === a.symbol),
      );
      const bi = order.findIndex(
        (t) =>
          (b.symbol === "XPOLL" && t === ASSETS.X_POLL) ||
          (b.symbol !== "XPOLL" &&
            `X${assetSpecs[t].parent.toUpperCase()}` === b.symbol),
      );
      return ai - bi;
    });

    // first-time signup: show only xPoll
    if (showOnlyXPoll) {
      return rows.filter((r) => r.assetType === ASSETS.X_POLL);
    }
    return rows;
  }, [me, showOnlyXPoll]);

  // 🔹 initialize selection once; for first-time signup force only XPOLL
  useEffect(() => {
    if (coins.length === 0) return;
    if (showOnlyXPoll) {
      setSelected(["XPOLL"]);
      return;
    }
    if (selectedSymbols.length === 0) {
      setSelected(coins.slice(0, MAX).map((c) => c.symbol));
    }
  }, [showOnlyXPoll, coins.length, selectedSymbols.length, setSelected]);

  const selected = useMemo(
    () => coins.filter((c) => selectedSymbols.includes(c.symbol)).slice(0, MAX),
    [coins, selectedSymbols],
  );
  const canPickMore = selectedSymbols.length < MAX;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>

        <div className="relative">
          <button
            onClick={() => setOpen((s) => !s)}
            className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/5"
            aria-expanded={open}
          >
            Select
            <ChevronDown className="h-4 w-4" />
          </button>

          {open && (
            <div
              className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-black/10 bg-white shadow-lg"
              role="menu"
            >
              <div className="px-3 py-2 text-xs text-black/60">
                Choose up to {MAX} coins
              </div>
              <div className="max-h-64 overflow-auto py-1">
                {coins.map((c) => {
                  const checked = selectedSymbols.includes(c.symbol);
                  const disabled = !checked && !canPickMore;
                  return (
                    <label
                      key={c.symbol}
                      className={[
                        "flex cursor-pointer select-none items-center gap-3 px-3 py-2 text-sm",
                        disabled ? "opacity-50" : "hover:bg-black/5",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-black cursor-pointer"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(c.symbol, MAX)}
                      />
                      {c.iconUrl ? (
                        <img
                          src={c.iconUrl}
                          alt={c.symbol}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-black/10" />
                      )}
                      <span className="font-medium">{c.symbol}</span>
                    </label>
                  );
                })}
              </div>

              <div className="border-t border-black/10 px-3 py-2 text-right">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-blue px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="mt-6 grid gap-6 grid-cols-4">
          {isLoading ? (
            <div className="col-span-4 text-center text-sm text-black/50">
              Loading coins...
            </div>
          ) : (
            selected.map((c) => (
              <div key={c.symbol} className="text-center">
                <div className="mx-auto mb-3 h-14 w-14 grid place-items-center overflow-hidden">
                  {c.iconUrl ? (
                    <img
                      src={c.iconUrl}
                      alt={c.symbol}
                      className="h-12 w-12 object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-black/10" />
                  )}
                </div>

                <div className="text-[0.6rem] md:text-sm xl:text-sm tracking-wide text-black/80 font-semibold">
                  {c.symbol}
                </div>

                <div className="mt-1 text-sm font-semibold">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="cursor-help outline-none"
                        onClick={(e) =>
                          (e.currentTarget as HTMLButtonElement).focus()
                        }
                      >
                        <span className="text-black">
                          {shortenAmount(c.baseAmount, c.assetType, 7)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm">
                      {unwrapString(
                        amount({
                          op: "toParent",
                          assetId: c.assetType,
                          value: c.baseAmount,
                          output: "string",
                          trim: true,
                          group: true,
                        }),
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
