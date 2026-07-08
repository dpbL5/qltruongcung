"use client";

// ── Sidebar — desktop navigation ────────────────────────
// Fixed sidebar for tablet/desktop (≥768px)

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Timer,
  Users,
  BarChart3,
  Settings,
  Target,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useState } from "react";

// ── Types ──────────────────────────────────────────────
interface MenuItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/sessions", label: "Phiên bắn", Icon: Timer },
  { href: "/customers", label: "Khách hàng", Icon: Users },
  { href: "/reports", label: "Báo cáo", Icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", Icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname]
  );

  return (
    <aside
      className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-all duration-200 ${
        collapsed ? "w-[4.5rem]" : "w-60"
      }`}
    >
      {/* Brand */}
      <div
        className={`flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 ${
          collapsed ? "justify-center" : "gap-3"
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Target size={20} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight text-zinc-900 dark:text-white truncate">
              QL Trường Cung
            </h1>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
              POS System
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          const { Icon } = item;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center px-2" : ""
              } ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
