"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Timer, X, CreditCard, Search, LogIn, LogOut, Clock,
  Users, ArrowLeft, ArrowRight, CheckCircle, Ticket,
  RefreshCw,
} from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────────────
interface Customer {
  id: string; fullName: string; phone: string | null; type: string;
  totalHoursPlayed?: number; totalSpent?: number;
}
interface SessionRow {
  id: string; startTime: string; endTime?: string; status: string;
  hourlyRate: number; totalHours?: number; subtotal?: number;
  discountAmount?: number; totalAmount?: number;
  customer: Customer; staff: { id: string; fullName: string };
}

// ── Helpers ────────────────────────────────────────────
function customerTypeVariant(type: string) {
  return type === "MEMBER" ? "purple" as const : "default" as const;
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
// ── Real-time helpers ──────────────────────────────────
function calcElapsedHMS(startTime: string): string {
  const diffMs = Date.now() - new Date(startTime).getTime();
  if (diffMs < 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function calcCurrentCost(startTime: string, hourlyRate: number): number {
  const diffMs = Date.now() - new Date(startTime).getTime();
  if (diffMs < 0) return 0;
  const diffHours = diffMs / (1000 * 60 * 60);
  const raw = diffHours * Number(hourlyRate);
  // Làm tròn lên hàng chục nghìn
  return Math.ceil(raw / 10000) * 10000;
}

// ── Page ───────────────────────────────────────────────
export default function SessionsPage() {
  const { success: notifySuccess, error: notifyError } = useToast();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);

  // ── Check-in modal state ─────────────────────────────
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinStep, setCheckinStep] = useState<1 | 2>(1);
  type CheckinMode = "WALK_IN" | "MEMBER";
  const [checkinMode, setCheckinMode] = useState<CheckinMode>("WALK_IN");
  const [walkInName, setWalkInName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Customer[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberLookupDone, setMemberLookupDone] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ fullName: "", phone: "", type: "MEMBER" as const });
  const [submitting, setSubmitting] = useState(false);

  // ── Checkout picker ──────────────────────────────────
  const [showCheckoutPicker, setShowCheckoutPicker] = useState(false);
  const [quickCheckoutSession, setQuickCheckoutSession] = useState<SessionRow | null>(null);
  const [quickCheckoutPayment, setQuickCheckoutPayment] = useState("CASH");

  // ── Data loading ─────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, activeRes] = await Promise.all([
        fetch(`/api/sessions?status=${tab === "active" ? "ACTIVE" : "COMPLETED"}&limit=30`),
        fetch("/api/sessions?status=ACTIVE&limit=20"),
      ]);
      const [sData, aData] = await Promise.all([sRes.json(), activeRes.json()]);
      setSessions(sData.data || []);
      setActiveSessions(aData.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [tab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  // ── Real-time ticker: re-render mỗi giây để cập nhật đồng hồ + thành tiền ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Open check-in modal ──────────────────────────────
  const openCheckinModal = () => {
    setCheckinStep(1);
    setCheckinMode("WALK_IN");
    setWalkInName("");
    setMemberSearch("");
    setMemberResults([]);
    setMemberLookupDone(false);
    setSelectedMember(null);
    setShowNewMemberForm(false);
    setNewMemberForm({ fullName: "", phone: "", type: "MEMBER" });
    setShowCheckinModal(true);
  };

  // ── Member search ────────────────────────────────────
  const handleMemberSearch = useCallback(async () => {
    const q = memberSearch.trim();
    setSelectedMember(null);
    setMemberResults([]);
    setMemberLookupDone(false);
    if (!q) return;
    setMemberSearchLoading(true);
    try {
      const r = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=5`);
      const d = await r.json();
      if (d.success) { setMemberResults(d.data || []); setMemberLookupDone(true); }
    } catch { /* ignore */ }
    finally { setMemberSearchLoading(false); }
  }, [memberSearch]);

  // ── Step navigation ──────────────────────────────────
  const goToStep2 = () => {
    if (checkinMode === "WALK_IN" && !walkInName.trim()) return;
    if (checkinMode === "MEMBER" && !selectedMember && !showNewMemberForm) return;
    if (checkinMode === "MEMBER" && showNewMemberForm && !newMemberForm.fullName.trim()) return;
    setCheckinStep(2);
  };

  // ── Confirm check-in ─────────────────────────────────
  const handleConfirmCheckin = async () => {
    setSubmitting(true);
    try {
      let customerId: string | undefined;

      if (checkinMode === "WALK_IN") {
        const cRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: walkInName.trim(), type: "WALK_IN" }),
        });
        const cData = await cRes.json();
        if (!cData.success) { notifyError(cData.error); setSubmitting(false); return; }
        customerId = cData.data.id;
      } else if (checkinMode === "MEMBER" && showNewMemberForm) {
        const cRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMemberForm),
        });
        const cData = await cRes.json();
        if (!cData.success) { notifyError(cData.error); setSubmitting(false); return; }
        customerId = cData.data.id;
      } else if (checkinMode === "MEMBER" && selectedMember) {
        customerId = selectedMember.id;
      }

      if (!customerId) { notifyError("Vui lòng chọn hoặc tạo khách hàng"); setSubmitting(false); return; }

      const sRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const sData = await sRes.json();
      if (!sData.success) { notifyError(sData.error); setSubmitting(false); return; }

      notifySuccess("Check-in thành công!");
      setShowCheckinModal(false);
      loadData();
    } catch {
      notifyError("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick checkout ───────────────────────────────────
  const handleQuickCheckout = async () => {
    if (!quickCheckoutSession) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/sessions/${quickCheckoutSession.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: quickCheckoutPayment }),
      });
      const d = await r.json();
      if (d.success) {
        notifySuccess(`Checkout thành công! Tổng: ${formatVND(d.data.grandTotal)}`);
        setQuickCheckoutSession(null);
        setShowCheckoutPicker(false);
        loadData();
      } else { notifyError(d.error); }
    } catch { notifyError("Lỗi kết nối máy chủ"); }
    finally { setSubmitting(false); }
  };

  // ── Detail modal checkout ────────────────────────────
  const handleCheckout = async () => {
    if (!selectedSession) return;
    try {
      const r = await fetch(`/api/sessions/${selectedSession.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
      const d = await r.json();
      if (d.success) {
        notifySuccess(`Checkout thành công! Tổng: ${formatVND(d.data.grandTotal)}`);
        setSelectedSession(null);
        loadData();
      } else { notifyError(d.error); }
    } catch { notifyError("Lỗi kết nối máy chủ"); }
  };

  // ── Summary helpers ──────────────────────────────────
  const summaryCustomerName = () => {
    if (checkinMode === "WALK_IN") return walkInName.trim();
    if (showNewMemberForm) return newMemberForm.fullName.trim();
    if (selectedMember) return selectedMember.fullName;
    return "";
  };
  const summaryCustomerType = () => checkinMode === "WALK_IN" ? "Vãng lai" : "Hội viên";

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
            <Timer size={24} className="text-blue-500" />
            Quản lý phiên bắn
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {activeSessions.length} phiên đang hoạt động
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCheckinModal}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <LogIn size={16} />
            Check-in
          </button>
          <button
            onClick={() => setShowCheckoutPicker(!showCheckoutPicker)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shadow-sm ${
              showCheckoutPicker
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <LogOut size={16} />
            Check-out
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Active Sessions — Card Grid ────────────────── */}
      <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
          <Clock size={18} className="text-emerald-500" />
          Đang hoạt động
          {activeSessions.length > 0 && (
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {activeSessions.length}
            </span>
          )}
        </h3>

        {activeSessions.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center">
            Không có phiên nào đang hoạt động
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                      {s.customer.fullName}
                    </p>
                    <Badge variant={customerTypeVariant(s.customer.type)} size="sm">
                      {s.customer.type === "MEMBER" ? "Hội viên" : "Vãng lai"}
                    </Badge>
                  </div>
                  <Badge variant={sessionStatusVariant(s.status)} size="sm">
                    {sessionStatusLabel(s.status)}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Bắt đầu</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {new Date(s.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đã chơi</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {calcElapsedHMS(s.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đơn giá</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{formatVND(s.hourlyRate)}/h</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1.5 mt-1">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">Thành tiền</span>
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatVND(calcCurrentCost(s.startTime, s.hourlyRate))}
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const r = await fetch(`/api/sessions/${s.id}`);
                    const d = await r.json();
                    if (d.success) setSelectedSession(d.data);
                  }}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Chi tiết
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Checkout Picker ──────────────────────── */}
      {showCheckoutPicker && (
        <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-4 md:p-5 animate-slide-up">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-sm text-zinc-900 dark:text-white">
              <CreditCard size={18} className="text-blue-500" />
              Chọn phiên cần thanh toán
            </h3>
            <button onClick={() => { setShowCheckoutPicker(false); setQuickCheckoutSession(null); }}
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <X size={18} />
            </button>
          </div>

          {activeSessions.length === 0 ? (
            <p className="text-sm text-zinc-500">Không có phiên đang hoạt động.</p>
          ) : quickCheckoutSession ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {quickCheckoutSession.customer.fullName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(quickCheckoutSession.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}Đã chơi: {calcElapsedHMS(quickCheckoutSession.startTime)}
                  </p>
                </div>
                <button onClick={() => setQuickCheckoutSession(null)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Chọn lại
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div>
                  <Label>Phương thức thanh toán</Label>
                  <Select value={quickCheckoutPayment} onChange={(e) => setQuickCheckoutPayment(e.target.value)}>
                    <option value="CASH">Tiền mặt</option>
                    <option value="TRANSFER">Chuyển khoản</option>
                    <option value="CARD">Thẻ</option>
                  </Select>
                </div>
                <button onClick={handleQuickCheckout} disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Đang xử lý..." : "Xác nhận Checkout"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map((s) => (
                <button key={s.id}
                  onClick={() => { setQuickCheckoutSession(s); setQuickCheckoutPayment("CASH"); }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-left transition-all hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-sm">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {s.customer.fullName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(s.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{calcElapsedHMS(s.startTime)}
                    </p>
                  </div>
                  <Badge variant={customerTypeVariant(s.customer.type)} size="sm">
                    {s.customer.type === "MEMBER" ? "HV" : "VL"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Switcher ───────────────────────────────── */}
      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
        {(["active", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {t === "active" ? "Đang chơi" : "Lịch sử"}
          </button>
        ))}
      </div>

      {/* ── Sessions Table ─────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400">Đang tải...</p>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            message={tab === "active" ? "Không có phiên đang chơi" : "Chưa có lịch sử phiên"}
            description={tab === "active" ? "Nhấn Check-in để tạo phiên mới" : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                  <th className="px-4 py-2.5 font-medium text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Khách</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Bắt đầu</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Giá/h</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-white">{s.customer.fullName}</span>
                      <span className="ml-2">
                        <Badge variant={customerTypeVariant(s.customer.type)} size="sm">
                          {s.customer.type === "MEMBER" ? "HV" : "VL"}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                      {new Date(s.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-xs hidden sm:table-cell">
                      {formatVND(s.hourlyRate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sessionStatusVariant(s.status)} size="sm">
                        {sessionStatusLabel(s.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={async () => {
                          const r = await fetch(`/api/sessions/${s.id}`);
                          const d = await r.json();
                          if (d.success) setSelectedSession(d.data);
                        }}
                        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {s.status === "ACTIVE" || s.status === "PAUSED" ? "Chi tiết" : "Xem"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          CHECK-IN MODAL
         ═══════════════════════════════════════════════════ */}
      <Modal
        open={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        size="lg"
        title="Check-in khách mới"
        description={checkinStep === 1 ? "Chọn loại khách hàng" : "Xác nhận thông tin"}
        footer={
          checkinStep === 1 ? (
            <div className="flex justify-end">
              <button
                onClick={goToStep2}
                disabled={
                  (checkinMode === "WALK_IN" && !walkInName.trim()) ||
                  (checkinMode === "MEMBER" && !selectedMember && !showNewMemberForm) ||
                  (checkinMode === "MEMBER" && showNewMemberForm && !newMemberForm.fullName.trim())
                }
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Tiếp tục <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCheckinStep(1)}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                onClick={handleConfirmCheckin}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Đang xử lý..." : <><CheckCircle size={16} /> Xác nhận Check-in</>}
              </button>
            </div>
          )
        }
      >
        {/* ── Step indicators ───────────────────────────── */}
        <div className="mb-4 flex items-center gap-2">
          {([1, 2] as const).map((step) => (
            <div key={step} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  checkinStep > step
                    ? "bg-emerald-500 text-white"
                    : checkinStep === step
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                {checkinStep > step ? <CheckCircle size={14} /> : step}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  checkinStep === step ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                }`}
              >
                {step === 1 ? "Khách hàng" : "Hoàn tất"}
              </span>
              {step < 2 && <div className="hidden sm:block flex-1 h-px bg-zinc-200 dark:bg-zinc-800 mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Choose customer type ──────────────── */}
        {checkinStep === 1 && (
          <div className="space-y-3">
            {/* Walk-in */}
            <div
              onClick={() => { setCheckinMode("WALK_IN"); setShowNewMemberForm(false); }}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                checkinMode === "WALK_IN"
                  ? "border-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                  <Users size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Khách vãng lai</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Khách lẻ, không lưu hồ sơ</p>
                </div>
              </div>
              {checkinMode === "WALK_IN" && (
                <div className="mt-3">
                  <Label required>Tên khách hàng</Label>
                  <Input
                    type="text"
                    placeholder="Nhập tên khách..."
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Member */}
            <div
              onClick={() => setCheckinMode("MEMBER")}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                checkinMode === "MEMBER"
                  ? "border-purple-400 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-500/10"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/20">
                  <Ticket size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">Hội viên</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Tìm hoặc tạo hội viên mới</p>
                </div>
              </div>

              {checkinMode === "MEMBER" && !showNewMemberForm && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Tên, SĐT hoặc mã hội viên..."
                        value={memberSearch}
                        onChange={(e) => { setMemberSearch(e.target.value); setSelectedMember(null); setMemberResults([]); setMemberLookupDone(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMemberSearch(); } }}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2 pl-8 pr-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400"
                      />
                    </div>
                    <button type="button" onClick={handleMemberSearch} disabled={memberSearchLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      {memberSearchLoading ? "..." : "Tìm"}
                    </button>
                  </div>

                  {memberResults.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {memberResults.map((c) => (
                        <button key={c.id} type="button"
                          onClick={() => { setSelectedMember(c); setMemberSearch(c.fullName); setMemberResults([]); }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{c.fullName}</p>
                            <p className="text-xs text-zinc-500">{c.phone || "Chưa có SĐT"}</p>
                          </div>
                          <Badge variant="purple" size="sm">HV</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                  {memberLookupDone && memberResults.length === 0 && (
                    <p className="text-xs text-zinc-500">Không tìm thấy.{" "}
                      <button type="button" onClick={() => setShowNewMemberForm(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline">Tạo mới?</button>
                    </p>
                  )}

                  {selectedMember && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle size={14} />
                      {selectedMember.fullName}
                      {selectedMember.phone ? ` — ${selectedMember.phone}` : ""}
                    </div>
                  )}

                  {!selectedMember && (
                    <button type="button" onClick={() => { setShowNewMemberForm(true); setSelectedMember(null); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      + Tạo hội viên mới
                    </button>
                  )}
                </div>
              )}

              {checkinMode === "MEMBER" && showNewMemberForm && (
                <div className="mt-3 space-y-2 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-3" onClick={(e) => e.stopPropagation()}>
                  <Label required>Họ tên</Label>
                  <Input type="text" placeholder="Họ tên hội viên"
                    value={newMemberForm.fullName}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, fullName: e.target.value })} />
                  <Label>Số điện thoại</Label>
                  <Input type="text" placeholder="Số điện thoại"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })} />
                  <button type="button" onClick={() => setShowNewMemberForm(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                    ← Quay lại tìm hội viên
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Confirm ───────────────────────────── */}
        {checkinStep === 2 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-3 divide-y divide-zinc-200 dark:divide-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Khách hàng</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{summaryCustomerName()}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loại khách</span>
                <Badge variant={checkinMode === "MEMBER" ? "purple" : "default"}>
                  {summaryCustomerType()}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Trạng thái</span>
                <Badge variant="success">Bắt đầu tính giờ</Badge>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════
          SESSION DETAIL MODAL
         ═══════════════════════════════════════════════════ */}
      <Modal
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        size="md"
        title={selectedSession?.customer.fullName ?? "Chi tiết phiên"}
        description={`Phiên bắn · ${selectedSession ? new Date(selectedSession.startTime).toLocaleDateString("vi-VN") : ""}`}
        footer={
          selectedSession?.status === "ACTIVE" || selectedSession?.status === "PAUSED" ? (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleCheckout}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Checkout
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          )
        }
      >
        {selectedSession && (
          <div className="space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Đơn giá" value={formatVND(selectedSession.hourlyRate) + "/h"} />
              <InfoBox label="Trạng thái" value={sessionStatusLabel(selectedSession.status)} />
              <InfoBox label="Bắt đầu" value={new Date(selectedSession.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} />
              <InfoBox label="Loại KH" value={selectedSession.customer.type === "MEMBER" ? "Hội viên" : "Vãng lai"} />
              <InfoBox label="Nhân viên" value={selectedSession.staff.fullName} />
              <InfoBox label="Đã chơi" value={calcElapsedHMS(selectedSession.startTime)} />
            </div>

            {/* Completed info */}
            {selectedSession.status === "COMPLETED" && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-2">
                <Row label="Tổng giờ" value={`${selectedSession.totalHours}h`} />
                <Row label="Tiền giờ" value={formatVND(selectedSession.subtotal || 0)} />
                <Row label="Giảm giá" value={formatVND(selectedSession.discountAmount || 0)} />
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between">
                  <span className="font-semibold text-sm text-zinc-900 dark:text-white">Tổng</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatVND(selectedSession.totalAmount || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}
