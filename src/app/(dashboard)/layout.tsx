"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { ToastProvider } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────────────
interface User {
  userId: string;
  username: string;
  fullName: string;
  role: string;
}

// ── Sidebar local storage key ──────────────────────────
const SIDEBAR_COLLAPSED_KEY = "qltrungcung_sidebar_collapsed";

// ── Layout Component ───────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Restore sidebar state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setSidebarCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) router.push("/login");
        else setUser(d.data);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // ── Loading state ────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  const sidebarOffset = sidebarCollapsed ? "md:ml-[4.5rem]" : "md:ml-60";

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-white dark:bg-zinc-950">
          {/* ── Desktop Sidebar ─────────────────────────── */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
          />

          {/* ── Mobile Sidebar Overlay ──────────────────── */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
          <div
            className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-transform duration-200 md:hidden ${
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <span className="text-sm font-bold">Q</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">QL Trường Cung</p>
                  <p className="text-[10px] text-zinc-400">POS System</p>
                </div>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {[
                { href: "/", label: "Dashboard" },
                { href: "/sessions", label: "Phiên bắn" },
                { href: "/customers", label: "Khách hàng" },
                { href: "/reports", label: "Báo cáo" },
                { href: "/settings", label: "Cài đặt" },
              ].map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMobileSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                        : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {user.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Content Area ────────────────────────── */}
          <div className={`flex min-w-0 flex-1 flex-col ${sidebarOffset} transition-all duration-200 pb-16 md:pb-0`}>
            {/* ── Mobile Header ──────────────────────────── */}
            <Header
              userFullName={user.fullName}
              userRole={user.role}
              onMenuClick={() => setMobileSidebarOpen(true)}
              onLogout={handleLogout}
            />

            {/* ── Page Content ───────────────────────────── */}
            <main className="flex-1">{children}</main>
          </div>

          {/* ── Mobile Bottom Nav ────────────────────────── */}
          <BottomNav />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
