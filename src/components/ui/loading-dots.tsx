// ── LoadingDots component ───────────────────────────────
// Dùng khi page đang load data (full-page loading)

import { Loader2 } from "lucide-react";

interface LoadingDotsProps {
  message?: string;
}

export function LoadingDots({ message = "Đang tải..." }: LoadingDotsProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-blue-400" size={32} />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}
