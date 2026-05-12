import type { ReactNode } from "react";

const styles = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
  info: "bg-violet-50 text-violet-800 border-violet-200",
} as const;

type Variant = keyof typeof styles;

type BadgeProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        styles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
