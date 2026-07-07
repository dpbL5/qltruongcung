"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Plus, Search } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingDots } from "@/components/ui/loading-dots";

interface Customer {
  id: string; fullName: string; phone: string | null; type: string;
  memberCode?: string; totalHoursPlayed: number; totalSpent: number; createdAt: string;
}

function typeVariant(type: string) {
  if (type === "MEMBER") return "purple" as const;
  if (type === "STUDENT") return "blue" as const;
  return "default" as const;
}

function typeLabel(type: string) {
  if (type === "MEMBER") return "Hội viên";
  if (type === "STUDENT") return "HS/SV";
  return "Vãng lai";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", type: "WALK_IN" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const r = await fetch(`/api/customers?${params}`);
      const d = await r.json();
      if (d.success) setCustomers(d.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        setShowForm(false);
        setForm({ fullName: "", phone: "", type: "WALK_IN" });
        load();
        setFeedback({ type: "success", message: "Tạo thành công!" });
      } else {
        setFeedback({ type: "error", message: d.error });
      }
    } catch {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingDots />;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
          <Users size={24} className="text-blue-400" />
          Khách hàng
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Thêm khách
        </button>
      </div>

      {feedback && (
        <p className={`mb-3 text-sm ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {feedback.message}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <input type="text" placeholder="Họ tên *" required value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" />
          <input type="text" placeholder="SĐT" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
            <option value="WALK_IN">Vãng lai</option>
            <option value="STUDENT">HS/SV</option>
            <option value="MEMBER">Hội viên</option>
          </select>
          <button type="submit" disabled={submitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </form>
      )}

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" placeholder="Tìm kiếm..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-white" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
          <option value="">Tất cả</option>
          <option value="WALK_IN">Vãng lai</option>
          <option value="STUDENT">HS/SV</option>
          <option value="MEMBER">Hội viên</option>
        </select>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
        {customers.length === 0 ? (
          <EmptyState message="Chưa có khách hàng nào" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-2">Tên</th>
                <th className="px-4 py-2">SĐT</th>
                <th className="px-4 py-2">Loại</th>
                <th className="px-4 py-2">Tổng giờ</th>
                <th className="px-4 py-2">Tổng tiền</th>
                <th className="px-4 py-2">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-white">
                    {c.fullName}
                    {c.memberCode && <span className="ml-1 text-xs text-purple-400">[{c.memberCode}]</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{c.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={typeVariant(c.type)}>{typeLabel(c.type)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{Number(c.totalHoursPlayed).toFixed(1)}h</td>
                  <td className="px-4 py-3 text-zinc-300">{formatVND(Number(c.totalSpent))}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
