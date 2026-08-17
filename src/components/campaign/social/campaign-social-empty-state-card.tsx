import type { ReactNode } from "react";

export function CampaignSocialEmptyStateCard(props: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E4EC] bg-white p-8 shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0FDFF] text-[#117C7C]">
          {props.icon}
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#117C7C]">
          {props.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#132238]">
          {props.title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
          {props.description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium text-[#506273]">
          <span className="rounded-full bg-[#F5F9FC] px-3 py-1">X</span>
          <span className="rounded-full bg-[#F5F9FC] px-3 py-1">Instagram</span>
          <span className="rounded-full bg-[#F5F9FC] px-3 py-1">Facebook</span>
        </div>
        {props.footer ? <div className="mt-6">{props.footer}</div> : null}
      </div>
    </section>
  );
}
