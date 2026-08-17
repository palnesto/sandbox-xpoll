import React from "react";
import { parseTrailExcel, TrailUploadPayload } from "./parse-trail-excel";

export function TrailExcelUpload() {
  const [payload, setPayload] = React.useState<TrailUploadPayload | null>(null);
  const [error, setError] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    setPayload(null);

    if (!file) return;

    const isExcel =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");
    if (!isExcel) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    setLoading(true);
    try {
      const parsed = await parseTrailExcel(file);
      setPayload(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel.");
    } finally {
      setLoading(false);
      // allow re-uploading same file
      e.target.value = "";
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
        Upload Trail Excel
      </label>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onChange}
        disabled={loading}
      />

      {loading && <p style={{ marginTop: 12 }}>Parsing…</p>}

      {error && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            background: "#fee",
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </pre>
      )}

      {payload && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <b>Trial:</b> {payload.trialTitle} <br />
            <b>Polls:</b> {payload.polls.length}
          </div>

          <pre style={{ padding: 12, background: "#f6f6f6", overflow: "auto" }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
