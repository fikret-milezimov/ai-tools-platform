import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
};

export function Input({ label, hint, id, className = "", ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-800"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${className}`}
        {...props}
      />
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
