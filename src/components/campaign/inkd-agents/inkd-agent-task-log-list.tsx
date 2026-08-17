import { AlertCircle, CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import type { CampaignInkDAgentActivityLog } from "./model";

function getStateTone(state: CampaignInkDAgentActivityLog["state"]) {
  if (state === "completed") return "bg-[#E8FBFB] text-[#0B7272]";
  if (state === "failed") return "bg-[#FEF2F2] text-[#B91C1C]";
  if (state === "running") return "bg-[#EEF2FF] text-[#4338CA]";
  if (state === "cancelled") return "bg-[#F4F4F5] text-[#52525B]";
  return "bg-[#FFF7ED] text-[#9A3412]";
}

function getStateIcon(state: CampaignInkDAgentActivityLog["state"]) {
  if (state === "completed") return CheckCircle2;
  if (state === "failed") return XCircle;
  if (state === "running") return RefreshCw;
  if (state === "cancelled") return AlertCircle;
  return Clock3;
}

function formatLogDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function InkDAgentTaskLogList(props: {
  campaignId: string;
  isLoading: boolean;
  isError: boolean;
  logs: CampaignInkDAgentActivityLog[];
  onRetry: () => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[28px] border border-[#D9E4EC] bg-white p-6 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0EA5A5]">
          Recent activity
        </p>
      </div>

      {props.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[22px] bg-[#EEF3F7]"
            />
          ))}
        </div>
      ) : props.isError ? (
        <div className="mt-6 rounded-[24px] border border-[#FECACA] bg-[#FFF7F7] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[#B91C1C]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#7F1D1D]">
                Couldn’t load recent task logs
              </p>
              <p className="mt-1 text-sm text-[#991B1B]">
                The latest activity couldn’t be fetched right now. Try again.
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="mt-4 rounded-full bg-[#B91C1C] px-5 text-white hover:bg-[#a11111]"
            onClick={props.onRetry}
          >
            Try again
          </Button>
        </div>
      ) : props.logs.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-[#C9D7E3] bg-[#FBFDFE] px-5 py-10 text-center text-sm text-[#64748B]">
          No recent task logs
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {props.logs.map((log) => {
            const StateIcon = getStateIcon(log.state);
            const failureMessage = log.metadata.failure.lastMessage?.trim();
            const createdCampaignBlogId =
              log.metadata.success.data?.createdCampaignBlogIds?.[0] ?? null;

            return (
              <article
                key={log._id}
                className="rounded-[24px] border border-[#E6EDF3] bg-[#FBFDFE] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-[#0EA5A5] shadow-sm">
                      <StateIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getStateTone(log.state)}`}
                        >
                          {log.state}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B] shadow-sm">
                          {log.triggerSource}
                        </span>
                        {log.creatorType === "campaign_user" ? (
                          <span className="rounded-full bg-[#E8FBFB] px-3 py-1 text-[11px] font-semibold text-[#0B7272] shadow-sm">
                            Campaign-owned
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#4338CA] shadow-sm">
                            Admin-connected
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm font-medium text-[#132238]">
                        {log.inkdAgentName ? `Agent: ${log.inkdAgentName}` : "Agent activity"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#132238]">
                        Scheduled for {formatLogDate(log.scheduledForUtc)}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Mode: {log.generationModeSnapshot.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      Attempts
                    </p>
                    <p className="mt-1 text-base font-medium text-[#132238]">
                      {log.attemptCount}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-[#5B7083] md:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      Updated
                    </p>
                    <p className="mt-1 font-medium text-[#132238]">
                      {formatLogDate(log.updatedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      Failed attempts
                    </p>
                    <p className="mt-1 font-medium text-[#132238]">
                      {log.failedAttempts}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                      Completion
                    </p>
                    <p className="mt-1 font-medium text-[#132238]">
                      {formatLogDate(log.metadata.success.completedAtUtc)}
                    </p>
                  </div>
                </div>

                {failureMessage ? (
                  <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FFF5F5] px-4 py-3 text-sm text-[#991B1B]">
                    {failureMessage}
                  </div>
                ) : null}

                {log.state === "completed" && createdCampaignBlogId ? (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#CFE8E8] text-[#0B7272] hover:bg-[#E8FBFB]"
                      onClick={() => {
                        navigate(
                          `/campaigns/edit/${props.campaignId}/blog/${createdCampaignBlogId}`,
                        );
                      }}
                    >
                      Open campaign blog
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
