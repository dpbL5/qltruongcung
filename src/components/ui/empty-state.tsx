// ── EmptyState component ────────────────────────────────
// Dùng khi table/list không có dữ liệu

import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  icon?: boolean;
}

export function EmptyState({
  message = "Không có dữ liệu",
  icon = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <Inbox className="mb-3 text-zinc-600" size={40} />}
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
