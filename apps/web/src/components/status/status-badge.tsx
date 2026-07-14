import type { ReactNode } from "react";

type StatusTone = "success" | "running" | "warning" | "danger" | "neutral";

const toneClassName: Record<StatusTone, string> = {
  success: "bg-emerald-100 text-emerald-800",
  running: "bg-blue-100 text-blue-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  neutral: "bg-slate-100 text-slate-700",
};

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-sm px-2 py-1 text-xs font-semibold ${toneClassName[tone]}`}>
      {children}
    </span>
  );
}
