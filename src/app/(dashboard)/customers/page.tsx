"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Plus, Search, RefreshCw } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Input, Select, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface Customer {
  id: string; fullName: string; phone: string | null; type: string;
  totalHoursPlayed: number; totalSpent: number; createdAt: string;
}

function typeVariant(type: string) {
  return type === "MEMBER" ? "purple" as const : "default" as const;
}
function typeLabel(type: string) {
  return type === "MEMBER" ? "Hội viên" : "Vãng lai";
}

export default function CustomersPage() {
  const { success: notifySuccess, error: notifyError } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", type: "WALK_IN" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const r = await fetch(`/api/customers?${params}`);
      const d = await r.json();
      if (d.success) setCustomers(d.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, typeFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        setShowForm(false);
        setForm({ fullName: "", phone: "", type: "WALK_IN" });
        notifySuccess("Tạo khách hàng thành công!");
        load();
      } else { notifyError(d.error); }
    } catch { notifyError("Lỗi kết nối máy chủ"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
            <Users size={24} className="text-blue-500" />
            Khách hàng
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {customers.length} khách hàng
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Thêm khách
          </button>
        </div>
      </div>

      {/* ── Create Form ────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreate}
          className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-4 animate-slide-up">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
            <Plus size={16} className="text-blue-500" />
            Thêm khách hàng mới
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-auto sm:flex-1 min-w-[150px]">
              <Label required>Họ tên</Label>
              <Input type="text" placeholder="Họ tên" required value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="w-full sm:w-auto sm:flex-1 min-w-[140px]">
              <Label>Số điện thoại</Label>
              <Input type="text" placeholder="SĐT" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="w-full sm:w-auto min-w-[120px]">
              <Label>Loại</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="WALK_IN">Vãng lai</option>
                <option value="MEMBER">Hội viên</option>
              </Select>
            </div>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              Huỷ
            </button>
          </div>
        </form>
      )}

      {/* ── Filters ────────────────────────────────────── */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="w-auto">
          <option value="">Tất cả</option>
          <option value="WALK_IN">Vãng lai</option>
          <option value="MEMBER">Hội viên</option>
        </Select>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {customers.length === 0 ? (
            <EmptyState
              message="Chưa có khách hàng nào"
              description="Nhấn &quot;Thêm khách&quot; để tạo khách hàng đầu tiên"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tên</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">SĐT</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loại</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Tổng giờ</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Tổng tiền</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                        {c.fullName}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                        {c.phone || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={typeVariant(c.type)} size="sm">{typeLabel(c.type)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs hidden sm:table-cell">
                        {Number(c.totalHoursPlayed).toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs hidden sm:table-cell">
                        {formatVND(Number(c.totalSpent))}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs hidden md:table-cell">
                        {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
