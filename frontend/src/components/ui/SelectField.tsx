import type { ReactNode, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

export function SelectField({
  label,
  id,
  children,
  className = "",
  ...props
}: Props) {
  const sid = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={sid}
        className="block text-sm font-medium text-gray-800"
      >
        {label}
      </label>
      <select
        id={sid}
        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
