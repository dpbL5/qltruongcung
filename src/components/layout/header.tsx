"use client";

// ── Header — top bar with user info + actions ───────────
// Shown on mobile. On desktop user info is in sidebar footer.

import Image from 'next/image'
import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  userFullName: string;
  userRole: string;
  onMenuClick: () => void;
  onLogout: () => void;
}

export function Header({ userFullName, userRole, onMenuClick, onLogout }: HeaderProps) {
  const roleLabel = userRole === "ADMIN" ? "Quản trị viên" : "Nhân viên";
  const initial = userFullName.charAt(0).toUpperCase();

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-2.5">
      <Button variant="ghost" size="sm" icon={Menu} onClick={onMenuClick} />

      <div className="flex items-center gap-2">
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white p-0.5 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
          <Image
            src="/logo.jpg"
            alt="Victoria Archery Club"
            width={28}
            height={28}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-bold tracking-wide text-zinc-900 dark:text-white">
            VICTORIA
          </h1>
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
            Archery
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {initial}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-zinc-900 dark:text-white leading-tight">
              {userFullName}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
              {roleLabel}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={LogOut} onClick={onLogout} title="Đăng xuất" />
      </div>
    </header>
  );
}
