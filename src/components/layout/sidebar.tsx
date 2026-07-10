'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Banknote,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Package,
  Settings,
  ShieldCheck,
  Target,
  Timer,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface MenuItem {
  href: string
  label: string
  Icon: LucideIcon
  adminOnly?: boolean
}

export const staffMenuItems: MenuItem[] = [
  { href: '/sessions', label: 'Ca hôm nay', Icon: Timer },
  { href: '/shifts', label: 'Ca làm', Icon: CalendarClock },
  { href: '/customers', label: 'Hội viên', Icon: ShieldCheck },
  { href: '/inventory', label: 'Kho', Icon: Package },
  { href: '/pricing', label: 'Bảng giá', Icon: Banknote, adminOnly: true },
  { href: '/reports', label: 'Báo cáo', Icon: BarChart3 },
  { href: '/staff', label: 'Nhân viên', Icon: UserCog, adminOnly: true },
  { href: '/settings', label: 'Cài đặt', Icon: Settings },
]

export function getVisibleStaffMenuItems(userRole?: string): MenuItem[] {
  return staffMenuItems.filter((item) => !item.adminOnly || userRole === 'ADMIN')
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  userRole?: string
}

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname()
  const menuItems = getVisibleStaffMenuItems(userRole)

  const isActive = useCallback(
    (href: string) =>
      href === '/sessions'
        ? pathname === '/sessions' || pathname === '/'
        : pathname.startsWith(href),
    [pathname]
  )

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-zinc-200 bg-white transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 md:flex ${
        collapsed ? 'w-[4.5rem]' : 'w-60'
      }`}
    >
      <div
        className={`flex items-center border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 ${
          collapsed ? 'justify-center' : 'gap-3'
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Target size={20} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-zinc-900 dark:text-white">
              QL Trường Cung
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              POS vận hành
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {menuItems.map((item) => {
          const active = isActive(item.href)
          const { Icon } = item
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                collapsed ? 'justify-center px-2' : ''
              } ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <Button variant="ghost" size="sm" icon={collapsed ? ChevronRight : ChevronLeft} onClick={onToggle} title={collapsed ? 'Mở rộng' : 'Thu gọn'} />
      </div>
    </aside>
  )
}
