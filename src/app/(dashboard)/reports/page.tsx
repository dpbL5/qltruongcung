"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingDots } from "@/components/ui/loading-dots";

interface RevenueData {
  period: string; revenue: number; sessionCount: number; avgRevenuePerSession: number;
}
interface DashboardStats {
  todayRevenue: number; todaySessions: number; activeSessions: number;
  totalCustomersToday: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [exportType, setExportType] = useState("revenue");
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/reports/dashboard");
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStats(); }, [loadStats]);

  const loadRevenue = async () => {
    const r = await fetch(`/api/reports/revenue?from=${from}&to=${to}`);
    const d = await r.json();
    if (d.success) setRevenue(d.data);
  };

  if (loading) return <LoadingDots />;

  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <BarChart3 size={24} className="text-blue-400" />
        Báo cáo
      </h2>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Doanh thu hôm nay" value={stats ? formatVND(stats.todayRevenue) : "..."} color="green" />
        <StatCard label="Lượt bắn" value={stats?.todaySessions?.toString() ?? "..."} color="blue" />
        <StatCard label="Đang chơi" value={stats?.activeSessions?.toString() ?? "..."} color="yellow" />
        <StatCard label="KH mới hôm nay" value={stats?.totalCustomersToday?.toString() ?? "..."} color="default" />
      </div>

      {/* Revenue Report */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-5 overflow-x-auto">
        <h3 className="mb-3 font-semibold text-white">Doanh thu</h3>
        <div className="mb-3 flex flex-wrap gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" />
          <span className="text-zinc-400 self-center">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" />
          <button onClick={loadRevenue}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Xem
          </button>
        </div>
        {revenue.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Doanh thu</th>
                <th className="px-3 py-2">Số phiên</th>
                <th className="px-3 py-2">TB/phiên</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((r) => (
                <tr key={r.period} className="border-b border-zinc-800/50">
                  <td className="px-3 py-2 text-white">{r.period}</td>
                  <td className="px-3 py-2 text-green-400 font-medium">{formatVND(r.revenue)}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.sessionCount}</td>
                  <td className="px-3 py-2 text-zinc-300">{formatVND(r.avgRevenuePerSession)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="Chọn khoảng thời gian và nhấn Xem" icon={false} />
        )}
      </div>

      {/* Export */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-5">
        <h3 className="mb-3 font-semibold text-white">Xuất báo cáo</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Loại báo cáo</label>
            <select value={exportType} onChange={(e) => setExportType(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
              <option value="revenue">Doanh thu</option>
              <option value="sessions">Phiên bắn</option>
            </select>
          </div>
          <a
            href={`/api/reports/export?type=${exportType}&from=${from}&to=${to}`}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download size={16} />
            Tải CSV
          </a>
        </div>
      </div>
    </div>
  );
}
