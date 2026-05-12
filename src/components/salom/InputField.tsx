import type { InputHTMLAttributes, ReactNode } from "react";

type InputFieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function InputField({
  label,
  hint,
  error,
  className = "",
  id: idProp,
  children,
  ...inputProps
}: InputFieldProps) {
  const id = idProp ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;

  if (children) {
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          {label}
        </label>
        {children}
        {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        id={id}
        className={[
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "focus:border-amber-500 focus:ring-2 focus:ring-amber-200/60 focus:outline-none",
          "transition-[border-color,box-shadow] duration-150",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...inputProps}
      />
      {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
