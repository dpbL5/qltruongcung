// ── LoadingDots component ───────────────────────────────
// Dùng khi page đang load data (full-page loading)
// Hỗ trợ cả spinner và skeleton variants

import { Loader2 } from "lucide-react";

interface LoadingDotsProps {
  message?: string;
  variant?: "spinner" | "dots";
}

export function LoadingDots({
  message = "Đang tải...",
  variant = "spinner",
}: LoadingDotsProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      {variant === "spinner" ? (
        <Loader2 className="animate-spin text-blue-500" size={32} />
      ) : (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{message}</p>
    </div>
  );
}
