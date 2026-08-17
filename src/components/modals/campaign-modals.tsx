import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ActiveModal, FormValues } from "@/types/campaigns";
import { cn } from "@/lib/utils";
import dataAccess from "@/assets/campaigns/pop.webp";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

type Props = {
  activeModal: ActiveModal;
  setActiveModal: (m: ActiveModal) => void;
  submittedSnapshot: FormValues | null;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  watch: UseFormWatch<FormValues>;
  agree: boolean;
  selectedPlanName?: string;
  selectedPlanPriceLabel?: string;
  selectedPlanIsBasic?: boolean;
  actionEnabled?: boolean;
  actionLabel?: string;
  actionLoading?: boolean;
  onConfirmAction: () => void | Promise<void>;
};

const overlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const card = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.98 },
};

export default function CampaignModals({
  activeModal,
  setActiveModal,
  submittedSnapshot,
  register,
  errors,
  setValue,
  watch,
  agree,
  selectedPlanName,
  selectedPlanPriceLabel,
  selectedPlanIsBasic = false,
  actionEnabled = true,
  actionLabel,
  actionLoading = false,
  onConfirmAction,
}: Props) {
  const close = () => {
    setActiveModal(null);
  };

  const isConfirm = activeModal === "confirm";
  const isPolitical = activeModal === "political";
  const isDataAccess = activeModal === "dataAccess";

  const snapshot = useMemo(() => {
    if (submittedSnapshot) return submittedSnapshot;
    return watch();
  }, [submittedSnapshot, watch]);
  const confirmLabel =
    actionLabel ??
    (selectedPlanIsBasic ? "Create campaign" : "Continue to checkout");

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          className="fixed inset-0 z-50"
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={close}
        >
          <motion.div
            variants={overlay}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/80"
          />

          <div className="absolute inset-0 flex items-center justify-center overflow-y-scroll p-4">
            <motion.div
              variants={card}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-lg overflow-y-scroll rounded-2xl bg-white shadow-inner shadow-black"
              onClick={(e) => e.stopPropagation()}
            >
              {isPolitical && (
                <div className="p-7">
                  <h1 className="text-center text-4xl font-semibold text-[#1B1B1B]">
                    Political Campaign
                  </h1>

                  <p className="mt-6 text-center text-xl leading-snug text-[#6B6B6B]">
                    You’re marking this campaign as Political. This may trigger
                    additional checks and policy requirements, and could affect
                    eligibility and visibility.
                  </p>

                  <div className="mt-10 flex gap-6">
                    <button
                      type="button"
                      onClick={() => {
                        setValue("campaignType", "non_political", {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        close();
                      }}
                      className="w-1/2 rounded-full border-2 border-teal-500 bg-teal-50 px-6 py-4 text-lg font-medium text-teal-700"
                    >
                      GO BACK
                    </button>

                    <button
                      type="button"
                      onClick={close}
                      className="w-1/2 rounded-full bg-teal-600 px-6 py-4 text-lg font-semibold text-white"
                    >
                      CONFIRM
                    </button>
                  </div>
                </div>
              )}

              {isDataAccess && (
                <div className="rounded-xl">
                  <figure className="h-80">
                    <img
                      src={dataAccess}
                      alt=""
                      className="h-full w-full object-cover object-bottom"
                    />
                  </figure>

                  <div className="p-5 text-xs">
                    <p className="text-sm">
                      Enabling Get Data Access allows users to purchase access
                      using Campaign Coin, which may affect campaign pricing and
                      data availability.
                    </p>
                    <ul className="my-3 list-disc pl-5 text-black/80">
                      <li>
                        Users are charged Campaign Coin when they select Get
                        Data Access.
                      </li>
                      <li>
                        Purchased Campaign Coin is credited to the campaign.
                      </li>
                      <li>
                        Campaign Coin is a platform digital credit and is not
                        real money or redeemable for cash.
                      </li>
                      <li>
                        You may set a start and end date and enable or disable
                        this option during the campaign.
                      </li>
                      <li>
                        If not enabled during initial setup, this option cannot
                        be added later without repurchasing.
                      </li>
                      <li>
                        By enabling this feature, you acknowledge that Campaign
                        Coin transactions are final and subject to platform
                        terms.
                      </li>
                    </ul>
                    <button
                      type="button"
                      onClick={close}
                      className="w-full rounded-full bg-teal-600 py-3 text-lg font-semibold text-white"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              )}

              {isConfirm && (
                <section className="h-fit max-w-7xl overflow-y-scroll p-7 text-[#646464]">
                  <header>
                    <h1 className="font-semibold text-black">
                      {snapshot?.campaignName || "Campaign"}
                    </h1>
                    <h2 className="text-sm">{snapshot?.goal}</h2>
                  </header>

                  <p className="mt-7 rounded-3xl bg-[#F5F5F5] px-3 py-2 text-center font-medium text-[#5E6366]">
                    Details
                  </p>

                  <section className="grid grid-cols-2 gap-5 py-7">
                    <div>
                      <div>Plan name</div>
                      <div className="text-lg font-medium text-black">
                        {selectedPlanName ?? "-"}
                      </div>
                    </div>
                    <div>
                      <div>Price</div>
                      <div className="text-lg font-medium text-black">
                        {selectedPlanPriceLabel ?? (selectedPlanIsBasic ? "Free" : "-")}
                      </div>
                    </div>
                    <div>
                      <div>Get data Access</div>
                      <div className="text-lg font-medium text-black">
                        {snapshot?.getDataAccess ? "Yes" : "No"}
                      </div>
                    </div>
                    <div>
                      <div>Type of campaign</div>
                      <div className="text-lg font-medium text-black">
                        {snapshot?.campaignType === "political"
                          ? "Political"
                          : "non-Political"}
                      </div>
                    </div>
                  </section>

                  <p className="rounded-3xl bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                    Important Notice:
                  </p>

                  <div className="my-7 flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-600"
                      {...register("agree", {
                        validate: (v: boolean) =>
                          !!v || "You must agree before proceeding",
                      })}
                    />
                    <p className="text-xs">
                      {selectedPlanIsBasic
                        ? "By proceeding, you acknowledge that all campaign information submitted prior to creation is final and cannot be modified here. Campaign features, availability, and access are governed by the selected plan and are subject to the platform’s Terms of Service and applicable policies."
                        : "By proceeding, you acknowledge that all campaign information submitted prior to creation and payment is final and cannot be modified. The campaign creation fee is non-refundable and applies to the creation of one campaign only. Campaign features, availability, and access are governed by the selected plan and are subject to the platform’s Terms of Service and applicable policies."}
                    </p>
                  </div>

                  {errors?.agree ? (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.agree.message}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={!agree || !actionEnabled || actionLoading}
                      onClick={() => {
                        void onConfirmAction();
                      }}
                      className={cn(
                        "w-full rounded-3xl px-4 py-3 text-sm font-semibold",
                        agree && actionEnabled && !actionLoading
                          ? "bg-blue text-white hover:bg-black"
                          : "cursor-not-allowed bg-gray-300 text-gray-500",
                      )}
                    >
                      {actionLoading
                        ? selectedPlanIsBasic
                          ? "Creating campaign..."
                          : "Opening checkout..."
                        : confirmLabel}
                    </button>
                  </div>
                </section>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
