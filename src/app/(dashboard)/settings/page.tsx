"use client";

import { useEffect, useState } from "react";
import { Settings, Sun, Moon, Monitor, Info } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { Skeleton } from "@/components/ui/skeleton";

// ── Theme options ─────────────────────────────────────────
interface ThemeOption {
  value: Theme;
  label: string;
  Icon: typeof Sun;
}

const themeOptions: ThemeOption[] = [
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
  { value: "system", label: "Hệ thống", Icon: Monitor },
];

// ── Page ──────────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ActiveIcon = themeOptions.find((o) => o.value === theme)?.Icon ?? Monitor;

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <h2 className="mb-6 flex items-center gap-2 text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
        <Settings size={24} className="text-blue-500" />
        Cài đặt
      </h2>

      <div className="max-w-xl space-y-4">
        {/* ── Theme Section ───────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            {mounted ? (
              <ActiveIcon size={18} className="text-zinc-500 dark:text-zinc-400" />
            ) : (
              <Monitor size={18} className="text-zinc-500 dark:text-zinc-400" />
            )}
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Giao diện</h3>
          </div>
          {!mounted ? (
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 flex-1" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {themeOptions.map((option) => {
                const isActive = theme === option.value;
                const { Icon } = option;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── System Info ──────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Info size={18} className="text-zinc-500 dark:text-zinc-400" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Thông tin hệ thống</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 dark:text-zinc-400">Phiên bản</span>
              <span className="text-zinc-900 dark:text-white font-mono">0.1.0</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 dark:text-zinc-400">Framework</span>
              <span className="text-zinc-900 dark:text-white">Next.js 16</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500 dark:text-zinc-400">Database</span>
              <span className="text-zinc-900 dark:text-white">PostgreSQL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
