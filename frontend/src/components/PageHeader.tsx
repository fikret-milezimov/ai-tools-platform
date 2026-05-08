import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** When "center", title and description are centered (e.g. dashboard hero). */
  align?: "left" | "center";
};

export function PageHeader({ title, description, actions, align = "left" }: Props) {
  const centered = align === "center";

  return (
    <div
      className={
        centered
          ? "flex flex-col items-center gap-4 border-b border-slate-200/80 pb-8 text-center"
          : "flex flex-col gap-4 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between"
      }
    >
      <div className={centered ? "mx-auto max-w-2xl" : "min-w-0"}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p
            className={
              centered
                ? "mt-2 text-base text-slate-600"
                : "mt-2 max-w-2xl text-base text-slate-600"
            }
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={
            centered
              ? "flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:justify-center"
              : "flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center"
          }
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
