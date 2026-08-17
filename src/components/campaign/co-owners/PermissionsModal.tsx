import { useEffect, useRef } from "react";
import { type UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultPermissions,
  getPermissionValue,
  groupState,
  PermissionFormValues,
  PERMISSION_GROUPS,
  setDomainValue,
  setPermissionValue,
} from "./model";

function GroupedCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (next: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 shrink-0 rounded border border-black/30 accent-[#0EA5A5]"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

type Props = {
  open: boolean;
  title: string;
  isDetailLoading: boolean;
  hasChanges: boolean;
  isSubmitting: boolean;
  form: UseFormReturn<PermissionFormValues>;
  onSubmit: (values: PermissionFormValues) => void;
  onClose: () => void;
};

export default function PermissionsModal({
  open,
  title,
  isDetailLoading,
  hasChanges,
  isSubmitting,
  form,
  onSubmit,
  onClose,
}: Props) {
  const currentPermissionDraft = form.watch("permissions") ?? defaultPermissions();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="h-[88vh] max-h-[88vh] w-[95vw] max-w-2xl overflow-hidden rounded-2xl p-0 !grid !grid-rows-[auto,minmax(0,1fr),auto] gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Toggle access by domain or by individual permission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-2">
            {isDetailLoading ? (
              <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60">
                Loading latest permissions...
              </div>
            ) : null}

            {PERMISSION_GROUPS.map((group) => {
              const state = groupState(currentPermissionDraft, group);
              return (
                <section
                  key={group.key}
                  className="rounded-lg border border-black/10 bg-white p-4"
                >
                  <label className="flex items-center gap-3 border-b border-black/10 pb-3">
                    <GroupedCheckbox
                      checked={state.allChecked}
                      indeterminate={state.indeterminate}
                      onChange={(next) =>
                        form.setValue(
                          "permissions",
                          setDomainValue(
                            currentPermissionDraft,
                            group.key,
                            group.items.map((x) => x.key),
                            next,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {group.label} (select all)
                    </span>
                  </label>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-3 rounded-md border border-black/5 px-3 py-2 hover:bg-black/[0.02]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border border-black/30 accent-[#0EA5A5]"
                          checked={getPermissionValue(
                            currentPermissionDraft,
                            group.key,
                            item.key,
                          )}
                          onChange={(e) =>
                            form.setValue(
                              "permissions",
                              setPermissionValue(
                                currentPermissionDraft,
                                group.key,
                                item.key,
                                e.target.checked,
                              ),
                              { shouldDirty: true },
                            )
                          }
                        />
                        <span className="text-sm text-[#1A1A1A]">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <DialogFooter className="border-t border-black/10 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasChanges || isSubmitting}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-semibold text-white",
                !hasChanges || isSubmitting
                  ? "cursor-not-allowed bg-[#9CA3AF]"
                  : "bg-[#0EA5A5] hover:bg-[#0C9A9A]",
              )}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
