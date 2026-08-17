import { useRef, useState } from "react";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EXCEL_ACCEPT,
  isExcelFile,
  parseTrialExcelFormPatch,
  MAX_TRIAL_EXCEL_POLLS,
  type TrialExcelFormPatch,
} from "@/utils/excel-upload";
import { appToast } from "@/utils/toast";
import { cn } from "@/lib/utils";

import trailTemplateUrl from "@/assets/trail.xlsx?url";

const COLUMN_LABELS =
  "Trial Name | Trial Description | Poll Title | Poll Description | Poll Option 1 | Poll Option 2 | Poll Option 3 | Poll Option 4";

export function UploadExcelModal({
  open,
  onOpenChange,
  onPatch,
  disabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (patch: TrialExcelFormPatch) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChooseFile = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isExcelFile(file)) {
      appToast.error("Please select an Excel file (.xlsx or .xls).");
      return;
    }
    setSelectedFile(file);
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement("a");
    a.href = trailTemplateUrl;
    a.download = "trail.xlsx";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      appToast.error("Please choose an Excel file first.");
      return;
    }
    setUploading(true);
    try {
      const patch = await parseTrialExcelFormPatch(selectedFile);
      onPatch(patch);
      appToast.success(`Excel imported: ${patch.polls.length} poll(s) replaced.`);
      onOpenChange(false);
      setSelectedFile(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to parse Excel file.";
      const isInvalidHeader =
        typeof message === "string" &&
        message.includes("Invalid Excel headers");
      appToast.error(
        isInvalidHeader
          ? "Follow the exact format as given in sample template. Download the sample template and try again."
          : message,
      );
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedFile(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[750px] 2xl:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-semibold tracking-wide">
            UPLOAD EXCEL
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-[#555]">
          Upload a .xlsx or .xls file using the exact XPOLL column format.
        </p>
        <div className="rounded-lg bg-[#F0F0F0] border border-[#E0E0E0] px-3 py-2 text-xs text-[#333] font-medium">
            {COLUMN_LABELS}
          </div>
        <div className="flex flex-wrap justify-between items-center gap-2 text-[#666] text-xs">
          <span>Poll Option 1 & 2 are mandatory</span>
          <p>Required Columns (Exact Order)</p>
        </div>

       

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[#222]">
            FIELD LIMITS & VALIDATION RULES
          </h4>
          <p className="text-xs text-[#555]">
            Follow these constraints to avoid upload errors:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-[#333] mb-1">Trial Level</p>
              <ul className="list-disc list-inside text-[#555] space-y-0.5">
                <li>Trial Name: 3-30 characters</li>
                <li>Trial Description: 3-350 characters</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[#333] mb-1">Poll Level</p>
              <ul className="list-disc list-inside text-[#555] space-y-0.5">
                <li>Poll Title: 3-25 characters</li>
                <li>Poll Description: 3-350 characters</li>
                <li>Poll Options: 2-4 required</li>
                <li>Each Option Text: Maximum 25 characters</li>
                <li>Max {MAX_TRIAL_EXCEL_POLLS} polls per upload</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#333]">Add Excel</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-full border border-[#0DACAD] bg-[#E8F7F7] text-[#0DACAD] px-4 py-2 text-sm font-semibold hover:bg-[#D4EFEF] transition-colors"
            >
              Download Sample Template
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={EXCEL_ACCEPT}
            onChange={onFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleChooseFile}
            disabled={disabled || uploading}
            className={cn(
              "w-full rounded-xl border-2 border-dashed border-[#D0D0D0] bg-[#F8F8F8] py-8 flex flex-col items-center justify-center gap-2 hover:border-[#0DACAD] hover:bg-[#F0FAFA] transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-[#D0D0D0] disabled:hover:bg-[#F8F8F8]",
            )}
          >
            <FileSpreadsheet className="h-10 w-10 text-[#0DACAD]" />
            <span className="text-sm font-medium text-[#555]">
              {selectedFile ? selectedFile.name : "+ Choose Excel File"}
            </span>
          </button>
        </div>

        <div className="flex items-start justify-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p>Uploading will replace existing Trial Name, Description & Polls.</p>
            <p>Rewards and trial media will remain unchanged.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || disabled || uploading}
          className="w-full rounded-full bg-[#0EA5A5] text-white py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "UPLOADING..." : "Upload"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
