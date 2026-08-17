import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { CheckoutStep } from "@/components/payment/checkout-core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type CheckoutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  eyebrow?: string;
  steps: CheckoutStep[];
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
};

export function CheckoutModal({
  open,
  onOpenChange,
  title,
  subtitle,
  eyebrow,
  steps,
  children,
  footer,
  dismissible = false,
}: CheckoutModalProps) {
  const isMobile = useIsMobile();
  const preventDismiss = !dismissible;
  const header = (
    <div className="rounded-[28px] border border-[#d5d8cf] bg-[linear-gradient(135deg,#f8f3e7_0%,#eef7f2_48%,#eef4f7_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {eyebrow ? (
            <Badge className="rounded-full border border-[#0f766e]/20 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#0f766e] shadow-none hover:bg-white">
              {eyebrow}
            </Badge>
          ) : null}
          <div className="text-xs font-medium uppercase tracking-[0.24em] text-black/45">
            Unified checkout
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full border-black/10 bg-white/80 text-[#132238] hover:bg-white"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close checkout</span>
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-[#132238]">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#304255]/75">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <div
            key={`${step.label}-${index}`}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
              step.state === "complete" &&
                "border-[#0f766e]/20 bg-[#e6f6f3] text-[#0f766e]",
              step.state === "active" &&
                "border-[#132238]/15 bg-[#132238] text-white",
              step.state === "upcoming" &&
                "border-black/10 bg-white/70 text-black/50",
            )}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-black/10 text-[10px] font-semibold">
              {index + 1}
            </span>
            {step.label}
          </div>
        ))}
      </div>

      {isMobile ? (
        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-black/10 bg-white/80"
            onClick={() => onOpenChange(false)}
          >
            Close checkout
          </Button>
        </div>
      ) : null}
    </div>
  );

  const body = (
    <div className="flex h-full flex-col overflow-hidden">
      {header}
      <div className="mt-6 flex-1 overflow-y-auto pr-1">{children}</div>
      {footer ? (
        <div className="mt-5 border-t border-black/10 pt-5">{footer}</div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
        <DrawerContent
          className="mx-1 max-h-[94vh] rounded-t-[28px] border-none bg-[#f7f5ef] px-4 pb-4 text-black [&>div:first-child]:hidden"
          onPointerDownOutside={
            preventDismiss ? (event) => event.preventDefault() : undefined
          }
          onEscapeKeyDown={
            preventDismiss ? (event) => event.preventDefault() : undefined
          }
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{subtitle}</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl border-none bg-[#f7f5ef] p-6 text-black shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:rounded-[28px]"
        hideClose
        onInteractOutside={
          preventDismiss ? (event) => event.preventDefault() : undefined
        }
        onPointerDownOutside={
          preventDismiss ? (event) => event.preventDefault() : undefined
        }
        onEscapeKeyDown={
          preventDismiss ? (event) => event.preventDefault() : undefined
        }
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[88vh]">{body}</div>
      </DialogContent>
    </Dialog>
  );
}

export function CheckoutPageShell(props: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#d9ddd3] bg-[linear-gradient(180deg,#fbfaf6_0%,#f2f6f3_100%)] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0f766e]">
            Marketplace
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-[#132238]">
            {props.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#304255]/75">
            {props.subtitle}
          </p>
        </div>
        {props.action}
      </div>

      <div className="mt-7">{props.children}</div>
    </section>
  );
}

export function CheckoutSection(props: {
  title: string;
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur",
        props.className,
      )}
    >
      <div className="mb-4">
        <h3 className="font-serif text-xl font-semibold text-[#132238]">
          {props.title}
        </h3>
        {props.caption ? (
          <p className="mt-1 text-sm leading-6 text-black/55">
            {props.caption}
          </p>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

export function RailOptionCard(props: {
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
  footer?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-[28px] border p-5 text-left transition-all duration-200",
        props.footer ? "min-h-[120px]" : undefined,
        props.active
          ? "border-[#0f766e] bg-[#f0f9f6] shadow-md shadow-[#0f766e]/5 ring-1 ring-[#0f766e]"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-sm",
        props.disabled && "cursor-not-allowed opacity-40 grayscale-[0.5]",
      )}
    >
      {/* Icon Container */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition-all",
          props.active
            ? "bg-[#0f766e] text-white shadow-lg shadow-[#0f766e]/20"
            : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-600 group-hover:shadow-sm",
        )}
      >
        {props.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-bold transition-colors",
              props.active ? "text-[#0f766e]" : "text-[#132238]",
            )}
          >
            {props.title}
          </span>

          {/* Active Checkmark Indicator */}
          {props.active && (
            <CheckCircle2 className="h-4 w-4 text-[#0f766e] animate-in zoom-in duration-300" />
          )}
        </div>

        <p className="mt-0.5 truncate text-[13px] font-medium text-slate-500">
          {props.subtitle}
        </p>

        <div
          className={cn(
            "mt-2 text-base font-bold",
            props.active ? "text-[#132238]" : "text-slate-400",
          )}
        >
          {props.value}
        </div>

        {props.footer ? (
          <div className="mt-3 flex justify-end">{props.footer}</div>
        ) : null}
      </div>

      {/* Interactive State Overlay */}
      {props.active && (
        <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#0f766e]" />
      )}
    </button>
  );
}

export function SummaryRows(props: {
  rows: Array<{ label: string; value: ReactNode; subtle?: boolean }>;
}) {
  return (
    <div className="space-y-3">
      {props.rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            "flex items-start justify-between gap-4 text-sm",
            row.subtle ? "text-black/55" : "text-[#132238]",
          )}
        >
          <span className="font-medium">{row.label}</span>
          <span className="text-right font-semibold">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function NoticePanel(props: {
  tone?: "neutral" | "warning" | "danger" | "success";
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const tones = {
    neutral: "border-black/10 bg-[#f6f8fb] text-[#132238]",
    warning: "border-[#c98b1f]/20 bg-[#fff8eb] text-[#8c5b09]",
    danger: "border-[#d25555]/20 bg-[#fff0ef] text-[#9b2c2c]",
    success: "border-[#0f766e]/20 bg-[#eef8f5] text-[#0f766e]",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-4 shadow-sm",
        tones[props.tone ?? "neutral"],
      )}
    >
      <div className="font-semibold">{props.title}</div>
      <p className="mt-1 text-sm leading-6 opacity-90">{props.description}</p>
      {props.children ? <div className="mt-3">{props.children}</div> : null}
    </div>
  );
}

export function AssetMetric(props: {
  label: string;
  value: ReactNode;
  caption?: string;
  variant?: "default" | "teal"; // Added variant for color-coding rates
}) {
  const isTeal = props.variant === "teal";

  return (
    <div className="flex flex-col rounded-[24px] border border-slate-100 bg-white/60 p-4 transition-all hover:bg-white hover:shadow-sm">
      {/* Label: Small, spaced, and subtle */}
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {props.label}
      </span>

      {/* Value: Large, break-words to handle wallet addresses, no truncation */}
      <div
        className={`mt-1.5 break-all text-base font-bold leading-tight ${
          isTeal ? "text-[#0f766e]" : "text-[#132238]"
        }`}
      >
        {props.value}
      </div>

      {/* Caption: Smaller and lighter to maintain hierarchy */}
      {props.caption && (
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          {props.caption}
        </p>
      )}
    </div>
  );
}

export function ResultActions(props: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
      {props.children}
    </div>
  );
}

export function PageLoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-black/10 bg-white/85 p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-[20px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="mt-6 grid gap-2">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyStateCard(props: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/15 bg-white/70 px-6 py-10 text-center shadow-sm">
      <div className="mx-auto max-w-lg">
        <h3 className="font-serif text-2xl font-semibold text-[#132238]">
          {props.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-black/55">
          {props.description}
        </p>
        {props.action ? <div className="mt-5">{props.action}</div> : null}
      </div>
    </div>
  );
}

export function FooterButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "h-11 rounded-full px-5 text-sm font-semibold",
        props.className,
      )}
    />
  );
}

export function AnimatedDotsText(props: {
  text: string;
  className?: string;
}) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 420);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={cn("inline-flex items-center", props.className)}>
      {props.text}
      <span aria-hidden className="inline-block w-[1.6ch] text-left">
        {".".repeat(dotCount)}
      </span>
    </span>
  );
}
