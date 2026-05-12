import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40";

const variants = {
  primary:
    "bg-gradient-to-b from-lime-300 to-lime-400 text-slate-950 shadow-md shadow-lime-200/80 hover:from-lime-200 hover:to-lime-300 active:scale-[0.99]",
  secondary:
    "border border-emerald-300 bg-white text-emerald-900 shadow-sm hover:border-emerald-500 hover:bg-emerald-50",
  danger:
    "border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100",
  ghost: "text-emerald-800 hover:bg-emerald-100/80 hover:text-emerald-950",
  link: "rounded-none p-0 text-emerald-700 underline-offset-4 hover:text-emerald-900 hover:underline",
} as const;

type ButtonProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={[base, variants[variant], className].join(" ")} {...rest}>
      {children}
    </button>
  );
}
