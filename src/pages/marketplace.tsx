import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { MarketplaceContentSection } from "@/components/marketplace/marketplace-content-section";
import { PaymentsListSection } from "@/components/profile/payments-list-section";
import { cn } from "@/lib/utils";

const Marketplace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"marketplace" | "payments">(
    "marketplace",
  );
  const [highlightRequest, setHighlightRequest] = useState<{
    paymentId: string;
    key: string | number;
  } | null>(null);

  useEffect(() => {
    const state = (location.state ?? null) as {
      marketplaceTab?: "marketplace" | "payments";
      highlightPaymentId?: string | null;
      highlightRequestKey?: string | number | null;
    } | null;

    if (!state) return;

    let shouldClearState = false;

    if (state.marketplaceTab) {
      setActiveTab(state.marketplaceTab);
      shouldClearState = true;
    }

    if (state.highlightPaymentId) {
      setHighlightRequest({
        paymentId: state.highlightPaymentId,
        key: state.highlightRequestKey ?? Date.now(),
      });
      shouldClearState = true;
    }

    if (shouldClearState) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!highlightRequest) return;

    const timeoutId = window.setTimeout(() => {
      setHighlightRequest(null);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [highlightRequest]);

  return (
    <section className="py-3 px-2 md:py-10 space-y-7 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-3xl font-semibold text-center">
        Marketplace
      </h1>
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-black/10 bg-white/80 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("marketplace")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "marketplace"
                ? "bg-[#132238] text-white"
                : "text-black/55 hover:bg-black/5",
            )}
          >
            Marketplace
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "payments"
                ? "bg-[#132238] text-white"
                : "text-black/55 hover:bg-black/5",
            )}
          >
            Payment history
          </button>
        </div>
      </div>

      {activeTab === "marketplace" ? (
        <MarketplaceContentSection />
      ) : (
        <PaymentsListSection
          highlightPaymentId={highlightRequest?.paymentId ?? null}
          highlightRequestKey={highlightRequest?.key ?? null}
        />
      )}
    </section>
  );
};

export default Marketplace;
