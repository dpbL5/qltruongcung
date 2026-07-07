"use client";

// ── Quản lý Nhân viên & Ca làm ──────────────────────────
import { useCallback, useEffect, useState } from "react";
import { UserCog, Plus, Key, X, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingDots } from "@/components/ui/loading-dots";
import { ShiftControl } from "@/components/ui/shift-control";

// ── Local types ─────────────────────────────────────────
interface UserRow {
  id: string; username: string; fullName: string; role: string;
  isActive: boolean; createdAt: string;
}
interface ShiftRow {
  id: string; startTime: string; endTime?: string | null; status: string;
  notes?: string | null; user: { id: string; fullName: string };
}

// ── Page ────────────────────────────────────────────────
export default function StaffPage() {
  const [role, setRole] = useState<string>("");
  const initialTab = role === "ADMIN" ? "staff" : "shifts";
  const [tab, setTab] = useState<"staff" | "shifts">(initialTab);

  // Load current user role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRole(d.data.role);
          if (d.data.role !== "ADMIN") {
            setTab("shifts");
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-4 md:mb-6 flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
        <UserCog size={24} className="text-blue-400" />
        Nhân viên
      </h2>

      {/* ── Shift Control (cho staff) ───────────────────── */}
      {role === "STAFF" && (
        <div className="mb-6 max-w-md">
          <ShiftControl />
        </div>
      )}

      {/* ── Tab ──────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2">
        {role === "ADMIN" && (
          <button
            onClick={() => setTab("staff")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "staff" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Danh sách nhân viên
          </button>
        )}
        <button
          onClick={() => setTab("shifts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "shifts" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Ca làm
        </button>
      </div>

      {tab === "staff" ? <StaffTab /> : <ShiftsTab role={role} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── Staff Tab (Admin only) ────────────────────────────────
// ═══════════════════════════════════════════════════════════
function StaffTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "STAFF" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/users");
      const d = await r.json();
      if (d.success) setUsers(d.data);
      else setError(d.error);
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // ── Create user ────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        setFeedback({ type: "success", message: "Đã tạo nhân viên mới!" });
        setShowCreate(false);
        setForm({ username: "", password: "", fullName: "", role: "STAFF" });
        load();
      } else {
        setFeedback({ type: "error", message: d.error });
      }
    } catch {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────
  const handleToggleActive = async (user: UserRow) => {
    try {
      const r = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const d = await r.json();
      if (d.success) load();
      else alert(d.error);
    } catch {
      alert("Lỗi kết nối máy chủ");
    }
  };

  // ── Reset password ─────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const d = await r.json();
      if (d.success) {
        setFeedback({ type: "success", message: `Đã đổi mật khẩu cho ${resetTarget.fullName}` });
        setResetTarget(null);
        setNewPassword("");
      } else {
        alert(d.error);
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingDots />;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <div>
      {/* ── Header + Create Button ──────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">{users.length} nhân viên</p>
        <button
          onClick={() => { setShowCreate(!showCreate); setFeedback(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Thêm nhân viên
        </button>
      </div>

      {/* ── Feedback ────────────────────────────────────── */}
      {feedback && (
        <div className={`mb-3 rounded-lg px-4 py-2 text-sm ${
          feedback.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
        }`}>
          {feedback.message}
        </div>
      )}

      {/* ── Create Form ─────────────────────────────────── */}
      {showCreate && (
        <div className="mb-4 rounded-xl border border-blue-500/30 bg-zinc-900 p-5">
          <h3 className="mb-3 flex items-center gap-1.5 font-semibold text-white">
            <Plus size={18} />
            Tạo nhân viên mới
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs text-zinc-400">Họ tên *</label>
              <input
                type="text" required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="mb-1 block text-xs text-zinc-400">Tên đăng nhập *</label>
              <input
                type="text" required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                placeholder="nva"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="mb-1 block text-xs text-zinc-400">Mật khẩu *</label>
              <input
                type="password" required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Vai trò</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              >
                <option value="STAFF">Nhân viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </div>
            <button
              type="submit" disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Đang tạo..." : "Tạo"}
            </button>
            <button
              type="button" onClick={() => setShowCreate(false)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Huỷ
            </button>
          </form>
        </div>
      )}

      {/* ── Users Table ─────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
        {users.length === 0 ? (
          <EmptyState message="Chưa có nhân viên nào" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-2 font-medium">Họ tên</th>
                <th className="px-4 py-2 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-2 font-medium">Vai trò</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium">Ngày tạo</th>
                <th className="px-4 py-2 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-white">{u.fullName}</td>
                  <td className="px-4 py-3 text-zinc-400">{u.username}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "ADMIN" ? "purple" : "default"}>
                      {u.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? "success" : "danger"}>
                      {u.isActive ? "Đang làm" : "Đã nghỉ"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResetTarget(u)}
                        className="rounded-lg bg-zinc-700 p-2 text-white hover:bg-zinc-600 transition-colors min-h-[40px] min-w-[40px]"
                        title="Đổi mật khẩu"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`rounded-lg p-2 text-white transition-colors min-h-[40px] min-w-[40px] ${
                          u.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                        }`}
                        title={u.isActive ? "Vô hiệu hoá" : "Kích hoạt"}
                      >
                        {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Reset Password Modal ────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setResetTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Đổi mật khẩu</h3>
              <button onClick={() => setResetTarget(null)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="mb-3 text-sm text-zinc-400">
              Đổi mật khẩu cho <span className="text-white font-medium">{resetTarget.fullName}</span>
            </p>
            <input
              type="password"
              placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResetTarget(null)}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleResetPassword}
                disabled={submitting || newPassword.length < 6}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Đang xử lý..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── Shifts Tab ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function ShiftsTab({ role }: { role: string }) {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("");
  const [staffList, setStaffList] = useState<UserRow[]>([]);
  const [filterUserId, setFilterUserId] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  // Pagination

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterStatus) params.set("status", filterStatus);
      if (filterUserId) params.set("userId", filterUserId);
      params.set("page", String(pagination.page));
      params.set("limit", "20");

      const r = await fetch(`/api/shifts?${params}`);
      const d = await r.json();
      if (d.success) {
        setShifts(d.data);
        setPagination(d.pagination);
      } else {
        setLoadError(d.error);
      }
    } catch {
      setLoadError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus, filterUserId, pagination.page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Load staff list for admin filter
  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStaffList(d.data); })
      .catch(() => {});
  }, [role]);

  return (
    <div>
      {/* ── Shift Control (cho admin) ──────────────────── */}
      {role === "ADMIN" && (
        <div className="mb-4 max-w-md">
          <ShiftControl />
        </div>
      )}

      {/* ── Filters ────────────────────────────────────── */}
      <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-zinc-400">Ngày</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPagination({ ...pagination, page: 1 }); }}
            className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-xs text-zinc-400">Trạng thái</label>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPagination({ ...pagination, page: 1 }); }}
            className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang làm</option>
            <option value="COMPLETED">Đã kết thúc</option>
          </select>
        </div>
        {role === "ADMIN" && (
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-xs text-zinc-400">Nhân viên</label>
            <select
              value={filterUserId}
              onChange={(e) => { setFilterUserId(e.target.value); setPagination({ ...pagination, page: 1 }); }}
              className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            >
              <option value="">Tất cả</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => setFilterDate("")}
          className="rounded-lg bg-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white transition-colors"
        >
          Xoá lọc
        </button>
      </div>

      {/* ── Shifts Table ────────────────────────────────── */}
      {loadError && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {loadError}
        </div>
      )}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-zinc-500">Đang tải...</div>
        ) : shifts.length === 0 ? (
          <EmptyState message="Không có ca làm nào" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                {role === "ADMIN" && <th className="px-4 py-2 font-medium">Nhân viên</th>}
                <th className="px-4 py-2 font-medium">Bắt đầu</th>
                <th className="px-4 py-2 font-medium">Kết thúc</th>
                <th className="px-4 py-2 font-medium">Thời gian</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const start = new Date(s.startTime);
                const end = s.endTime ? new Date(s.endTime) : null;
                const duration = s.endTime
                  ? ((new Date(s.endTime).getTime() - start.getTime()) / (1000 * 60 * 60))
                  : null;
                const h = duration != null ? Math.floor(duration) : 0;
                const m = duration != null ? Math.round((duration - h) * 60) : 0;

                return (
                  <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    {role === "ADMIN" && (
                      <td className="px-4 py-3 font-medium text-white">{s.user.fullName}</td>
                    )}
                    <td className="px-4 py-3 text-zinc-400">{start.toLocaleTimeString("vi-VN")}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {end ? end.toLocaleTimeString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {s.endTime
                        ? (h > 0 ? `${h}h` : "") + (m > 0 ? `${m}p` : (h === 0 ? "<1p" : ""))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "ACTIVE" ? "success" : "default"}>
                        {s.status === "ACTIVE" ? "Đang làm" : "Đã kết thúc"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate">
                      {s.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-zinc-400">
          <span>{pagination.total} ca làm</span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              Trước
            </button>
            <span className="px-2 py-1">{pagination.page} / {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
