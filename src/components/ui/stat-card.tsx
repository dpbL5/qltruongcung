// ── StatCard component ──────────────────────────────────
// Dùng cho các card thống kê trên Dashboard và Reports
// Hỗ trợ icon, trend indicator, và các biến thể màu

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

type StatColor = "green" | "blue" | "yellow" | "red" | "purple" | "default";

const colorMap: Record<StatColor, { bg: string; icon: string; dot: string }> = {
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    icon: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  yellow: {
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    icon: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
    icon: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
    icon: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  default: {
    bg: "bg-zinc-50 dark:bg-zinc-500/10 border-zinc-200 dark:border-zinc-700",
    icon: "text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-500",
  },
};

interface StatCardProps {
  label: string;
  value: string;
  color?: StatColor;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  subtitle?: string;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  color = "default",
  icon: Icon,
  trend,
  subtitle,
  children,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border px-5 py-4 transition-shadow hover:shadow-md ${c.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-1.5 flex items-center gap-1">
              {trend.value > 0 ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.value > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-zinc-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-lg p-2 ${c.icon} bg-white/60 dark:bg-zinc-800/60`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
