import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={[
        "flex flex-col gap-4 border-b border-violet-200/80 pb-8 sm:flex-row sm:items-start sm:justify-between",
        className,
      ].join(" ")}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && <div className="text-xs text-slate-500">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="max-w-2xl text-sm leading-relaxed text-slate-600">{description}</div>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function Kbd({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={[
        "rounded-md border border-violet-200 bg-violet-50/90 px-1.5 py-0.5 font-mono text-[0.7rem] text-violet-800",
        className,
      ].join(" ")}
    >
      {children}
    </code>
  );
}
