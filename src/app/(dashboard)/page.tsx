"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Timer,
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";
import { formatVND } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCardsSkeleton } from "@/components/ui/skeleton";

interface SessionRow {
  id: string;
  startTime: string;
  status: string;
  customer: { id: string; fullName: string; type: string };
  staff: { id: string; fullName: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeSessions, setActiveSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        fetch("/api/reports/dashboard"),
        fetch("/api/sessions?status=ACTIVE&limit=10"),
      ]);
      const [statsData, sessionsData] = await Promise.all([
        statsRes.json(),
        sessionsRes.json(),
      ]);
      if (statsData.success) setStats(statsData.data);
      if (sessionsData.success) setActiveSessions(sessionsData.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 animate-fade-in">
        <div className="mb-6">
          <div className="h-7 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <StatCardsSkeleton count={4} />
      </div>
    );
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Chào buổi sáng" : now.getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {/* ── Welcome + Quick Actions ────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
            {greeting} 👋
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Hôm nay, {now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/sessions"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <LogIn size={16} />
            Check-in nhanh
          </Link>
          <Link
            href="/customers"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <UserPlus size={16} />
            Thêm KH
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          label="Doanh thu hôm nay"
          value={stats ? formatVND(stats.todayRevenue) : "..."}
          color="green"
          icon={DollarSign}
        />
        <StatCard
          label="Lượt bắn hôm nay"
          value={stats?.todaySessions?.toString() ?? "..."}
          color="blue"
          icon={Timer}
        />
        <StatCard
          label="Đang chơi"
          value={stats?.activeSessions?.toString() ?? "..."}
          color="yellow"
          icon={TrendingUp}
        />
        <StatCard
          label="KH mới hôm nay"
          value={stats?.totalCustomersToday?.toString() ?? "..."}
          color="purple"
          icon={Users}
        />
      </div>

      {/* ── Active Sessions ────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">
              Phiên đang chơi
            </h3>
            {activeSessions.length > 0 && (
              <span className="rounded-full bg-green-50 dark:bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                {activeSessions.length}
              </span>
            )}
          </div>
          <Link
            href="/sessions"
            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Xem tất cả
            <ArrowRight size={12} />
          </Link>
        </div>

        {activeSessions.length === 0 ? (
          <EmptyState
            message="Không có phiên nào đang hoạt động"
            description="Nhấn Check-in nhanh để bắt đầu phiên mới"
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {activeSessions.map((s) => (
              <Link
                key={s.id}
                href={`/sessions`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {s.customer.fullName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(s.startTime).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}NV: {s.staff.fullName}
                  </p>
                </div>
                <Badge
                  variant={s.customer.type === "MEMBER" ? "purple" : "default"}
                  size="sm"
                >
                  {s.customer.type === "MEMBER" ? "Hội viên" : "Vãng lai"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
