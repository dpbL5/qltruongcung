"use client";

import { useCallback, useEffect, useState } from "react";
import { Coffee, Plus } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Service { id: string; name: string; category: string; price: number; stockQuantity: number | null; isActive: boolean; }

function categoryLabel(category: string) {
  if (category === "DRINK") return "Đồ uống";
  if (category === "EQUIPMENT") return "Dụng cụ";
  return "Khác";
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", category: "DRINK", price: "", stockQuantity: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/services?active=false");
      const d = await r.json();
      if (d.success) setServices(d.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          price: Number(form.price),
          stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setForm({ name: "", category: "DRINK", price: "", stockQuantity: "" });
        load();
        setFeedback({ type: "success", message: "Đã thêm!" });
      } else {
        setFeedback({ type: "error", message: d.error });
      }
    } catch {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (svc: Service) => {
    await fetch(`/api/services/${svc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !svc.isActive }),
    });
    load();
  };

  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <Coffee size={24} className="text-blue-400" />
        Dịch vụ / Menu
      </h2>

      <form onSubmit={handleAdd} className="mb-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="w-full sm:w-40">
          <label className="block text-xs text-zinc-400 mb-1">Tên</label>
          <input type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Loại</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
            <option value="DRINK">Đồ uống</option>
            <option value="EQUIPMENT">Dụng cụ</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>
        <div className="w-full sm:w-28">
          <label className="block text-xs text-zinc-400 mb-1">Giá (VND)</label>
          <input type="number" required value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" />
        </div>
        <div className="w-full sm:w-24">
          <label className="block text-xs text-zinc-400 mb-1">Tồn kho</label>
          <input type="number" value={form.stockQuantity}
            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white" placeholder="∞" />
        </div>
        <button type="submit" disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus size={16} />
          {submitting ? "Đang thêm..." : "Thêm"}
        </button>
      </form>

      {feedback && (
        <p className={`mb-3 text-sm ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {feedback.message}
        </p>
      )}

      {loading ? (
        <p className="text-center text-zinc-500 py-12">Đang tải...</p>
      ) : services.length === 0 ? (
        <EmptyState message="Chưa có dịch vụ nào" />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-2">Tên</th>
                <th className="px-4 py-2">Loại</th>
                <th className="px-4 py-2">Giá</th>
                <th className="px-4 py-2">Tồn kho</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={`border-b border-zinc-800/50 ${!s.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{categoryLabel(s.category)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatVND(s.price)}</td>
                  <td className="px-4 py-3">
                    <span className={s.stockQuantity !== null && s.stockQuantity < 10 ? "text-red-400 font-medium" : "text-zinc-300"}>
                      {s.stockQuantity ?? "∞"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? "success" : "danger"}>
                      {s.isActive ? "Đang bán" : "Ngừng bán"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(s)}
                      className="rounded bg-zinc-700 px-2 py-1 text-xs text-white hover:bg-zinc-600">
                      {s.isActive ? "Ngừng" : "Mở lại"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
