import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { NumberField } from "@/components/commons/form/NumberField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { TextField } from "@/components/commons/form/TextField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { appToast } from "@/utils/toast";

import type { CampaignInkDAgent } from "./model";
import {
  formatWeekdayLabel,
  INKD_AGENT_WEEKDAYS,
  localScheduleRuleToUtc,
  type InkDAgentWeekday,
  utcScheduleRuleToLocal,
} from "./schedule";
import {
  inkdAgentManageFormSchema,
  INKD_AGENT_BLOG_LENGTH_MAX,
  INKD_AGENT_BLOG_LENGTH_MIN,
  INKD_AGENT_PRIORITY_SOURCE_MAX,
  type InkdAgentManageFormValues,
} from "./manage-schema";

const STEP_IDS = ["foundational", "brand", "settings", "priority"] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_META: Record<
  StepId,
  {
    label: string;
    title: string;
  }
> = {
  foundational: {
    label: "Foundational Info",
    title: "Set the AI signal identity",
  },
  brand: {
    label: "Brand Language",
    title: "Define how the AI should sound",
  },
  settings: {
    label: "Settings",
    title: "Adjust blog length and schedule",
  },
  priority: {
    label: "Priority Scraping",
    title: "Add up to 3 priority URLs",
  },
};

const INPUT_CLASS =
  "rounded-2xl border border-[#DDE2E5] bg-white px-4 py-3 text-sm text-[#111] shadow-sm placeholder:text-[#9aa4b2] focus-visible:ring-[#0EA5A5]";
const CHIP_CLASS =
  "rounded-full border px-3 py-1.5 text-xs font-medium transition";

function readMutationError(error: any) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

function buildDefaultValues(agent: CampaignInkDAgent | null): InkdAgentManageFormValues {
  const localSchedule = agent?.scheduleRules?.[0]
    ? utcScheduleRuleToLocal({
        weekdays: (agent.scheduleRules[0].weekdays ?? []) as InkDAgentWeekday[],
        timeUtc: agent.scheduleRules[0].timeUtc ?? "",
      })
    : { weekdays: [], timeLocal: "" };

  return {
    name: agent?.name ?? "",
    foundationalInformation: agent?.foundationalInformation ?? "",
    brandLanguage: agent?.brandLanguage ?? "",
    maxBlogDescriptionLength: agent?.maxBlogDescriptionLength ?? INKD_AGENT_BLOG_LENGTH_MIN,
    prioritySources: agent?.prioritySources?.slice(0, INKD_AGENT_PRIORITY_SOURCE_MAX) ?? [],
    scheduleEnabled: !!agent?.scheduleRules?.length,
    scheduleWeekdays: localSchedule.weekdays,
    scheduleTimeLocal: localSchedule.timeLocal,
  };
}

function getStepValidationFields(
  stepId: StepId,
  values: InkdAgentManageFormValues,
): Array<keyof InkdAgentManageFormValues> {
  if (stepId === "foundational") {
    return ["name", "foundationalInformation"];
  }

  if (stepId === "brand") {
    return ["brandLanguage"];
  }

  if (stepId === "settings") {
    return values.scheduleEnabled
      ? ["maxBlogDescriptionLength", "scheduleEnabled", "scheduleWeekdays", "scheduleTimeLocal"]
      : ["maxBlogDescriptionLength", "scheduleEnabled"];
  }

  return ["prioritySources"];
}

export function InkDAgentManageModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  agent: CampaignInkDAgent | null;
  canManage: boolean;
}) {
  const [activeStepId, setActiveStepId] = useState<StepId>("foundational");

  const form = useForm<InkdAgentManageFormValues>({
    resolver: zodResolver(inkdAgentManageFormSchema),
    defaultValues: buildDefaultValues(props.agent),
    mode: "onChange",
  });

  const scheduleEnabled = form.watch("scheduleEnabled");
  const scheduleWeekdays = form.watch("scheduleWeekdays") ?? [];
  const prioritySources = form.watch("prioritySources") ?? [];

  useEffect(() => {
    if (!props.open) return;
    form.reset(buildDefaultValues(props.agent));
    setActiveStepId("foundational");
  }, [form, props.agent, props.open]);

  const currentStepIndex = STEP_IDS.indexOf(activeStepId);
  const currentStepMeta = STEP_META[activeStepId];

  const listRoute = endpoints.campaigns.getCampaignInkDAgents(props.campaignId);
  const combinedActivityRoute = endpoints.campaigns.getCampaignInkDAgentRecentActivity(props.campaignId, 1, 10, 5);

  const createMut = useApiMutation<Record<string, unknown>, unknown>({
    route: endpoints.campaigns.createCampaignInkDAgent(props.campaignId),
    method: "POST",
  });

  const updateMut = useApiMutation<Record<string, unknown>, unknown>({
    route: props.agent
      ? endpoints.campaigns.updateCampaignInkDAgent(props.campaignId, props.agent._id)
      : "",
    method: "PATCH",
  });

  const savePending = createMut.isPending || updateMut.isPending;

  const closeModal = () => {
    props.onOpenChange(false);
  };

  const invalidateInkDAgentQueries = () => {
    queryClient.invalidateQueries({ queryKey: [listRoute] });
    queryClient.invalidateQueries({ queryKey: [combinedActivityRoute] });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const normalizedPrioritySources = values.prioritySources
        .map((source) => source.trim())
        .filter(Boolean)
        .slice(0, INKD_AGENT_PRIORITY_SOURCE_MAX);

      const scheduleRules = values.scheduleEnabled
        ? (() => {
            const utcRule = localScheduleRuleToUtc({
              weekdays: values.scheduleWeekdays as InkDAgentWeekday[],
              timeLocal: values.scheduleTimeLocal,
            });

            return utcRule.weekdays.length && utcRule.timeUtc
              ? [
                  {
                    weekdays: utcRule.weekdays,
                    timeUtc: utcRule.timeUtc,
                  },
                ]
              : [];
          })()
        : [];

      const payload = {
        name: values.name.trim(),
        foundationalInformation: values.foundationalInformation.trim(),
        brandLanguage: values.brandLanguage.trim(),
        maxBlogDescriptionLength: values.maxBlogDescriptionLength,
        prioritySources: normalizedPrioritySources,
        scheduleRules,
      };

      if (props.agent) {
        await updateMut.mutateAsync(payload);
      } else {
        await createMut.mutateAsync(payload);
      }

      invalidateInkDAgentQueries();
      appToast.success(props.agent ? "InkD agent updated" : "Campaign-owned InkD agent created");
      closeModal();
    } catch (error: any) {
      appToast.error(readMutationError(error));
    }
  });

  const handleNext = async () => {
    const isValid = await form.trigger(getStepValidationFields(activeStepId, form.getValues()) as any);
    if (!isValid) return;
    setActiveStepId(STEP_IDS[Math.min(currentStepIndex + 1, STEP_IDS.length - 1)] ?? activeStepId);
  };

  const addPrioritySource = () => {
    if (prioritySources.length >= INKD_AGENT_PRIORITY_SOURCE_MAX) return;
    form.setValue("prioritySources", [...prioritySources, ""], {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  const updatePrioritySource = (index: number, value: string) => {
    const next = [...prioritySources];
    next[index] = value;
    form.setValue("prioritySources", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removePrioritySource = (index: number) => {
    const next = prioritySources.filter((_, currentIndex) => currentIndex !== index);
    form.setValue("prioritySources", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleWeekday = (day: InkDAgentWeekday) => {
    const next = scheduleWeekdays.includes(day)
      ? scheduleWeekdays.filter((weekday) => weekday !== day)
      : [...scheduleWeekdays, day];
    form.setValue("scheduleWeekdays", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const heading = props.agent ? "Edit InkD Agent" : "Create InkD Agent";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="max-w-4xl gap-0 rounded-[32px] border border-[#D9E4EC] bg-[#F8FBFD] p-0 shadow-2xl"
        onPointerDownOutside={(event) => savePending && event.preventDefault()}
        onEscapeKeyDown={(event) => savePending && event.preventDefault()}
      >
        <DialogHeader className="border-b border-[#E7EEF3] px-6 py-5 sm:text-left">
          <DialogTitle className="text-xl font-semibold text-[#132238]">
            {heading}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-[#64748B]">
            {currentStepMeta.title}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-[#E7EEF3] px-6 py-4">
          <div className="grid gap-3 md:grid-cols-4">
            {STEP_IDS.map((stepId, index) => {
              const isActive = stepId === activeStepId;
              const isComplete = index < currentStepIndex;

              return (
                <div
                  key={stepId}
                  className={`rounded-[22px] border px-4 py-3 ${
                    isActive
                      ? "border-[#0EA5A5] bg-[#E8FBFB]"
                      : isComplete
                        ? "border-[#CFE8E8] bg-white"
                        : "border-[#E2E8F0] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isActive
                          ? "bg-[#0EA5A5] text-white"
                          : isComplete
                            ? "bg-[#D9F7F7] text-[#0B7272]"
                            : "bg-[#EFF4F8] text-[#64748B]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#132238]">
                        {STEP_META[stepId].label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form className="px-6 py-6" onSubmit={handleSubmit}>
          <div className="min-h-[420px]">
            {activeStepId === "foundational" ? (
              <div className="space-y-5">
                <TextField<InkdAgentManageFormValues>
                  form={form}
                  schema={inkdAgentManageFormSchema as any}
                  name="name"
                  label="Name of AI Signal"
                  placeholder="Enter your AI signal name"
                  showError={false}
                  helperText={form.formState.errors.name?.message}
                />

                <TextAreaField<InkdAgentManageFormValues>
                  form={form}
                  schema={inkdAgentManageFormSchema as any}
                  name="foundationalInformation"
                  label="Add core values of the AI"
                  rows={12}
                  showCounter
                  showError={false}
                  helperText={form.formState.errors.foundationalInformation?.message}
                />
              </div>
            ) : null}

            {activeStepId === "brand" ? (
              <TextAreaField<InkdAgentManageFormValues>
                form={form}
                schema={inkdAgentManageFormSchema as any}
                name="brandLanguage"
                label="Write tonality of the AI"
                rows={14}
                showCounter
                showError={false}
                helperText={form.formState.errors.brandLanguage?.message}
              />
            ) : null}

            {activeStepId === "settings" ? (
              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[#F8FBFD] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                          Generation mode
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-[#132238]">
                          Campaign only
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F8FBFD] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                          Campaign target
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-[#132238]">
                          {props.campaignName}
                        </p>
                      </div>
                    </div>

                    <NumberField<InkdAgentManageFormValues>
                      form={form}
                      schema={inkdAgentManageFormSchema as any}
                      name="maxBlogDescriptionLength"
                      label="Blog length"
                      helperText={
                        form.formState.errors.maxBlogDescriptionLength?.message ||
                        `Allowed range: ${INKD_AGENT_BLOG_LENGTH_MIN} to ${INKD_AGENT_BLOG_LENGTH_MAX}`
                      }
                      showError={false}
                    />
                  </div>

                  <div className="rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-[#0EA5A5]">
                      <CalendarClock className="h-4 w-4" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                        Schedule blog posts
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#132238]">
                          {scheduleEnabled ? "Schedule enabled" : "No schedule is configured yet"}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant={scheduleEnabled ? "outline" : "default"}
                        className={
                          scheduleEnabled
                            ? "rounded-full border-[#FECACA] text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
                            : "rounded-full bg-[#0EA5A5] text-sm font-medium text-white hover:bg-[#0c9a9a]"
                        }
                        onClick={() => {
                          const next = !scheduleEnabled;
                          form.setValue("scheduleEnabled", next, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (!next) {
                            form.setValue("scheduleWeekdays", [], {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            form.setValue("scheduleTimeLocal", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        disabled={!props.canManage || savePending}
                      >
                        {scheduleEnabled ? "Remove schedule" : "Add schedule"}
                      </Button>
                    </div>
                  </div>
                </div>

                <section className="rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
                  {scheduleEnabled ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Weekdays</Label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {INKD_AGENT_WEEKDAYS.map((day) => {
                            const active = scheduleWeekdays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                className={`${CHIP_CLASS} ${
                                  active
                                    ? "border-[#0EA5A5] bg-[#E8FBFB] text-[#0B7272]"
                                    : "border-[#D9E4EC] bg-white text-[#64748B]"
                                }`}
                                onClick={() => toggleWeekday(day)}
                                disabled={!props.canManage || savePending}
                              >
                                {formatWeekdayLabel(day)}
                              </button>
                            );
                          })}
                        </div>
                        {form.formState.errors.scheduleWeekdays ? (
                          <p className="mt-2 text-xs text-[#B91C1C]">
                            {form.formState.errors.scheduleWeekdays.message as string}
                          </p>
                        ) : null}
                      </div>

                      <div className="max-w-xs space-y-2">
                        <Label htmlFor="inkd-agent-schedule-time" className="text-sm font-medium">
                          Local time
                        </Label>
                        <Input
                          id="inkd-agent-schedule-time"
                          type="time"
                          className={INPUT_CLASS}
                          disabled={!props.canManage || savePending}
                          {...form.register("scheduleTimeLocal")}
                        />
                        {form.formState.errors.scheduleTimeLocal ? (
                          <p className="text-xs text-[#B91C1C]">
                            {form.formState.errors.scheduleTimeLocal.message}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[#C9D7E3] bg-[#FBFDFE] px-4 py-6 text-sm text-[#64748B]">
                      No schedule is configured yet
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            {activeStepId === "priority" ? (
              <section className="rounded-[24px] border border-[#D9E4EC] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#0EA5A5]">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em]">
                    Priority scraping
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {prioritySources.map((source, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Input
                        className={INPUT_CLASS}
                        placeholder="https://example.com/source"
                        value={source}
                        disabled={!props.canManage || savePending}
                        onChange={(event) => updatePrioritySource(index, event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => removePrioritySource(index)}
                        disabled={!props.canManage || savePending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#94A3B8]">
                    Add up to {INKD_AGENT_PRIORITY_SOURCE_MAX} URLs
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={addPrioritySource}
                    disabled={
                      !props.canManage ||
                      savePending ||
                      prioritySources.length >= INKD_AGENT_PRIORITY_SOURCE_MAX
                    }
                  >
                    Add URL
                  </Button>
                </div>

                {form.formState.errors.prioritySources?.message ? (
                  <p className="mt-3 text-xs text-[#B91C1C]">
                    {form.formState.errors.prioritySources.message}
                  </p>
                ) : null}
                {Array.isArray(form.formState.errors.prioritySources) ? (
                  <div className="mt-3 space-y-1">
                    {form.formState.errors.prioritySources.map((error, index) =>
                      error?.message ? (
                        <p key={index} className="text-xs text-[#B91C1C]">
                          URL {index + 1}: {error.message}
                        </p>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EDF2] pt-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                if (currentStepIndex === 0) {
                  closeModal();
                  return;
                }
                setActiveStepId(STEP_IDS[currentStepIndex - 1] ?? activeStepId);
              }}
              disabled={savePending}
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStepIndex === 0 ? "Cancel" : "Back"}
            </Button>

            {activeStepId !== "priority" ? (
              <Button
                type="button"
                className="rounded-full bg-[#0EA5A5] text-white hover:bg-[#0c9a9a]"
                onClick={(event) => {
                  event.preventDefault();
                  void handleNext();
                }}
                disabled={!props.canManage || savePending}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="rounded-full bg-[#0EA5A5] text-white hover:bg-[#0c9a9a]"
                disabled={!props.canManage || savePending}
              >
                {savePending
                  ? props.agent
                    ? "Saving..."
                    : "Creating..."
                  : props.agent
                    ? "Save changes"
                    : "Create agent"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
