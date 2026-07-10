'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, X } from 'lucide-react'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { Sidebar, getVisibleStaffMenuItems } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ToastProvider } from '@/components/ui/toast'

interface User {
  userId: string
  username: string
  fullName: string
  role: string
}

const SIDEBAR_COLLAPSED_KEY = 'qltrungcung_sidebar_collapsed'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === 'true') setSidebarCollapsed(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) router.push('/login')
        else setUser(data.data)
      })
      .catch(() => router.push('/login'))
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileSidebarOpen(false)
  }, [pathname])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Đang tải...</p>
        </div>
      </div>
    )
  }

  const sidebarOffset = sidebarCollapsed ? 'md:ml-[4.5rem]' : 'md:ml-60'
  const menuItems = getVisibleStaffMenuItems(user.role)

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-white dark:bg-zinc-950">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} userRole={user.role} />

          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 animate-fade-in md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          <div
            className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 md:hidden ${
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                  <Image
                    src="/logo.jpg"
                    alt="Victoria Archery Club"
                    width={36}
                    height={36}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-wide text-zinc-900 dark:text-white">
                    VICTORIA
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                    Archery Club
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={X} onClick={() => setMobileSidebarOpen(false)} />
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
              {menuItems.map((item) => {
                const active = item.href === '/sessions'
                  ? pathname === '/sessions' || pathname === '/'
                  : pathname.startsWith(item.href)
                const { Icon } = item
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href)
                      setMobileSidebarOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {user.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={LogOut} onClick={handleLogout} />
              </div>
            </div>
          </div>

          <div className={`flex min-w-0 flex-1 flex-col pb-16 transition-all duration-200 md:pb-0 ${sidebarOffset}`}>
            <Header
              userFullName={user.fullName}
              userRole={user.role}
              onMenuClick={() => setMobileSidebarOpen(true)}
              onLogout={handleLogout}
            />
            <main className="flex-1">{children}</main>
          </div>

          <BottomNav />
        </div>
      </ToastProvider>
    </ThemeProvider>
  )
}
