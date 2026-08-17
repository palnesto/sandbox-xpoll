import { useState } from "react";
import { getYouTubeThumbnailUrl } from "@/types/petition";

type ResourceAsset = { type: "image" | "youtube" | "video"; value: string };

export function TrailEditMediaOnlyForm({
  initialResourceAssets,
  onSave,
  saving,
}: {
  initialResourceAssets: ResourceAsset[];
  onSave: (resourceAssets: ResourceAsset[]) => void;
  saving: boolean;
}) {
  const first = initialResourceAssets[0];
  const [type, setType] = useState<"image" | "youtube" | "video">(first?.type ?? "image");
  const [value, setValue] = useState(first?.value ?? "");

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave([{ type, value: trimmed }]);
  };

  return (
    <div className="mt-6 max-w-xl">
      <label className="text-sm font-medium text-[#2B2B2B]">Trail media</label>
      <div className="mt-2 rounded-xl bg-white border border-black/10 p-4 space-y-4">
        <div className="flex gap-2">
          {(["image", "video", "youtube"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
                type === t ? "bg-[#E4F2DF] text-[#315326]" : "bg-[#F0F0F0] text-[#666]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === "youtube" ? "YouTube video ID or URL" : "Media URL"}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        {value.trim() && type === "image" && (
          <img src={value.trim()} alt="" className="h-32 w-full object-contain rounded-lg bg-[#F5F5F5]" />
        )}
        {value.trim() && type === "youtube" && getYouTubeThumbnailUrl(value.trim()) && (
          <img src={getYouTubeThumbnailUrl(value.trim())!} alt="" className="h-32 w-full object-contain rounded-lg bg-[#F5F5F5]" />
        )}
        {value.trim() && type === "video" && (
          <video src={value.trim()} controls className="h-32 w-full rounded-lg bg-[#F5F5F5]" />
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !value.trim()}
        className="mt-4 min-w-[140px] rounded-full bg-[#0EA5A5] text-white px-6 py-3 font-semibold text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save media"}
      </button>
    </div>
  );
}
