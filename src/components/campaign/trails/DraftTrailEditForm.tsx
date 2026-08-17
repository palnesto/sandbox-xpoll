import type { UseFormReturn } from "react-hook-form";
import type { DraftTrialFormValues } from "@/schema/draft-trial.schema";
import { draftTrialFormZ } from "@/schema/draft-trial.schema";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { getYouTubeThumbnailUrl } from "@/types/petition";
import { Trash2 } from "lucide-react";

export function DraftTrailEditForm({
  form,
}: {
  form: UseFormReturn<DraftTrialFormValues>;
}) {
  const { watch, setValue } = form;
  const resourceAssets = watch("resourceAssets") ?? [];
  const rewards = watch("rewards") ?? [];
  const polls = watch("polls") ?? [];

  const addAsset = (type: "youtube" | "image" | "video") => {
    setValue("resourceAssets", [...resourceAssets, { type, value: "" }], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeAsset = (index: number) => {
    setValue(
      "resourceAssets",
      resourceAssets.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const setAssetValue = (index: number, value: string) => {
    const next = [...resourceAssets];
    if (next[index]) next[index] = { ...next[index], value };
    setValue("resourceAssets", next, { shouldDirty: true, shouldValidate: true });
  };

  const addReward = () => {
    if (rewards.length >= 1) return;
    setValue("rewards", [{ assetId: "", amount: 0, rewardAmountCap: 0, rewardType: "min" }], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeReward = (index: number) => {
    setValue(
      "rewards",
      rewards.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const addPoll = () => {
    if (polls.length >= 50) return;
    setValue("polls", [...polls, { title: "", description: "", options: [], resourceAssets: [], rewards: [] }], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removePoll = (index: number) => {
    setValue(
      "polls",
      polls.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <div className="mt-6 space-y-6 max-w-2xl">
      <TextField<DraftTrialFormValues>
        form={form}
        schema={draftTrialFormZ}
        name="title"
        label="Title"
        placeholder="Draft trail title"
        showCounter
        showError
      />
      <TextAreaField<DraftTrialFormValues>
        form={form}
        schema={draftTrialFormZ}
        name="description"
        label="Description"
        placeholder="Description (1–2000 chars)"
        rows={4}
        showCounter
        showError
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Trail media (max 20)</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => addAsset("image")} className="text-xs rounded-full bg-[#E4F2DF] px-2 py-1 text-[#315326]">
              + Image URL
            </button>
            <button type="button" onClick={() => addAsset("video")} className="text-xs rounded-full bg-[#E4F2DF] px-2 py-1 text-[#315326]">
              + Video URL
            </button>
            <button type="button" onClick={() => addAsset("youtube")} className="text-xs rounded-full bg-[#E4F2DF] px-2 py-1 text-[#315326]">
              + YouTube ID
            </button>
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-white border border-black/10 p-3">
          {resourceAssets.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-[#7A7A7A] w-16 capitalize">{a.type}</span>
              <input
                value={a.value}
                onChange={(e) => setAssetValue(i, e.target.value)}
                placeholder={a.type === "youtube" ? "11-char video ID" : "URL"}
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              {a.type === "image" && a.value && (
                <img src={a.value} alt="" className="h-10 w-10 rounded object-cover" />
              )}
              {a.type === "youtube" && a.value && getYouTubeThumbnailUrl(a.value) && (
                <img src={getYouTubeThumbnailUrl(a.value)!} alt="" className="h-10 w-10 rounded object-cover" />
              )}
              <button type="button" onClick={() => removeAsset(i)} className="p-1 text-red-500" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {resourceAssets.length === 0 && (
            <p className="text-xs text-[#8A8A8A]">Add at least one media (image, video, or YouTube).</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Rewards (max 1)</label>
          {rewards.length < 1 && (
            <button type="button" onClick={addReward} className="text-xs rounded-full bg-[#E4F2DF] px-2 py-1 text-[#315326]">
              + Add reward
            </button>
          )}
        </div>
        {rewards.map((_, i) => (
          <div key={i} className="rounded-xl bg-white border border-black/10 p-4 space-y-2 mb-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={rewards[i]?.assetId ?? ""}
                onChange={(e) => {
                  const next = [...rewards];
                  if (next[i]) next[i] = { ...next[i], assetId: e.target.value };
                  setValue("rewards", next, { shouldDirty: true });
                }}
                placeholder="Asset ID (coin)"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <select
                value={rewards[i]?.rewardType ?? "min"}
                onChange={(e) => {
                  const next = [...rewards];
                  if (next[i]) next[i] = { ...next[i], rewardType: e.target.value as "min" | "max" };
                  setValue("rewards", next, { shouldDirty: true });
                }}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm"
              >
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[#7A7A7A]">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={rewards[i]?.amount ?? ""}
                  onChange={(e) => {
                    const next = [...rewards];
                    const v = e.target.value;
                    if (next[i]) next[i] = { ...next[i], amount: v === "" ? 0 : Number(v) };
                    setValue("rewards", next, { shouldDirty: true });
                  }}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[#7A7A7A]">Cap</label>
                <input
                  type="number"
                  min={0}
                  value={rewards[i]?.rewardAmountCap ?? ""}
                  onChange={(e) => {
                    const next = [...rewards];
                    const v = e.target.value;
                    if (next[i]) next[i] = { ...next[i], rewardAmountCap: v === "" ? 0 : Number(v) };
                    setValue("rewards", next, { shouldDirty: true });
                  }}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button type="button" onClick={() => removeReward(i)} className="text-red-500 text-xs">Remove reward</button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Polls (max 50)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A7A7A]">{polls.length}/50</span>
            <button type="button" onClick={addPoll} disabled={polls.length >= 50} className="text-xs rounded-full bg-[#E4F2DF] px-2 py-1 text-[#315326] disabled:opacity-50">
              + Add poll
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {polls.map((p, pi) => (
            <div key={pi} className="rounded-xl bg-white border border-black/10 p-4 space-y-2">
              <input
                value={p.title ?? ""}
                onChange={(e) => {
                  const next = [...polls];
                  if (next[pi]) next[pi] = { ...next[pi], title: e.target.value };
                  setValue("polls", next, { shouldDirty: true });
                }}
                placeholder="Poll title"
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <textarea
                value={p.description ?? ""}
                onChange={(e) => {
                  const next = [...polls];
                  if (next[pi]) next[pi] = { ...next[pi], description: e.target.value };
                  setValue("polls", next, { shouldDirty: true });
                }}
                placeholder="Poll description"
                rows={2}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <div className="text-xs text-[#7A7A7A]">Options (2-4, 1-25 chars each)</div>
              {(p.options ?? []).concat("").slice(0, 4).map((opt, oi) => {
                const val = String(opt ?? "").trim();
                const optErr = val.length > 25 ? "Max 25 characters" : null;
                return (
                  <div key={oi}>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...polls];
                        const opts = [...(next[pi]?.options ?? [])];
                        opts[oi] = e.target.value;
                        if (next[pi]) next[pi] = { ...next[pi], options: opts.filter(Boolean) };
                        setValue("polls", next, { shouldDirty: true });
                      }}
                      placeholder={`Option ${oi + 1}`}
                      className="w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                    />
                    {optErr ? <p className="text-[11px] text-red-600 mt-0.5">{optErr}</p> : null}
                  </div>
                );
              })}
              <button type="button" onClick={() => removePoll(pi)} className="text-red-500 text-xs">Remove poll</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
