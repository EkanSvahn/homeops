import type { ReactNode } from "react";

type PageSectionProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageSection({ title, description, children }: PageSectionProps) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="px-6 py-6 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
