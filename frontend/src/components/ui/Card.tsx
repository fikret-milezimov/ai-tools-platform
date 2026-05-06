import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  hover?: boolean;
};

export function Card({ children, className = "", hover = false, ...props }: Props) {
  const hoverCls = hover
    ? "transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    : "";
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white p-6 shadow-md ${hoverCls} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
