import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { type TrialExcelFormPatch } from "@/utils/excel-upload";
import { UploadExcelModal } from "./UploadExcelModal";

export function TrailExcelPatchButton({
  disabled = false,
  onPatch,
}: {
  disabled?: boolean;
  onPatch: (patch: TrialExcelFormPatch) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={disabled}
        className="rounded-full border border-[#0DACAD] text-[#0DACAD] px-5 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        UPLOAD EXCEL
      </button>
      <UploadExcelModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPatch={onPatch}
        disabled={disabled}
      />
    </>
  );
}
