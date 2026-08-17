import * as XLSX from "xlsx";

export const EXCEL_ACCEPT = ".xlsx,.xls";

function normalizeCell(value: unknown): string {
  return String(value ?? "").trim();
}

export function isExcelFile(file: File): boolean {
  const name = String(file?.name ?? "").toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generic Excel reader utility for future upload flows.
 * Reads first sheet and returns normalized rows (array-of-arrays).
 */
export async function readFirstSheetRows(file: File): Promise<string[][]> {
  const buf = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: "array" });

  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in the Excel file.");

  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("Unable to read the first sheet.");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  if (!rows.length) throw new Error("Excel sheet is empty.");

  return rows.map((row) => (row ?? []).map((cell) => normalizeCell(cell)));
}
