"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Timer,
  Users,
  Coffee,
  Percent,
  BarChart3,
  LogOut,
  Menu,
  X,
  Target,
  UserCog,
} from "lucide-react";

interface User {
  userId: string;
  username: string;
  fullName: string;
  role: string;
}

const menuItems = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/sessions", label: "Phiên bắn", Icon: Timer },
  { href: "/customers", label: "Khách hàng", Icon: Users },
  { href: "/staff", label: "Nhân viên", Icon: UserCog },
  { href: "/services", label: "Dịch vụ", Icon: Coffee },
  { href: "/promotions", label: "Khuyến mãi", Icon: Percent },
  { href: "/reports", label: "Báo cáo", Icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push("/login");
        else setUser(d.data);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Close sidebar when navigating (mobile)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { closeSidebar(); }, [pathname, closeSidebar]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <p className="text-zinc-400">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Mobile overlay ──────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-white">
              <Target size={22} className="text-blue-400" />
              QL Trường Cung
            </h1>
            <p className="text-xs text-zinc-500">POS System</p>
          </div>
          <button
            onClick={closeSidebar}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {menuItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const { Icon } = item;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
              <p className="truncate text-xs text-zinc-500">
                {user.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-auto">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <h1 className="flex items-center gap-2 text-base font-bold text-white">
            <Target size={18} className="text-blue-400" />
            QL Trường Cung
          </h1>
          <div className="flex-1" />
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
