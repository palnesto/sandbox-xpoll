import * as XLSX from "xlsx";
import { readFirstSheetRows } from "./core";

const REQUIRED_HEADERS = [
  "Trial Name",
  "Trial Description",
  "Poll Title",
  "Poll Description",
  "Poll Option 1",
  "Poll Option 2",
  "Poll Option 3",
  "Poll Option 4",
] as const;

export const MAX_TRIAL_EXCEL_POLLS = 50 as const;
export const MAX_TRIAL_EXCEL_OPTIONS = 4 as const;

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

export type TrialExcelPayload = {
  trialTitle: string;
  trialDescription: string;
  polls: Array<{
    title: string;
    description: string;
    options: string[];
  }>;
};

export type TrialExcelFormPatch = {
  trailName: string;
  description: string;
  polls: Array<{
    pollName: string;
    pollDescription: string;
    options: string[];
  }>;
};

function ensureStrictHeaders(actualHeaders: string[]) {
  const expected = [...REQUIRED_HEADERS];
  const first = actualHeaders.slice(0, expected.length);

  const exact =
    first.length === expected.length &&
    first.every((header, idx) => header === expected[idx]);

  if (!exact) {
    throw new Error(
      `Invalid Excel headers.\nExpected exactly:\n${expected.join(
        " | ",
      )}\n\nGot:\n${actualHeaders.join(" | ")}`,
    );
  }
}

export async function parseTrialExcelPayload(
  file: File,
): Promise<TrialExcelPayload> {
  const rows = await readFirstSheetRows(file);
  const headerRow = rows[0] ?? [];
  ensureStrictHeaders(headerRow);

  const colIndex: Record<RequiredHeader, number> = Object.fromEntries(
    REQUIRED_HEADERS.map((h, i) => [h, i]),
  ) as Record<RequiredHeader, number>;

  let trialTitle = "";
  let trialDescription = "";
  const polls: TrialExcelPayload["polls"] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const tName = String(row[colIndex["Trial Name"]] ?? "").trim();
    const tDesc = String(row[colIndex["Trial Description"]] ?? "").trim();
    if (!trialTitle && tName) trialTitle = tName;
    if (!trialDescription && tDesc) trialDescription = tDesc;

    const pollTitle = String(row[colIndex["Poll Title"]] ?? "").trim();
    const pollDescription = String(
      row[colIndex["Poll Description"]] ?? "",
    ).trim();

    if (!pollTitle) continue;

    const options = [
      String(row[colIndex["Poll Option 1"]] ?? "").trim(),
      String(row[colIndex["Poll Option 2"]] ?? "").trim(),
      String(row[colIndex["Poll Option 3"]] ?? "").trim(),
      String(row[colIndex["Poll Option 4"]] ?? "").trim(),
    ]
      .filter(Boolean)
      .slice(0, MAX_TRIAL_EXCEL_OPTIONS);

    if (options.length < 2) {
      throw new Error(
        `Poll "${pollTitle}" must have at least 2 options (found ${options.length}). Row: ${
          r + 1
        }`,
      );
    }

    polls.push({
      title: pollTitle,
      description: pollDescription,
      options,
    });

    if (polls.length >= MAX_TRIAL_EXCEL_POLLS) break;
  }

  if (!trialTitle) {
    throw new Error(`"Trial Name" is missing (expected in the first poll row).`);
  }
  if (!trialDescription) {
    throw new Error(
      `"Trial Description" is missing (expected in the first poll row).`,
    );
  }
  if (!polls.length) {
    throw new Error("No polls found. Make sure 'Poll Title' is filled.");
  }

  return {
    trialTitle,
    trialDescription,
    polls,
  };
}

export async function parseTrialExcelFormPatch(
  file: File,
): Promise<TrialExcelFormPatch> {
  const payload = await parseTrialExcelPayload(file);
  return {
    trailName: payload.trialTitle,
    description: payload.trialDescription,
    polls: payload.polls.map((poll) => ({
      pollName: poll.title,
      pollDescription: poll.description,
      options: poll.options,
    })),
  };
}

const TEMPLATE_FILENAME = "trial-excel-template.xlsx";

export function downloadTrialExcelTemplate(): void {
  const headers = [...REQUIRED_HEADERS];
  const exampleRow = [
    "Sample Trial",
    "Sample trial description (3-350 characters).",
    "Sample Poll",
    "Sample poll description (3-350 characters).",
    "Option A",
    "Option B",
    "Option C",
    "",
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, TEMPLATE_FILENAME);
}
