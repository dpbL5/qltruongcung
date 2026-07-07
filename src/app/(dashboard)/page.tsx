"use client";

import { useCallback, useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { formatVND } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingDots } from "@/components/ui/loading-dots";

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
      // Silently fail — dashboard stats are not critical
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingDots />;

  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-4 md:mb-6 flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
        <Timer size={24} className="text-blue-400" />
        Dashboard
      </h2>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Doanh thu hôm nay"
          value={stats ? formatVND(stats.todayRevenue) : "..."}
          color="green"
        />
        <StatCard
          label="Lượt bắn hôm nay"
          value={stats?.todaySessions?.toString() ?? "..."}
          color="blue"
        />
        <StatCard
          label="Đang chơi"
          value={stats?.activeSessions?.toString() ?? "..."}
          color="yellow"
        />
        <StatCard
          label="KH mới hôm nay"
          value={stats?.totalCustomersToday?.toString() ?? "..."}
          color="default"
        />
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h3 className="font-semibold text-white">Phiên đang chơi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-5 py-2 font-medium">Khách hàng</th>
                <th className="px-5 py-2 font-medium">Loại KH</th>
                <th className="px-5 py-2 font-medium">Bắt đầu</th>
                <th className="px-5 py-2 font-medium">Nhân viên</th>
              </tr>
            </thead>
            <tbody>
              {activeSessions.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="Không có phiên nào đang hoạt động" icon={false} />
                  </td>
                </tr>
              ) : (
                activeSessions.map((s) => {
                  const typeVariant =
                    s.customer.type === "MEMBER"
                      ? "purple"
                      : s.customer.type === "STUDENT"
                        ? "blue"
                        : "default";
                  const typeLabel =
                    s.customer.type === "MEMBER"
                      ? "Hội viên"
                      : s.customer.type === "STUDENT"
                        ? "HS/SV"
                        : "Vãng lai";
                  return (
                    <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-5 py-3 font-medium text-white">
                        {s.customer.fullName}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={typeVariant as "purple" | "blue" | "default"}>
                          {typeLabel}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {new Date(s.startTime).toLocaleTimeString("vi-VN")}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{s.staff.fullName}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
