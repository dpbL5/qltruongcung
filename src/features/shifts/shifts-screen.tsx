'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  RefreshCw,
  UserMinus,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterButton } from '@/components/ui/filter-button'
import { Input, Label, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { NoticeCard } from '@/components/ui/notice-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { apiJson } from '@/features/pos/api'
import { formatClock, formatDay, money, toNumber } from '@/features/pos/format'
import type { ShiftParticipantRole, UserRole, UserSession } from '@/features/pos/types'

type ShiftStatusFilter = 'ALL' | 'OPEN' | 'CLOSED'

interface UserRow {
  id: string
  username: string
  fullName: string
  role: UserRole
  isActive: boolean
}

interface ShiftParticipantRow {
  id: string
  role: ShiftParticipantRole
  joinedAt: string
  leftAt?: string | null
  staffId: string
  staff: {
    id: string
    username?: string
    fullName: string
    role?: UserRole
    isActive?: boolean
  }
}

interface ShiftRow {
  id: string
  staffId: string
  staff?: { id: string; fullName: string }
  openedAt: string
  closedAt?: string | null
  openingCash: number | string
  closingCash?: number | string | null
  expectedCash?: number | string | null
  cashDifference?: number | string | null
  status: 'OPEN' | 'CLOSED'
  notes?: string | null
  participants?: ShiftParticipantRow[]
  _count?: {
    sessions: number
    payments: number
    membershipPayments: number
  }
}

export function ShiftsScreen() {
  const { success: notifySuccess, error: notifyError } = useToast()
  const [user, setUser] = useState<UserSession | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [manageShift, setManageShift] = useState<ShiftRow | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const me = await apiJson<UserSession>('/api/auth/me')
      if (!me.success || !me.data) throw new Error(me.error || 'Không tải được tài khoản')

      const params = new URLSearchParams({
        includeParticipants: 'all',
        limit: '100',
      })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const [shiftData, userData] = await Promise.all([
        apiJson<ShiftRow[]>(`/api/shifts?${params.toString()}`),
        me.data.role === 'ADMIN'
          ? apiJson<UserRow[]>('/api/users')
          : Promise.resolve({ success: true, data: [] as UserRow[], error: undefined }),
      ])

      if (!shiftData.success) throw new Error(shiftData.error || 'Không tải được ca làm')
      if (!userData.success) throw new Error(userData.error || 'Không tải được nhân viên')

      setUser(me.data)
      setShifts(shiftData.data ?? [])
      setUsers((userData.data ?? []).filter((item) => item.isActive))
    } catch (err) {
      setError((err as Error).message || 'Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData])

  const isAdmin = user?.role === 'ADMIN'
  const visibleShifts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return shifts

    return shifts.filter((shift) => {
      const names = [
        shift.staff?.fullName,
        ...(shift.participants ?? []).map((participant) => participant.staff.fullName),
      ]

      return names.some((name) => name?.toLowerCase().includes(keyword))
        || shift.id.toLowerCase().includes(keyword)
    })
  }, [searchQuery, shifts])

  const stats = useMemo(() => {
    const open = shifts.filter((shift) => shift.status === 'OPEN').length
    const closed = shifts.filter((shift) => shift.status === 'CLOSED').length
    const activeParticipants = shifts
      .filter((shift) => shift.status === 'OPEN')
      .flatMap((shift) => shift.participants ?? [])
      .filter((participant) => !participant.leftAt).length

    return {
      total: shifts.length,
      open,
      closed,
      activeParticipants,
    }
  }, [shifts])

  const replaceShift = (updated: ShiftRow) => {
    setShifts((current) => current.map((shift) => (
      shift.id === updated.id ? updated : shift
    )))
    setManageShift((current) => (current?.id === updated.id ? updated : current))
  }

  const upsertParticipant = async (
    shift: ShiftRow,
    staffId: string,
    role: ShiftParticipantRole
  ) => {
    setSubmitting(true)
    try {
      const data = await apiJson<ShiftRow>(
        `/api/shifts/${shift.id}/participants`,
        jsonRequest('POST', { staffId, role })
      )
      if (!data.success || !data.data) {
        notifyError(data.error || 'Không cập nhật được nhân viên trong ca')
        return
      }

      replaceShift(data.data)
      notifySuccess('Đã cập nhật nhân viên trong ca')
    } catch {
      notifyError('Lỗi kết nối máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  const removeParticipant = async (shift: ShiftRow, staffId: string) => {
    setSubmitting(true)
    try {
      const data = await apiJson<ShiftRow>(
        `/api/shifts/${shift.id}/participants`,
        jsonRequest('DELETE', { staffId })
      )
      if (!data.success || !data.data) {
        notifyError(data.error || 'Không xoá được nhân viên khỏi ca')
        return
      }

      replaceShift(data.data)
      notifySuccess('Đã cho nhân viên rời ca')
    } catch {
      notifyError('Lỗi kết nối máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <ShiftsSkeleton />
  }

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-4 dark:bg-zinc-950 md:px-6 md:py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Quản lý ca
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-zinc-950 dark:text-white">
              <CalendarClock size={24} className="text-blue-500" />
              Ca làm
            </h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => void loadData()}
            title="Làm mới"
          />
        </header>

        {error && (
          <NoticeCard
            tone="danger"
            title="Không tải được dữ liệu"
            description={error}
          />
        )}

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ShiftStat label="Tổng ca" value={stats.total} />
          <ShiftStat label="Đang mở" value={stats.open} tone="success" />
          <ShiftStat label="Đã đóng" value={stats.closed} />
          <ShiftStat label="Nhân viên trong ca" value={stats.activeParticipants} tone="blue" />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Label htmlFor="shift-search">Tìm ca làm</Label>
              <div className="flex gap-2">
                <Input
                  id="shift-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setSearchQuery(searchInput)
                    }
                  }}
                  placeholder="Tên nhân viên hoặc mã ca"
                />
                <Button variant="secondary" onClick={() => setSearchQuery(searchInput)}>
                  Tìm
                </Button>
              </div>
            </div>
            <Link href="/sessions">
              <Button variant="inverse" icon={ArrowRight}>
                Mở ca hôm nay
              </Button>
            </Link>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
              Tất cả
            </FilterButton>
            <FilterButton active={statusFilter === 'OPEN'} onClick={() => setStatusFilter('OPEN')}>
              Đang mở
            </FilterButton>
            <FilterButton active={statusFilter === 'CLOSED'} onClick={() => setStatusFilter('CLOSED')}>
              Đã đóng
            </FilterButton>
          </div>
        </section>

        <section className="space-y-3">
          {visibleShifts.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <EmptyState
                icon={History}
                message="Chưa có ca làm"
                description="Mở ca ở màn Ca hôm nay để bắt đầu ghi nhận lịch sử."
              />
            </div>
          ) : (
            visibleShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                canManageParticipants={!!isAdmin && shift.status === 'OPEN'}
                submitting={submitting}
                onManage={() => setManageShift(shift)}
                onRoleChange={(participant, role) => (
                  upsertParticipant(shift, participant.staffId, role)
                )}
                onRemove={(participant) => removeParticipant(shift, participant.staffId)}
              />
            ))
          )}
        </section>
      </div>

      <ManageParticipantsDialog
        shift={manageShift}
        users={users}
        submitting={submitting}
        onClose={() => setManageShift(null)}
        onSubmit={upsertParticipant}
      />
    </div>
  )
}

function ShiftCard({
  shift,
  canManageParticipants,
  submitting,
  onManage,
  onRoleChange,
  onRemove,
}: {
  shift: ShiftRow
  canManageParticipants: boolean
  submitting: boolean
  onManage: () => void
  onRoleChange: (participant: ShiftParticipantRow, role: ShiftParticipantRole) => void
  onRemove: (participant: ShiftParticipantRow) => void
}) {
  const activeParticipants = (shift.participants ?? []).filter((participant) => !participant.leftAt)
  const pastParticipants = (shift.participants ?? []).filter((participant) => participant.leftAt)
  const duration = formatShiftDuration(shift.openedAt, shift.closedAt)

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-[6px_1fr]">
        <div className={shift.status === 'OPEN' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'} />
        <div className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={shift.status === 'OPEN' ? 'success' : 'default'}>
                  {shift.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                </Badge>
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  Ca {formatDay(shift.openedAt)}
                </h2>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} />
                  {formatClock(shift.openedAt)}
                  {shift.closedAt ? ` - ${formatClock(shift.closedAt)}` : ''}
                </span>
                <span>{duration}</span>
                <span>Mở bởi {shift.staff?.fullName ?? 'Không rõ'}</span>
              </p>
            </div>

            {canManageParticipants && (
              <Button variant="secondary" size="sm" icon={UserRoundPlus} onClick={onManage}>
                Thêm nhân viên
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            <MoneyMetric label="Tiền đầu ca" value={shift.openingCash} />
            <MoneyMetric label="Tiền dự kiến" value={shift.expectedCash} />
            <MoneyMetric label="Tiền cuối ca" value={shift.closingCash} />
            <MoneyMetric
              label="Chênh lệch"
              value={shift.cashDifference}
              warning={toNumber(shift.cashDifference) !== 0}
            />
            <MiniMetric label="Giao dịch" value={String((shift._count?.payments ?? 0) + (shift._count?.membershipPayments ?? 0))} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
                <Users size={16} className="text-zinc-400" />
                Nhân viên trong ca
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {activeParticipants.length} đang tham gia
              </span>
            </div>

            {activeParticipants.length === 0 ? (
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                Không còn nhân viên đang tham gia ca này.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {activeParticipants.map((participant) => (
                  <ParticipantPill
                    key={participant.id}
                    participant={participant}
                    canManage={canManageParticipants}
                    submitting={submitting}
                    onRoleChange={onRoleChange}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            )}

            {pastParticipants.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {pastParticipants.length} nhân viên đã rời ca
                </summary>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {pastParticipants.map((participant) => (
                    <ParticipantPill
                      key={participant.id}
                      participant={participant}
                      canManage={false}
                      submitting={submitting}
                      onRoleChange={onRoleChange}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function ParticipantPill({
  participant,
  canManage,
  submitting,
  onRoleChange,
  onRemove,
}: {
  participant: ShiftParticipantRow
  canManage: boolean
  submitting: boolean
  onRoleChange: (participant: ShiftParticipantRow, role: ShiftParticipantRole) => void
  onRemove: (participant: ShiftParticipantRow) => void
}) {
  const active = !participant.leftAt
  const nextRole: ShiftParticipantRole = participant.role === 'LEAD' ? 'STAFF' : 'LEAD'

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
            {participant.staff.fullName}
          </p>
          <Badge variant={participant.role === 'LEAD' ? 'purple' : 'default'} size="sm">
            {shiftRoleLabel(participant.role)}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Vào {formatClock(participant.joinedAt)}
          {participant.leftAt ? ` · Rời ${formatClock(participant.leftAt)}` : ''}
        </p>
      </div>

      {canManage && active && (
        <div className="flex shrink-0 gap-1.5">
          <Button
            variant="secondary"
            size="xs"
            icon={CheckCircle2}
            disabled={submitting}
            onClick={() => onRoleChange(participant, nextRole)}
            title={participant.role === 'LEAD' ? 'Chuyển thành nhân viên' : 'Chuyển thành trưởng ca'}
          />
          <Button
            variant="outline-danger"
            size="xs"
            icon={UserMinus}
            disabled={submitting}
            onClick={() => onRemove(participant)}
            title="Cho rời ca"
          />
        </div>
      )}
    </div>
  )
}

function ManageParticipantsDialog({
  shift,
  users,
  submitting,
  onClose,
  onSubmit,
}: {
  shift: ShiftRow | null
  users: UserRow[]
  submitting: boolean
  onClose: () => void
  onSubmit: (shift: ShiftRow, staffId: string, role: ShiftParticipantRole) => Promise<void>
}) {
  const [staffId, setStaffId] = useState('')
  const [role, setRole] = useState<ShiftParticipantRole>('STAFF')

  useEffect(() => {
    if (!shift) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setStaffId('')
    setRole('STAFF')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [shift])

  const availableUsers = users.filter((user) => user.isActive)

  const handleSubmit = async () => {
    if (!shift || !staffId) return
    await onSubmit(shift, staffId, role)
  }

  return (
    <Modal
      open={!!shift}
      onClose={onClose}
      title="Quản lý nhân viên trong ca"
      description={shift ? `Ca mở lúc ${formatClock(shift.openedAt)} ngày ${formatDay(shift.openedAt)}` : undefined}
      footer={
        <Button
          variant="inverse"
          size="lg"
          fullWidth
          disabled={submitting || !staffId}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Đang cập nhật...' : 'Thêm hoặc cập nhật'}
        </Button>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="shift-staff" required>Nhân viên</Label>
          <Select
            id="shift-staff"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Chọn nhân viên</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} · {user.username}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="shift-role">Vai trò trong ca</Label>
          <Select
            id="shift-role"
            value={role}
            onChange={(event) => setRole(event.target.value as ShiftParticipantRole)}
          >
            <option value="STAFF">Nhân viên</option>
            <option value="LEAD">Trưởng ca</option>
          </Select>
        </div>
      </div>
    </Modal>
  )
}

function ShiftStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'success' | 'blue' | 'default'
}) {
  const valueClass = tone === 'success'
    ? 'text-emerald-600 dark:text-emerald-300'
    : tone === 'blue'
      ? 'text-blue-600 dark:text-blue-300'
      : 'text-zinc-950 dark:text-white'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  )
}

function MoneyMetric({
  label,
  value,
  warning,
}: {
  label: string
  value: number | string | null | undefined
  warning?: boolean
}) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${
        warning ? 'text-amber-600 dark:text-amber-300' : 'text-zinc-950 dark:text-white'
      }`}
      >
        {money(value ?? 0)}
      </p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function ShiftsSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-10 w-36" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function jsonRequest(method: 'POST' | 'DELETE', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function formatShiftDuration(openedAt: string, closedAt?: string | null): string {
  const start = new Date(openedAt).getTime()
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()
  const totalMinutes = Math.max(0, Math.round((end - start) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} phút`
  if (minutes === 0) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

function shiftRoleLabel(role: ShiftParticipantRole): string {
  return role === 'LEAD' ? 'Trưởng ca' : 'Nhân viên'
}
