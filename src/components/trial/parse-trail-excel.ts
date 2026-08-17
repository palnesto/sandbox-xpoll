import {
  MAX_TRIAL_EXCEL_OPTIONS,
  MAX_TRIAL_EXCEL_POLLS,
  parseTrialExcelPayload,
  type TrialExcelPayload,
} from "@/utils/excel-upload";

// Backward-compatible exports for existing POC screen.
export const MAX_POLLS = MAX_TRIAL_EXCEL_POLLS;
export const MAX_OPTIONS = MAX_TRIAL_EXCEL_OPTIONS;
export type TrailUploadPayload = TrialExcelPayload;

export async function parseTrailExcel(file: File): Promise<TrailUploadPayload> {
  return parseTrialExcelPayload(file);
}
