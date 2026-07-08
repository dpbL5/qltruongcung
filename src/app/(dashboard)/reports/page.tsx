"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Download, TrendingUp, Timer, Users, DollarSign } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCardsSkeleton } from "@/components/ui/skeleton";
import { Input, Select, Label } from "@/components/ui/input";

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
  const [revenueLoading, setRevenueLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/reports/dashboard");
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStats(); }, [loadStats]);

  const loadRevenue = async () => {
    setRevenueLoading(true);
    try {
      const r = await fetch(`/api/reports/revenue?from=${from}&to=${to}`);
      const d = await r.json();
      if (d.success) setRevenue(d.data);
    } catch { /* ignore */ }
    finally { setRevenueLoading(false); }
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
          <BarChart3 size={24} className="text-blue-500" />
          Báo cáo
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Thống kê doanh thu và hoạt động
        </p>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      {loading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <StatCard label="Doanh thu hôm nay" value={stats ? formatVND(stats.todayRevenue) : "..."} color="green" icon={DollarSign} />
          <StatCard label="Lượt bắn hôm nay" value={stats?.todaySessions?.toString() ?? "..."} color="blue" icon={Timer} />
          <StatCard label="Đang chơi" value={stats?.activeSessions?.toString() ?? "..."} color="yellow" icon={TrendingUp} />
          <StatCard label="KH mới hôm nay" value={stats?.totalCustomersToday?.toString() ?? "..."} color="purple" icon={Users} />
        </div>
      )}

      {/* ── Revenue Report ────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5">
        <h3 className="mb-3 font-semibold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-500" />
          Doanh thu theo ngày
        </h3>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <Label>Từ ngày</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <span className="text-zinc-400 pb-2">→</span>
          <div>
            <Label>Đến ngày</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button onClick={loadRevenue}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            {revenueLoading ? "Đang tải..." : "Xem"}
          </button>
        </div>

        {revenue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ngày</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Doanh thu</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Số phiên</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">TB/phiên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {revenue.map((r) => (
                  <tr key={r.period} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-white text-xs">{r.period}</td>
                    <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">{formatVND(r.revenue)}</td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-300 text-xs">{r.sessionCount}</td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-300 text-xs">{formatVND(r.avgRevenuePerSession)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Chọn khoảng thời gian và nhấn Xem" />
        )}
      </div>

      {/* ── Export ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5">
        <h3 className="mb-3 font-semibold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
          <Download size={18} className="text-blue-500" />
          Xuất báo cáo
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label>Loại báo cáo</Label>
            <Select value={exportType} onChange={(e) => setExportType(e.target.value)}>
              <option value="revenue">Doanh thu</option>
              <option value="sessions">Phiên bắn</option>
            </Select>
          </div>
          <a
            href={`/api/reports/export?type=${exportType}&from=${from}&to=${to}`}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download size={16} />
            Tải CSV
          </a>
        </div>
      </div>
    </div>
  );
}
