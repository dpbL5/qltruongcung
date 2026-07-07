// ── Badge component ─────────────────────────────────────
// Dùng cho trạng thái (ACTIVE/COMPLETED/MAINTENANCE)
// và loại khách hàng (MEMBER/STUDENT/WALK_IN)

import type { ReactNode } from "react";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "purple"
  | "blue"
  | "default";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-500/20 text-green-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  danger: "bg-red-500/20 text-red-400",
  purple: "bg-purple-500/20 text-purple-400",
  blue: "bg-blue-500/20 text-blue-400",
  default: "bg-zinc-500/20 text-zinc-400",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
