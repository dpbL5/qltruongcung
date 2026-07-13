'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Header } from '@/components/layout/header'
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
  const [user, setUser] = useState<User | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (stored === 'true') setSidebarCollapsed(true)
      } catch {
        // ignore
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
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

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-white dark:bg-zinc-950">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} userRole={user.role} />

          <div className={`flex min-w-0 flex-1 flex-col pb-16 transition-all duration-200 md:pb-0 ${sidebarOffset}`}>
            <Header
              userFullName={user.fullName}
              userRole={user.role}
            />
            <main className="flex-1">{children}</main>
          </div>

          <BottomNav />
        </div>
      </ToastProvider>
    </ThemeProvider>
  )
}
