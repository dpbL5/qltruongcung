"use client";

// ── Bottom Navigation — mobile POS tab bar ──────────────
// 5-tab bottom nav for phone screens (<768px)
// Staff use this for quick access to check-in, sessions, etc.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Timer,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/sessions", label: "Phiên bắn", Icon: Timer },
  { href: "/customers", label: "Khách", Icon: Users },
  { href: "/reports", label: "Báo cáo", Icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", Icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const { Icon } = item;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 transition-colors ${
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <div
                className={`relative flex items-center justify-center rounded-lg p-1 transition-colors ${
                  active
                    ? "bg-blue-50 dark:bg-blue-500/15"
                    : ""
                }`}
              >
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
