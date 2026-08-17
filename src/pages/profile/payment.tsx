import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PaymentsListSection } from "@/components/profile/payments-list-section";

export default function Payments() {
  const navigate = useNavigate();

  return (
    <main className="px-3 py-7 md:p-6 max-w-5xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-2 border-white border-r-2 border-l-2 rounded-xl bg-[#dbdcdf30]"
        >
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-semibold">Payments</h1>
      </header>

      <PaymentsListSection />
    </main>
  );
}
