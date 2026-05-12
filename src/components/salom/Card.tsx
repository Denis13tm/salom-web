import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "md" | "lg";
  accent?: "operator" | "admin" | "none";
};

const pad = { md: "p-4 sm:p-5", lg: "p-5 sm:p-6" };

const accentBar = {
  operator: "before:bg-gradient-to-b before:from-lime-400 before:to-emerald-600",
  admin: "before:bg-gradient-to-b before:from-violet-400 before:to-purple-700",
  none: "",
};

export function Card({
  title,
  description,
  children,
  className = "",
  padding = "md",
  accent = "operator",
}: CardProps) {
  return (
    <section
      className={[
        "group relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-white",
        "shadow-sm shadow-slate-200/40 transition-shadow hover:shadow-md salom-card-base",
        accent !== "none" && [
          "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
          accentBar[accent],
        ],
        pad[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || description) && (
        <div className="mb-5 space-y-1">
          {title && (
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
          )}
          {description && (
            <div className="text-xs leading-relaxed text-slate-500">{description}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
