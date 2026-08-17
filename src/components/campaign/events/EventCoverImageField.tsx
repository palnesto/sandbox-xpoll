import { useRef, useState } from "react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { appToast } from "@/utils/toast";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";

import tmpl1 from "@/assets/campaigns/e1.jpeg";
import tmpl2 from "@/assets/campaigns/e2.jpeg";
import tmpl3 from "@/assets/campaigns/e3.jpeg";

export const EVENT_COVER_TEMPLATES: { id: string; url: string; label: string }[] = [
  { id: "tmpl-1", url: tmpl1, label: "Add info" },
  { id: "tmpl-2", url: tmpl2, label: "Trails" },
  { id: "tmpl-3", url: tmpl3, label: "Blogs" },
];

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
  /** Max file size in MB (default 5) */
  maxSizeMB?: number;
};

const ACCEPTED_TYPES = "image/png, image/jpeg, image/webp, image/gif";

export function EventCoverImageField({
  value,
  onChange,
  maxSizeMB = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { uploadImage, loading } = useImageUpload();

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      appToast.error("Please upload an image file");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      appToast.error(`Image must be under ${maxSizeMB}MB`);
      return;
    }
    try {
      const url = await uploadImage(file);
      if (url) onChange(url);
    } catch (e: any) {
      appToast.error(e?.message || "Upload failed");
    }
  };

  /**
   * Templates are bundled Vite assets — their URLs are relative paths that
   * the backend will reject. Fetch the asset, wrap it as a File, and run it
   * through the same upload pipeline as a user-picked file so we always
   * persist an absolute DO Spaces URL.
   */
  const pickTemplate = async (templateUrl: string, label: string) => {
    try {
      const res = await fetch(templateUrl);
      if (!res.ok) throw new Error("Could not load template");
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("+xml", "");
      const file = new File(
        [blob],
        `event-template-${label.toLowerCase().replace(/\s+/g, "-")}.${ext}`,
        { type: blob.type || "image/png" },
      );
      await handleFile(file);
    } catch (e: any) {
      appToast.error(e?.message || "Could not use template");
    }
  };

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        Cover image <span className="text-red-600">*</span>
      </label>

      {value ? (
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden border border-black/10 aspect-[16/9] bg-black/5">
            <img
              src={value}
              alt="Event cover"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Always-visible action buttons below the preview */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPickFile}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E8FBFB] text-[#0c7777] px-3 py-1.5 text-xs font-semibold hover:bg-[#CFEDED] disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              {loading ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={onPickFile}
          className={cn(
            "rounded-2xl border-2 border-dashed aspect-[16/9] flex flex-col items-center justify-center text-center cursor-pointer transition",
            dragOver
              ? "border-[#0EA5A5] bg-[#E8FBFB]"
              : "border-gray-200 bg-[#FAFAFA] hover:bg-black/[0.02]",
            loading && "opacity-60 cursor-wait",
          )}
        >
          <div className="rounded-full bg-white border border-black/10 p-3 mb-3">
            <ImageIcon className="w-5 h-5 text-black/60" />
          </div>
          <div className="text-sm font-semibold text-black/80">
            {loading ? "Uploading…" : "Drop an image or click to upload"}
          </div>
          <div className="mt-1 text-xs text-black/50">
            PNG, JPG, WEBP or GIF · up to {maxSizeMB}MB
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={onFileChange}
      />

      {/* Templates */}
      <div>
        <div className="text-xs text-black/50 mb-2">
          Or pick a quick template:
        </div>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_COVER_TEMPLATES.map((t) => {
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t.url, t.label)}
                disabled={loading}
                className={cn(
                  "relative rounded-xl overflow-hidden aspect-[16/9] border-2 border-transparent hover:border-[#CFEDED] transition disabled:opacity-60 disabled:cursor-wait",
                )}
                aria-label={`Use ${t.label} template`}
                title={t.label}
              >
                <img
                  src={t.url}
                  alt={t.label}
                  className="w-full h-full object-cover"
                />
                {/* <span className="absolute bottom-1 left-1 right-1 text-[10px] font-semibold text-white drop-shadow bg-black/30 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                  {t.label}
                </span> */}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
