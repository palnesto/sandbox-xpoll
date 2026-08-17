import { Bot, CalendarClock, Power } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import type {
  CampaignInkDAgent,
  CampaignInkDAgentActivityLog,
  CampaignInkDAgentListingResult,
} from "./model";
import type { CampaignSocialPublishRateLimits } from "@/types/campaigns";
import { InkDAutoSocialPublishCard } from "./inkd-auto-social-publish-card";
import { InkDAgentTaskLogList } from "./inkd-agent-task-log-list";

function formatAgentSchedule(agent: CampaignInkDAgent | null) {
  if (!agent) return "No schedule is configured yet";
  if (agent.nextSchedule) {
    const nextSchedule = new Date(agent.nextSchedule);
    if (!Number.isNaN(nextSchedule.getTime())) {
      return nextSchedule.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  return "No schedule is configured yet";
}

function hasLiveSchedule(agent: CampaignInkDAgent | null | undefined) {
  return agent?.status === "active" && !!agent?.nextSchedule;
}

function statusTone(status: CampaignInkDAgent["status"]) {
  return status === "active"
    ? "bg-[#E8FBFB] text-[#0B7272]"
    : "bg-[#F4F4F5] text-[#52525B]";
}

function AnimatedAgentBackdrop(props: {
  tone: "teal" | "purple";
}) {
  if (props.tone === "purple") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(36,14,79,0.88)_0%,rgba(56,24,115,0.86)_42%,rgba(28,12,74,0.92)_100%)]" />
        <div className="animate-inkd-flame-a absolute -left-14 top-[-26%] h-52 w-52 rounded-full bg-[#8B5CF6]/30 blur-3xl" />
        <div className="animate-inkd-flame-b absolute right-[-10%] top-[8%] h-48 w-48 rounded-full bg-[#C084FC]/24 blur-3xl" />
        <div className="animate-inkd-flame-glow absolute inset-x-[14%] bottom-[-28%] h-44 rounded-[999px] bg-[radial-gradient(circle_at_center,_rgba(192,132,252,0.30),_transparent_68%)] blur-2xl" />
        <div className="animate-inkd-flame-wave absolute inset-x-[-15%] top-[55%] h-28 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.08)_18%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.08)_82%,transparent_100%)] blur-2xl" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,26,58,0.92)_0%,rgba(12,55,94,0.88)_46%,rgba(10,80,96,0.88)_100%)]" />
      <div className="animate-inkd-flame-a absolute -left-12 top-[-30%] h-52 w-52 rounded-full bg-[#38BDF8]/28 blur-3xl" />
      <div className="animate-inkd-flame-b absolute right-[-8%] top-[10%] h-48 w-48 rounded-full bg-[#2DD4BF]/24 blur-3xl" />
      <div className="animate-inkd-flame-glow absolute inset-x-[10%] bottom-[-28%] h-44 rounded-[999px] bg-[radial-gradient(circle_at_center,_rgba(45,212,191,0.26),_transparent_68%)] blur-2xl" />
      <div className="animate-inkd-flame-wave absolute inset-x-[-15%] top-[54%] h-28 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.08)_18%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.08)_82%,transparent_100%)] blur-2xl" />
    </div>
  );
}

function AnimatedBorderBeam(props: {
  tone: "teal" | "purple";
}) {
  const primaryGradient =
    props.tone === "purple"
      ? "conic-gradient(from 118deg, transparent 0deg, transparent 284deg, rgba(236,72,153,0.08) 297deg, rgba(216,180,254,0.68) 314deg, rgba(255,255,255,0.98) 326deg, rgba(196,181,253,1) 335deg, rgba(168,85,247,0.94) 344deg, rgba(236,72,153,0.36) 351deg, transparent 360deg)"
      : "conic-gradient(from 112deg, transparent 0deg, transparent 286deg, rgba(45,212,191,0.08) 299deg, rgba(103,232,249,0.7) 316deg, rgba(255,255,255,0.98) 327deg, rgba(125,211,252,1) 336deg, rgba(45,212,191,0.92) 345deg, rgba(45,212,191,0.32) 352deg, transparent 360deg)";
  const secondaryGradient =
    props.tone === "purple"
      ? "conic-gradient(from 286deg, transparent 0deg, transparent 300deg, rgba(255,255,255,0) 315deg, rgba(255,255,255,0.94) 328deg, rgba(244,114,182,0.86) 337deg, rgba(192,132,252,0.72) 346deg, rgba(244,114,182,0.2) 354deg, transparent 360deg)"
      : "conic-gradient(from 300deg, transparent 0deg, transparent 302deg, rgba(255,255,255,0) 316deg, rgba(255,255,255,0.96) 329deg, rgba(94,234,212,0.82) 338deg, rgba(56,189,248,0.68) 347deg, rgba(56,189,248,0.18) 355deg, transparent 360deg)";

  const maskStyle = {
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as const,
    maskComposite: "exclude" as const,
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]">
      <div
        className="animate-inkd-border-beam absolute inset-0 rounded-[inherit] p-[1.4px]"
        style={{
          ...maskStyle,
          background: primaryGradient,
          animationDuration: props.tone === "purple" ? "7.8s" : "6.6s",
        }}
      />
      <div
        className="animate-inkd-border-beam absolute inset-0 rounded-[inherit] p-[1.3px]"
        style={{
          ...maskStyle,
          background: secondaryGradient,
          animationDuration: props.tone === "purple" ? "12.6s" : "10.4s",
          animationDirection: "reverse",
          opacity: 0.88,
        }}
      />
      <div
        className="animate-inkd-border-beam-glow absolute inset-[-2px] rounded-[inherit] p-[2.6px]"
        style={{
          ...maskStyle,
          background: primaryGradient,
          animationDuration: props.tone === "purple" ? "7.8s" : "6.6s",
          filter: "blur(8px)",
          opacity: 0.95,
        }}
      />
      <div
        className="animate-inkd-border-beam-glow absolute inset-[-3px] rounded-[inherit] p-[3px]"
        style={{
          ...maskStyle,
          background: secondaryGradient,
          animationDuration: props.tone === "purple" ? "12.6s" : "10.4s",
          animationDirection: "reverse",
          filter: "blur(12px)",
          opacity: 0.65,
        }}
      />
    </div>
  );
}

export function InkDAgentsLoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 animate-pulse rounded-2xl bg-[#EEF3F7]" />
      <div className="h-40 animate-pulse rounded-[28px] bg-[#EEF3F7]" />
      <div className="h-56 animate-pulse rounded-[28px] bg-[#EEF3F7]" />
      <div className="h-[32rem] animate-pulse rounded-[28px] bg-[#EEF3F7]" />
    </div>
  );
}

function UserOwnedAgentCard(props: {
  agent: CampaignInkDAgent | null;
  canManage: boolean;
  isMainOwner: boolean;
  statusPending: boolean;
  onOpenManageModal: () => void;
  onToggleStatus: () => void;
}) {
  const agent = props.agent;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isLiveScheduled = hasLiveSchedule(agent);

  if (!agent) {
    return (
      <section className="rounded-[28px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#EEF9FB] p-3 text-[#0EA5A5]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0EA5A5]">
                Campaign-owned agent
              </p>
              <h2 className="mt-1.5 text-xl font-medium text-[#132238]">
                No InkD agent yet
              </h2>
            </div>
          </div>

          {props.isMainOwner && props.canManage ? (
            <Button
              type="button"
              className="rounded-full bg-[#0EA5A5] px-6 text-sm text-white hover:bg-[#0c9a9a]"
              onClick={props.onOpenManageModal}
            >
              Create agent
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-[#D9E4EC] bg-white p-5 shadow-sm",
          isLiveScheduled &&
            "border-[#1B4260] bg-[linear-gradient(135deg,#071a33_0%,#0c2d4f_45%,#0b4458_100%)] shadow-[0_18px_40px_rgba(8,35,62,0.28)]",
        )}
      >
        {isLiveScheduled ? <AnimatedBorderBeam tone="teal" /> : null}
        {isLiveScheduled ? <AnimatedAgentBackdrop tone="teal" /> : null}
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "rounded-2xl p-3",
                  isLiveScheduled
                    ? "bg-white/12 text-[#8AF6F2] ring-1 ring-white/10"
                    : "bg-[#EEF9FB] text-[#0EA5A5]",
                )}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.22em]",
                    isLiveScheduled ? "text-[#89F7F3]" : "text-[#0EA5A5]",
                  )}
                >
                  Campaign-owned agent
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <p
                    className={cn(
                      "truncate text-xl font-medium",
                      isLiveScheduled ? "text-white" : "text-[#132238]",
                    )}
                  >
                    {agent.name}
                  </p>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-[11px] font-medium capitalize",
                      isLiveScheduled
                        ? "bg-white/14 text-[#E8FFFE] ring-1 ring-white/12"
                        : statusTone(agent.status),
                    )}
                  >
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "rounded-[22px] px-4 py-3.5",
                isLiveScheduled
                  ? "border border-white/10 bg-white/8 backdrop-blur-sm"
                  : "border border-[#E6EDF3] bg-[#F8FBFD]",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2",
                  isLiveScheduled ? "text-[#89F7F3]" : "text-[#0EA5A5]",
                )}
              >
                <CalendarClock className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Next schedule
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 text-sm font-medium",
                  isLiveScheduled ? "text-white" : "text-[#132238]",
                )}
              >
                {formatAgentSchedule(agent)}
              </p>
            </div>
          </div>

          {props.isMainOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#D9E4EC] text-sm font-medium"
                onClick={props.onOpenManageModal}
                disabled={!props.canManage}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant={agent.status === "active" ? "outline" : "default"}
                className={
                  agent.status === "active"
                    ? "rounded-full border-[#FECACA] text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
                    : "rounded-full bg-[#0EA5A5] text-sm font-medium text-white hover:bg-[#0c9a9a]"
                }
                onClick={() => setConfirmOpen(true)}
                disabled={!props.canManage || props.statusPending}
              >
                <Power className="h-4 w-4" />
                {props.statusPending
                  ? "Updating..."
                  : agent.status === "active"
                    ? "Turn off"
                    : "Turn on"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md rounded-3xl border border-[#D9E4EC] bg-white">
          <AlertDialogHeader className="space-y-3 text-left">
            <AlertDialogTitle className="text-lg font-semibold text-[#132238]">
              {agent.status === "active" ? "Turn off InkD agent?" : "Turn on InkD agent?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[#64748B]">
              {agent.status === "active"
                ? "This will stop the campaign-owned InkD agent from running on future schedules until you turn it back on."
                : "This will allow the campaign-owned InkD agent to run again on its saved schedule."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:justify-end">
            <AlertDialogCancel
              disabled={props.statusPending}
              className="rounded-full border-[#D7DCE2] text-[#1E293B]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={props.statusPending}
              onClick={() => {
                void props.onToggleStatus();
              }}
              className={
                agent.status === "active"
                  ? "rounded-full bg-[#B91C1C] text-white hover:bg-[#a11111]"
                  : "rounded-full bg-[#0EA5A5] text-white hover:bg-[#0c9a9a]"
              }
            >
              {props.statusPending
                ? "Updating..."
                : agent.status === "active"
                  ? "Turn off"
                  : "Turn on"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AdminConnectedAgentsSection(props: {
  agents: CampaignInkDAgent[];
}) {
  if (props.agents.length === 0) return null;

  return (
      <section className="rounded-[28px] border border-[#E7DDFB] bg-[#FCFAFF] p-5 shadow-sm">
        <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#F3EDFF] p-3 text-[#7C3AED]">
          <Bot className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-medium text-[#25163D]">
          Admin-connected agents
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {props.agents.map((agent) => {
          const isLiveScheduled = hasLiveSchedule(agent);

          return (
            <article
              key={agent._id}
              className={cn(
                "relative overflow-hidden flex flex-col gap-4 rounded-[24px] border border-[#E9E0FA] bg-[#F7F3FF] px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between",
                isLiveScheduled &&
                  "border-[#43206F] bg-[linear-gradient(135deg,#190d36_0%,#31115b_48%,#4f1d88_100%)] shadow-[0_18px_36px_rgba(50,16,99,0.28)]",
              )}
            >
              {isLiveScheduled ? <AnimatedBorderBeam tone="purple" /> : null}
              {isLiveScheduled ? <AnimatedAgentBackdrop tone="purple" /> : null}
              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={cn(
                    "rounded-2xl p-3 shadow-sm",
                    isLiveScheduled
                      ? "bg-white/12 text-[#E9D5FF] ring-1 ring-white/10"
                      : "bg-white text-[#7C3AED]",
                  )}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <p
                  className={cn(
                    "text-base font-medium",
                    isLiveScheduled ? "text-white" : "text-[#25163D]",
                  )}
                >
                  {agent.name}
                </p>
              </div>

              <div
                className={cn(
                  "relative z-10 rounded-2xl px-4 py-3 shadow-sm",
                  isLiveScheduled
                    ? "bg-white/10 ring-1 ring-white/10 backdrop-blur-sm"
                    : "bg-white",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.18em]",
                    isLiveScheduled ? "text-[#E9D5FF]" : "text-[#9A8AC7]",
                  )}
                >
                  Next schedule
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    isLiveScheduled ? "text-white" : "text-[#25163D]",
                  )}
                >
                  {formatAgentSchedule(agent)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function InkDAgentsReadShell(props: {
  campaignId: string;
  listing: CampaignInkDAgentListingResult;
  isMainOwner: boolean;
  autoSocialManageDisabledReason: string | null;
  publishRateLimits: CampaignSocialPublishRateLimits | null;
  adminConnectedAgents: CampaignInkDAgent[];
  activityLogs: CampaignInkDAgentActivityLog[];
  activityLogsLoading: boolean;
  activityLogsError: boolean;
  userOwnedStatusPending: boolean;
  onRetryActivity: () => void;
  onOpenAutoSocialModal: () => void;
  onOpenManageModal: () => void;
  onToggleUserOwnedAgentStatus: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f766e]">
          InkD Agents
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111]">
          Campaign agents
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#6E6E6E]">
          Manage your campaign-owned InkD agent, review active admin-connected
          agents, and watch recent campaign activity in one place.
        </p>
      </section>

      <InkDAutoSocialPublishCard
        config={props.listing.inkdAutoSocialPublish}
        disabledReason={props.autoSocialManageDisabledReason}
        publishRateLimits={props.publishRateLimits}
        onOpenModal={props.onOpenAutoSocialModal}
      />

      <UserOwnedAgentCard
        agent={props.listing.userOwnedAgent}
        canManage={props.listing.canManageUserOwnedAgent}
        isMainOwner={props.isMainOwner}
        statusPending={props.userOwnedStatusPending}
        onOpenManageModal={props.onOpenManageModal}
        onToggleStatus={props.onToggleUserOwnedAgentStatus}
      />

      <AdminConnectedAgentsSection agents={props.adminConnectedAgents} />

      <InkDAgentTaskLogList
        campaignId={props.campaignId}
        isLoading={props.activityLogsLoading}
        isError={props.activityLogsError}
        logs={props.activityLogs}
        onRetry={props.onRetryActivity}
      />
    </div>
  );
}
