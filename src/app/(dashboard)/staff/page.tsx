"use client";

// ── Quản lý Nhân viên ──────────────────────────────────
import { useCallback, useEffect, useState } from "react";
import { UserCog, Plus, Key, X, UserCheck, UserX, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingDots } from "@/components/ui/loading-dots";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// ── Local types ─────────────────────────────────────────
interface UserRow {
  id: string; username: string; fullName: string; role: string;
  isActive: boolean; createdAt: string;
}

// ── Page ────────────────────────────────────────────────
export default function StaffPage() {
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setRole(d.data.role); })
      .catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <h2 className="mb-4 md:mb-6 flex items-center gap-2 text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
        <UserCog size={24} className="text-blue-500" />
        Nhân viên
      </h2>

      {role === "ADMIN" ? <StaffTab /> : (
        <EmptyState message="Bạn không có quyền quản lý nhân viên" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ── Staff Tab (Admin only) ────────────────────────────────
// ═══════════════════════════════════════════════════════════
function StaffTab() {
  const { success: notifySuccess, error: notifyError } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "STAFF" });
  const [submitting, setSubmitting] = useState(false);

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
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        notifySuccess("Đã tạo nhân viên mới!");
        setShowCreate(false);
        setForm({ username: "", password: "", fullName: "", role: "STAFF" });
        load();
      } else { notifyError(d.error); }
    } catch { notifyError("Lỗi kết nối máy chủ"); }
    finally { setSubmitting(false); }
  };

  const handleToggleActive = async (user: UserRow) => {
    try {
      const r = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const d = await r.json();
      if (d.success) {
        notifySuccess(user.isActive ? "Đã vô hiệu hoá nhân viên" : "Đã kích hoạt nhân viên");
        load();
      } else { notifyError(d.error); }
    } catch { notifyError("Lỗi kết nối máy chủ"); }
  };

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
        notifySuccess(`Đã đổi mật khẩu cho ${resetTarget.fullName}`);
        setResetTarget(null);
        setNewPassword("");
      } else { notifyError(d.error); }
    } catch { notifyError("Lỗi kết nối máy chủ"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingDots />;
  if (error) return (
    <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
      {error}
    </div>
  );

  return (
    <div>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{users.length} nhân viên</p>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Thêm nhân viên
          </button>
        </div>
      </div>

      {/* ── Create Form ─────────────────────────────────── */}
      {showCreate && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-5 animate-slide-up">
          <h3 className="mb-3 flex items-center gap-1.5 font-semibold text-sm text-zinc-900 dark:text-white">
            <Plus size={16} className="text-blue-500" />
            Tạo nhân viên mới
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
            <div className="w-full sm:w-40">
              <Label required>Họ tên</Label>
              <Input type="text" required placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="w-full sm:w-32">
              <Label required>Tên đăng nhập</Label>
              <Input type="text" required placeholder="nva"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="w-full sm:w-32">
              <Label required>Mật khẩu</Label>
              <Input type="password" required placeholder="••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Vai trò</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="STAFF">Nhân viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </Select>
            </div>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {submitting ? "Đang tạo..." : "Tạo"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              Huỷ
            </button>
          </form>
        </div>
      )}

      {/* ── Users Table ─────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {users.length === 0 ? (
          <EmptyState message="Chưa có nhân viên nào" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Họ tên</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tên ĐN</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vai trò</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">Ngày tạo</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{u.fullName}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs font-mono">{u.username}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "ADMIN" ? "purple" : "default"} size="sm">
                        {u.role === "ADMIN" ? "Admin" : "NV"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"} size="sm">
                        {u.isActive ? "Đang làm" : "Đã nghỉ"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setResetTarget(u)}
                          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          title="Đổi mật khẩu"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`rounded-lg p-2 text-white transition-colors ${
                            u.isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
                          }`}
                          title={u.isActive ? "Vô hiệu hoá" : "Kích hoạt"}
                        >
                          {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reset Password Modal ────────────────────────── */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        size="sm"
        title="Đổi mật khẩu"
        description={`Đổi mật khẩu cho ${resetTarget?.fullName ?? ""}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setResetTarget(null)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
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
        }
      >
        <Label required>Mật khẩu mới</Label>
        <Input
          type="password"
          placeholder="Ít nhất 6 ký tự"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {newPassword.length > 0 && newPassword.length < 6 && (
          <p className="mt-1 text-xs text-red-500">Mật khẩu phải có ít nhất 6 ký tự</p>
        )}
      </Modal>
    </div>
  );
}
