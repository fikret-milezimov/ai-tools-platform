import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-sky-600 text-white shadow hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
  secondary:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
