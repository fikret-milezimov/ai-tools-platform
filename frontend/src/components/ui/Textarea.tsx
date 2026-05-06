import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ label, id, className = "", ...props }: Props) {
  const tid = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={tid}
        className="block text-sm font-medium text-gray-800"
      >
        {label}
      </label>
      <textarea
        id={tid}
        rows={props.rows ?? 4}
        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${className}`}
        {...props}
      />
    </div>
  );
}
