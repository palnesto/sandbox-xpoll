import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  isRealtimeOpenAiError,
  suggestStandaloneTrailContent,
  suggestTrailContent,
  type TrailSuggestionResponse,
} from "@/utils/llm-suggestions";
import { appToast } from "@/utils/toast";

export type TrailSuggestionPatch = Pick<
  TrailSuggestionResponse,
  "trailName" | "description" | "polls"
>;

function formatTrailSuggestionError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)
      ?.message;
    return message?.trim() || error.message || "Failed to generate AI suggestion.";
  }

  if (isRealtimeOpenAiError(error)) {
    if (error.code === "timeout") {
      return "AI suggestion timed out before it finished. Please try again.";
    }
    if (error.code === "status_incomplete") {
      if (error.responseStatus?.reason === "content_filter") {
        return "AI suggestion was interrupted by content filtering. Try making the prompt more neutral or specific.";
      }
      if (error.responseStatus?.reason === "max_output_tokens") {
        return "AI suggestion was cut off before completion. Please try again.";
      }
      return "AI suggestion returned incomplete output. Please try again.";
    }
    if (error.code === "status_failed") {
      return "AI suggestion failed before completion. Please try again.";
    }
    if (error.code === "status_cancelled") {
      return "AI suggestion was interrupted before completion. Please try again.";
    }
    if (error.code === "no_function_call") {
      return "AI returned an unusable response. Please try again.";
    }
    if (error.code === "invalid_function_args") {
      return "AI returned an invalid suggestion payload. Please try again.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Failed to generate AI suggestion.";
}

export function TrailLlmSuggestionBox({
  campaignId,
  isStandalone = false,
  disabled = false,
  onApply,
}: {
  campaignId?: string;
  isStandalone?: boolean;
  disabled?: boolean;
  onApply: (patch: TrailSuggestionPatch) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const rateLimitTimerRef = useRef<number | null>(null);
  const [lastSummary, setLastSummary] = useState<{
    polls: number;
    requested: number | null;
  } | null>(null);
  const promptLength = prompt.trim().length;

  const showRateLimitNotice = (message: string) => {
    setRateLimitNotice(message);
    if (rateLimitTimerRef.current) {
      window.clearTimeout(rateLimitTimerRef.current);
    }
    rateLimitTimerRef.current = window.setTimeout(() => {
      setRateLimitNotice(null);
      rateLimitTimerRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) {
        window.clearTimeout(rateLimitTimerRef.current);
      }
    };
  }, []);

  const canGenerate =
    (isStandalone || !!campaignId) &&
    !disabled &&
    !loading &&
    !rateLimitNotice &&
    promptLength >= 10 &&
    promptLength <= 2000;

  const onGenerate = async () => {
    if (!isStandalone && !campaignId) {
      appToast.error("Campaign ID is missing.");
      return;
    }
    if (!canGenerate) return;

    setLoading(true);
    try {
      const result = isStandalone
        ? await suggestStandaloneTrailContent({
            prompt: prompt.trim(),
          })
        : await suggestTrailContent({
            campaignId: campaignId!,
            prompt: prompt.trim(),
          });

      onApply({
        trailName: result.trailName,
        description: result.description,
        polls: result.polls,
      });

      setLastSummary({
        polls: result.polls.length,
        requested: result.meta.requestedPollCount,
      });
      appToast.success(
        `AI suggestion applied. ${result.polls.length} poll(s) loaded.`,
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const message =
          (
            (error.response.data as { message?: string } | undefined)
              ?.message ??
            "You're generating too quickly. Please wait a few seconds and try again."
          ).trim() ||
          "You're generating too quickly. Please wait a few seconds and try again.";
        showRateLimitNotice(message);
        return;
      }
      appToast.error(formatTrailSuggestionError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#0DACAD33] bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#11303A] inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0DACAD]" />
            AI Trail Suggestion
          </p>
          <p className="text-xs text-black/55">
            Generates and replaces{" "}
            <strong>Trail name, Trail description, and Polls</strong> only.
          </p>
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="rounded-full bg-[#0EA5A5] hover:bg-[#0B9494] text-white px-5"
        >
          {loading ? "Generating..." : "Generate"}
        </Button>
      </div>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the trail you want."
        className="min-h-[96px] resize-y"
        maxLength={2000}
        disabled={disabled || loading}
      />

      <div className="flex items-center justify-between text-xs text-black/55">
        <span>Prompt length: 10-2000</span>
        <span>{promptLength}/2000</span>
      </div>

      {rateLimitNotice ? (
        <div className="rounded-lg border border-[#F0C36D] bg-[#FFF8E8] px-3 py-2 text-xs text-[#805B15]">
          {rateLimitNotice}
        </div>
      ) : null}

      {lastSummary ? (
        <p className="text-xs text-[#315326]">
          Last generated: {lastSummary.polls} poll(s)
          {typeof lastSummary.requested === "number"
            ? ` (requested ${lastSummary.requested})`
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}
