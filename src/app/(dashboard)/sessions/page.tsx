"use client";

import { useEffect, useState, useCallback } from "react";
import { Timer, Plus, X, CreditCard, Search } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

// ── Types ──────────────────────────────────────────────
interface Customer {
  id: string; fullName: string; phone: string | null; type: string;
  memberCode?: string; totalHoursPlayed?: number; totalSpent?: number;
}
interface Order {
  id: string; service: { name: string }; quantity: number; subtotal: number;
}
interface SessionRow {
  id: string; startTime: string; endTime?: string; status: string;
  hourlyRate: number; totalHours?: number; subtotal?: number;
  discountAmount?: number; totalAmount?: number;
  customer: Customer; staff: { id: string; fullName: string };
  orders?: Order[];
}

function customerTypeVariant(type: string) {
  if (type === "MEMBER") return "purple" as const;
  if (type === "STUDENT") return "blue" as const;
  return "default" as const;
}

function sessionStatusVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PAUSED") return "warning" as const;
  return "default" as const;
}

function sessionStatusLabel(status: string) {
  if (status === "ACTIVE") return "Đang chơi";
  if (status === "PAUSED") return "Tạm dừng";
  return status;
}

// ── Page ───────────────────────────────────────────────
export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);

  // Check-in form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formNewCustomer, setFormNewCustomer] = useState({ fullName: "", phone: "", type: "WALK_IN" });
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [checkinFeedback, setCheckinFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Checkout state
  const [checkoutPayment, setCheckoutPayment] = useState("CASH");
  const [checkoutFeedback, setCheckoutFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Order state
  const [orderServiceId, setOrderServiceId] = useState("");
  const [orderQty, setOrderQty] = useState(1);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, svRes] = await Promise.all([
        fetch(`/api/sessions?status=${tab === "active" ? "ACTIVE" : "COMPLETED"}&limit=30`),
        fetch("/api/customers?limit=100"),
        fetch("/api/services?active=true"),
      ]);
      const [sData, cData, svData] = await Promise.all([sRes.json(), cRes.json(), svRes.json()]);
      setSessions(sData.data || []);
      setCustomers(cData.data || []);
      setServices(svData.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  // ── Check-in ─────────────────────────────────────────
  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinFeedback(null);
    if (!formCustomerId && !showNewCustomer) return setCheckinFeedback({ type: "error", message: "Chọn khách hàng hoặc tạo mới" });
    setSubmitting(true);

    let customerId = formCustomerId;
    if (showNewCustomer && formNewCustomer.fullName) {
      const r = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formNewCustomer),
      });
      const d = await r.json();
      if (!d.success) {
        setSubmitting(false);
        return setCheckinFeedback({ type: "error", message: "Lỗi tạo khách: " + d.error });
      }
      customerId = d.data.id;
    }

    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const d = await r.json();
    if (!d.success) {
      setSubmitting(false);
      return setCheckinFeedback({ type: "error", message: d.error });
    }

    setCheckinFeedback({ type: "success", message: "Check-in thành công!" });
    setFormCustomerId(""); setShowNewCustomer(false);
    setFormNewCustomer({ fullName: "", phone: "", type: "WALK_IN" });
    setSubmitting(false);
    loadData();
  };

  // ── Quick check-in (khách ẩn danh) ───────────────────
  const handleQuickCheckin = async () => {
    setSubmitting(true);
    setCheckinFeedback(null);
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}", // không customerId → hệ thống tự tạo khách ẩn danh
      });
      const d = await r.json();
      if (d.success) {
        setCheckinFeedback({ type: "success", message: `Check-in nhanh thành công! ${d.data.customer.fullName}` });
        loadData();
      } else {
        setCheckinFeedback({ type: "error", message: d.error });
      }
    } catch {
      setCheckinFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add order ────────────────────────────────────────
  const handleAddOrder = async () => {
    if (!selectedSession || !orderServiceId) return;
    const r = await fetch(`/api/sessions/${selectedSession.id}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: orderServiceId, quantity: orderQty }),
    });
    if (r.ok) {
      loadData();
      const dR = await fetch(`/api/sessions/${selectedSession.id}`);
      const dD = await dR.json();
      if (dD.success) setSelectedSession(dD.data);
      setOrderServiceId(""); setOrderQty(1);
    }
  };

  // ── Checkout ─────────────────────────────────────────
  const handleCheckout = async () => {
    if (!selectedSession) return;
    const r = await fetch(`/api/sessions/${selectedSession.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: checkoutPayment }),
    });
    const d = await r.json();
    if (d.success) {
      setCheckoutFeedback({ type: "success", message: `Checkout thành công! Tổng: ${formatVND(d.data.grandTotal)}` });
      setSelectedSession(null);
      loadData();
    } else {
      setCheckoutFeedback({ type: "error", message: d.error });
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.memberCode && c.memberCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-4 md:mb-6 flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
        <Timer size={24} className="text-blue-400" />
        Quản lý phiên bắn
      </h2>

      {/* ── Check-in Form ──────────────────────────────── */}
      <div className="mb-4 md:mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-5">
        <h3 className="mb-3 md:mb-4 flex items-center gap-1.5 font-semibold text-white">
          <Plus size={18} />
          Check-in khách mới
        </h3>
        <form onSubmit={handleCheckin} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
          {!showNewCustomer ? (
            <div className="w-full sm:min-w-[260px] sm:flex-1">
              <label className="mb-1 block text-xs text-zinc-400">
                Khách hàng <span className="text-zinc-600">(tìm theo tên, SĐT hoặc mã hội viên)</span>
              </label>
              <div className="relative mb-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Gõ để tìm khách..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-8 pr-3 text-sm text-white"
                />
              </div>
              <select
                value={formCustomerId}
                onChange={(e) => { setFormCustomerId(e.target.value); if (e.target.value) setCustomerSearch(""); }}
                size={Math.min(filteredCustomers.length + 1, 8)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              >
                <option value="">-- Chọn khách --</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.phone ? `- ${c.phone}` : ""} ({c.type === "MEMBER" ? "Hội viên" : c.type === "STUDENT" ? "HS/SV" : "Vãng lai"})
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => { setShowNewCustomer(true); setFormCustomerId(""); }}
                className="mt-1 text-xs text-blue-400 hover:underline">
                + Tạo khách mới
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
              <input type="text" placeholder="Họ tên *"
                value={formNewCustomer.fullName}
                onChange={(e) => setFormNewCustomer({ ...formNewCustomer, fullName: e.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white w-full sm:w-40" />
              <input type="text" placeholder="SĐT"
                value={formNewCustomer.phone}
                onChange={(e) => setFormNewCustomer({ ...formNewCustomer, phone: e.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white w-full sm:w-36" />
              <select value={formNewCustomer.type}
                onChange={(e) => setFormNewCustomer({ ...formNewCustomer, type: e.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white w-full sm:w-auto">
                <option value="WALK_IN">Vãng lai</option>
                <option value="STUDENT">HS/SV</option>
                <option value="MEMBER">Hội viên</option>
              </select>
              <button type="button" onClick={() => setShowNewCustomer(false)}
                className="text-xs text-zinc-400 hover:text-white self-start py-2">
                Huỷ
              </button>
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full sm:w-auto rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50">
            {submitting ? "Đang xử lý..." : "Bắt đầu"}
          </button>
        </form>

        {/* ── Quick Check-in ────────────────────────────── */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={handleQuickCheckin}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            <Timer size={16} />
            {submitting ? "Đang xử lý..." : "Check-in nhanh"}
          </button>
          <span className="text-xs text-zinc-500">
            Dành cho khách vãng lai không muốn lưu thông tin — tạo khách ẩn danh, bắt đầu tính giờ ngay.
          </span>
        </div>

        {checkinFeedback && (
          <p className={`mt-3 text-sm ${checkinFeedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {checkinFeedback.message}
          </p>
        )}
      </div>

      {/* ── Tab ─────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2">
        {(["active", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}>
            {t === "active" ? "Đang chơi" : "Lịch sử"}
          </button>
        ))}
      </div>

      {/* ── Sessions List ───────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-zinc-500">Đang tải...</div>
          ) : sessions.length === 0 ? (
            <EmptyState message="Không có dữ liệu" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="px-4 py-2 font-medium">Khách</th>
                  <th className="px-4 py-2 font-medium">Bắt đầu</th>
                  <th className="px-4 py-2 font-medium">Giá/h</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{s.customer.fullName}</span>
                      <span className="ml-2">
                        <Badge variant={customerTypeVariant(s.customer.type)}>
                          {s.customer.type === "MEMBER" ? "Hội viên" : s.customer.type === "STUDENT" ? "HS/SV" : "Vãng lai"}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(s.startTime).toLocaleTimeString("vi-VN")}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatVND(s.hourlyRate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={sessionStatusVariant(s.status)}>{sessionStatusLabel(s.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={async () => {
                          const r = await fetch(`/api/sessions/${s.id}`);
                          const d = await r.json();
                          if (d.success) { setSelectedSession(d.data); setCheckoutFeedback(null); }
                        }}
                        className="rounded-lg bg-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-600">
                        {s.status === "ACTIVE" ? "Chi tiết / Checkout" : "Xem"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Session Detail Modal ────────────────────────── */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 md:p-4" onClick={() => setSelectedSession(null)}>
          <div className="max-h-full md:max-h-[90vh] w-full max-w-2xl overflow-auto rounded-none md:rounded-2xl bg-zinc-900 p-4 md:p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold text-white">
                <Timer size={20} className="text-blue-400" />
                {selectedSession.customer.fullName}
              </h3>
              <button onClick={() => setSelectedSession(null)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info label="Giá/giờ" value={formatVND(selectedSession.hourlyRate)} />
              <Info label="Bắt đầu" value={new Date(selectedSession.startTime).toLocaleString("vi-VN")} />
              <Info label="Trạng thái" value={sessionStatusLabel(selectedSession.status)} />
              <Info label="Loại KH" value={selectedSession.customer.type === "MEMBER" ? "Hội viên" : selectedSession.customer.type === "STUDENT" ? "HS/SV" : "Vãng lai"} />
              <Info label="Nhân viên" value={selectedSession.staff.fullName} />
            </div>

            {/* Orders */}
            <div className="mb-4 rounded-lg border border-zinc-800 p-3">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
                <CreditCard size={16} />
                Dịch vụ
              </h4>
              {selectedSession.orders && selectedSession.orders.length > 0 ? (
                <ul className="mb-2 space-y-1 text-sm">
                  {selectedSession.orders.map((o) => (
                    <li key={o.id} className="flex justify-between text-zinc-300">
                      <span>{o.quantity}x {o.service.name}</span>
                      <span>{formatVND(o.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-zinc-500">Chưa có dịch vụ</p>}

              {selectedSession.status === "ACTIVE" && (
                <div className="flex flex-wrap gap-2">
                  <select value={orderServiceId} onChange={(e) => setOrderServiceId(e.target.value)}
                    className="flex-1 min-w-[140px] rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white">
                    <option value="">-- Chọn món --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({formatVND(s.price)})</option>
                    ))}
                  </select>
                  <input type="number" min={1} value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white text-center" />
                  <button onClick={handleAddOrder}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Thêm</button>
                </div>
              )}
            </div>

            {/* Checkout */}
            {selectedSession.status === "ACTIVE" && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
                  <CreditCard size={16} />
                  Thanh toán
                </h4>
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Phương thức</label>
                    <select value={checkoutPayment} onChange={(e) => setCheckoutPayment(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white">
                      <option value="CASH">Tiền mặt</option>
                      <option value="TRANSFER">Chuyển khoản</option>
                      <option value="CARD">Thẻ</option>
                    </select>
                  </div>
                  <button onClick={handleCheckout}
                    className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
                    Checkout
                  </button>
                </div>
                {checkoutFeedback && (
                  <p className={`mt-2 text-sm ${checkoutFeedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {checkoutFeedback.message}
                  </p>
                )}
              </div>
            )}

            {/* Completed info */}
            {selectedSession.status === "COMPLETED" && (
              <div className="rounded-lg border border-zinc-700 p-3 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Tổng giờ</span><span className="text-white">{selectedSession.totalHours}h</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Tiền giờ</span><span className="text-white">{formatVND(selectedSession.subtotal || 0)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Giảm giá</span><span className="text-white">{formatVND(selectedSession.discountAmount || 0)}</span></div>
                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-zinc-700"><span className="text-zinc-300">Tổng</span><span className="text-green-400">{formatVND(selectedSession.totalAmount || 0)}</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-zinc-500">{label}:</span>{" "}
      <span className="text-white">{value}</span>
    </div>
  );
}
