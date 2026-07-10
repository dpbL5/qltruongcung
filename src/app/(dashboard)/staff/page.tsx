'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  History,
  Key,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Label, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { NoticeCard } from '@/components/ui/notice-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { apiJson } from '@/features/pos/api'
import type { UserSession } from '@/features/pos/types'
import type { UserRole } from '@/types'

interface UserRow {
  id: string
  username: string
  fullName: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

interface ActivityLogRow {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  details: unknown
  createdAt: string
  user: {
    id: string
    username: string
    fullName: string
    role: UserRole
  }
}

type StaffTabId = 'accounts' | 'logs'

const emptyCreateForm = {
  username: '',
  password: '',
  fullName: '',
  role: 'STAFF' as UserRole,
}

const actionLabels: Record<string, string> = {
  USER_CREATE: 'Tạo tài khoản',
  USER_UPDATE: 'Cập nhật tài khoản',
  USER_PASSWORD_RESET: 'Đổi mật khẩu',
  SESSION_CHECK_IN: 'Check-in',
  SESSION_CHECK_OUT: 'Checkout',
  SESSION_CANCEL: 'Huỷ phiên',
  SESSION_UPDATE: 'Cập nhật phiên',
  SHIFT_OPEN: 'Mở ca',
  SHIFT_JOIN: 'Tham gia ca',
  SHIFT_CLOSE: 'Đóng ca',
  PRODUCT_CREATE: 'Thêm hàng hóa',
  STOCK_MOVEMENT: 'Điều chỉnh kho',
  PRICING_RULE_CREATE: 'Tạo bảng giá',
  PRICING_RULE_UPDATE: 'Cập nhật bảng giá',
  PRICING_RULE_DELETE: 'Xoá bảng giá',
  MEMBERSHIP_REGISTER: 'Đăng ký hội viên',
  MEMBERSHIP_RENEW: 'Gia hạn hội viên',
  MEMBERSHIP_PLAN_UPDATE: 'Cập nhật gói hội viên',
  MEMBERSHIP_PLAN_DEACTIVATE: 'Ngừng dùng gói hội viên',
  MEMBERSHIP_PLAN_DELETE: 'Xoá gói hội viên',
}

const entityLabels: Record<string, string> = {
  User: 'Tài khoản',
  Session: 'Phiên chơi',
  Shift: 'Ca làm',
  Product: 'Kho',
  PricingRule: 'Bảng giá',
  Membership: 'Hội viên',
  MembershipPlan: 'Gói hội viên',
}

export default function StaffPage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadMe() {
      setLoading(true)
      setError('')
      try {
        const data = await apiJson<UserSession>('/api/auth/me')
        if (!data.success) throw new Error(data.error || 'Không tải được tài khoản')
        if (mounted) setUser(data.data ?? null)
      } catch (err) {
        if (mounted) setError((err as Error).message || 'Lỗi kết nối máy chủ')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadMe()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <StaffSkeleton />
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-4 dark:bg-zinc-950 md:px-6 md:py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Quản trị nội bộ
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-zinc-950 dark:text-white">
              <UserCog size={24} className="text-blue-500" />
              Nhân viên
            </h1>
          </div>
          {user && (
            <Badge variant={isAdmin ? 'purple' : 'default'}>
              {isAdmin ? 'Admin' : 'Staff'}
            </Badge>
          )}
        </header>

        {error && (
          <NoticeCard
            tone="danger"
            title="Không tải được dữ liệu"
            description={error}
          />
        )}

        {isAdmin ? (
          <StaffAdminPanel />
        ) : (
          <EmptyState
            icon={UserCog}
            message="Bạn không có quyền quản lý nhân viên"
            description="Chỉ quản trị viên được tạo tài khoản nội bộ và xem nhật ký hoạt động."
          />
        )}
      </div>
    </div>
  )
}

function StaffAdminPanel() {
  const [activeTab, setActiveTab] = useState<StaffTabId>('accounts')
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const data = await apiJson<UserRow[]>('/api/users')
      if (!data.success) throw new Error(data.error || 'Không tải được danh sách nhân viên')
      setUsers(data.data ?? [])
    } catch (err) {
      setUsersError((err as Error).message || 'Lỗi kết nối máy chủ')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers()
  }, [loadUsers])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-2 gap-1">
          <TabButton
            active={activeTab === 'accounts'}
            icon={Users}
            label="Tài khoản"
            onClick={() => setActiveTab('accounts')}
          />
          <TabButton
            active={activeTab === 'logs'}
            icon={History}
            label="Nhật ký hoạt động"
            onClick={() => setActiveTab('logs')}
          />
        </div>
      </div>

      {activeTab === 'accounts' ? (
        <AccountsTab
          users={users}
          loading={usersLoading}
          error={usersError}
          onReload={loadUsers}
        />
      ) : (
        <ActivityLogsTab users={users} />
      )}
    </div>
  )
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: typeof Users
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
          : 'text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

function AccountsTab({
  users,
  loading,
  error,
  onReload,
}: {
  users: UserRow[]
  loading: boolean
  error: string
  onReload: () => Promise<void>
}) {
  const { success: notifySuccess, error: notifyError } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyCreateForm)
  const [submitting, setSubmitting] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => item.isActive).length,
    admins: users.filter((item) => item.role === 'ADMIN').length,
    staff: users.filter((item) => item.role === 'STAFF').length,
  }), [users])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const data = await apiJson<UserRow>('/api/users', jsonRequest('POST', {
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
      }))

      if (!data.success) {
        notifyError(data.error || 'Không tạo được tài khoản')
        return
      }

      notifySuccess('Đã tạo tài khoản nhân viên')
      setShowCreate(false)
      setForm(emptyCreateForm)
      await onReload()
    } catch {
      notifyError('Lỗi kết nối máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: UserRow) => {
    setSubmitting(true)
    try {
      const data = await apiJson<UserRow>(`/api/users/${user.id}`, jsonRequest('PUT', {
        isActive: !user.isActive,
      }))

      if (!data.success) {
        notifyError(data.error || 'Không cập nhật được tài khoản')
        return
      }

      notifySuccess(user.isActive ? 'Đã vô hiệu hoá tài khoản' : 'Đã kích hoạt tài khoản')
      await onReload()
    } catch {
      notifyError('Lỗi kết nối máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return

    setSubmitting(true)
    try {
      const data = await apiJson(`/api/users/${resetTarget.id}`, jsonRequest('PATCH', {
        newPassword,
      }))

      if (!data.success) {
        notifyError(data.error || 'Không đổi được mật khẩu')
        return
      }

      notifySuccess(`Đã đổi mật khẩu cho ${resetTarget.fullName}`)
      setResetTarget(null)
      setNewPassword('')
    } catch {
      notifyError('Lỗi kết nối máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <StaffSkeleton compact />
  }

  return (
    <div className="space-y-4">
      {error && (
        <NoticeCard
          tone="danger"
          title="Không tải được nhân viên"
          description={error}
        />
      )}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StaffStat label="Tổng" value={stats.total} />
        <StaffStat label="Đang hoạt động" value={stats.active} tone="success" />
        <StaffStat label="Admin" value={stats.admins} tone="purple" />
        <StaffStat label="Nhân viên" value={stats.staff} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Tài khoản nội bộ
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {users.length} tài khoản trong hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => void onReload()}
              title="Làm mới"
            />
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowCreate((value) => !value)}
            >
              Tạo tài khoản
            </Button>
          </div>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/10"
          >
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_160px_auto] md:items-end">
              <div>
                <Label htmlFor="staff-full-name" required>Họ tên</Label>
                <Input
                  id="staff-full-name"
                  required
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <Label htmlFor="staff-username" required>Tên đăng nhập</Label>
                <Input
                  id="staff-username"
                  required
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  placeholder="nva"
                />
              </div>
              <div>
                <Label htmlFor="staff-password" required>Mật khẩu</Label>
                <Input
                  id="staff-password"
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>
              <div>
                <Label htmlFor="staff-role">Vai trò</Label>
                <Select
                  id="staff-role"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
                >
                  <option value="STAFF">Nhân viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="inverse"
                  size="md"
                  loading={submitting}
                  disabled={submitting}
                >
                  Tạo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowCreate(false)}
                >
                  Huỷ
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {users.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            message="Chưa có nhân viên nào"
            description="Tạo tài khoản nội bộ đầu tiên để nhân viên đăng nhập POS."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {users.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-medium text-zinc-950 dark:text-white">
                      {item.fullName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {item.username}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.role === 'ADMIN' ? 'purple' : 'default'} size="sm">
                        {item.role === 'ADMIN' ? 'Admin' : 'Nhân viên'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.isActive ? 'success' : 'danger'} size="sm">
                        {item.isActive ? 'Đang hoạt động' : 'Đã khoá'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Key}
                          onClick={() => setResetTarget(item)}
                          title="Đổi mật khẩu"
                        />
                        <Button
                          variant={item.isActive ? 'outline-danger' : 'secondary'}
                          size="sm"
                          icon={item.isActive ? UserX : UserCheck}
                          disabled={submitting}
                          onClick={() => void handleToggleActive(item)}
                          title={item.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={!!resetTarget}
        onClose={() => {
          setResetTarget(null)
          setNewPassword('')
        }}
        size="sm"
        title="Đổi mật khẩu"
        description={resetTarget ? `Tài khoản ${resetTarget.fullName}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setResetTarget(null)
                setNewPassword('')
              }}
            >
              Huỷ
            </Button>
            <Button
              loading={submitting}
              disabled={submitting || newPassword.length < 6}
              onClick={() => void handleResetPassword()}
            >
              Đổi mật khẩu
            </Button>
          </div>
        }
      >
        <Label htmlFor="staff-new-password" required>Mật khẩu mới</Label>
        <Input
          id="staff-new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Ít nhất 6 ký tự"
        />
        {newPassword.length > 0 && newPassword.length < 6 && (
          <p className="mt-1 text-xs text-red-500">Mật khẩu phải có ít nhất 6 ký tự</p>
        )}
      </Modal>
    </div>
  )
}

function ActivityLogsTab({ users }: { users: UserRow[] }) {
  const [logs, setLogs] = useState<ActivityLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (selectedUserId) params.set('userId', selectedUserId)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const data = await apiJson<ActivityLogRow[]>(`/api/activity-logs?${params.toString()}`)
      if (!data.success) throw new Error(data.error || 'Không tải được nhật ký hoạt động')
      setLogs(data.data ?? [])
    } catch (err) {
      setError((err as Error).message || 'Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }, [selectedUserId, searchQuery])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs()
  }, [loadLogs])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="md:w-64">
            <Label htmlFor="activity-user-filter">Nhân viên</Label>
            <Select
              id="activity-user-filter"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              <option value="">Tất cả nhân viên</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="activity-search">Tìm kiếm</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <Input
                  id="activity-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setSearchQuery(searchInput)
                    }
                  }}
                  className="pl-9"
                  placeholder="Tên nhân viên, hành động, đối tượng"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => setSearchQuery(searchInput)}
              >
                Tìm
              </Button>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => void loadLogs()}
                title="Làm mới"
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <NoticeCard
          tone="danger"
          title="Không tải được nhật ký"
          description={error}
        />
      )}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Nhật ký hoạt động
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {logs.length} dòng mới nhất
            </p>
          </div>
          <Badge variant="blue">ActivityLog</Badge>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            message="Chưa có nhật ký hoạt động"
            description="Thử đổi bộ lọc hoặc thao tác nghiệp vụ để hệ thống ghi nhận log."
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {logs.map((log) => (
              <ActivityLogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ActivityLogItem({ log }: { log: ActivityLogRow }) {
  return (
    <div className="px-4 py-3">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={log.entityType === 'User' ? 'purple' : 'default'} size="sm">
              {entityLabels[log.entityType] ?? log.entityType}
            </Badge>
            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
              {actionLabels[log.action] ?? log.action.replaceAll('_', ' ')}
            </p>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {log.user.fullName} · {log.user.username}
          </p>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
            {summarizeDetails(log.details)}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatDateTime(log.createdAt)}
          </p>
          <p className="mt-1 max-w-[220px] truncate font-mono text-[10px] text-zinc-400 md:ml-auto">
            {log.entityId}
          </p>
        </div>
      </div>

      {log.details ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-300">
            Chi tiết
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

function StaffStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'success' | 'purple' | 'default'
}) {
  const valueClass = tone === 'success'
    ? 'text-emerald-600 dark:text-emerald-300'
    : tone === 'purple'
      ? 'text-purple-600 dark:text-purple-300'
      : 'text-zinc-950 dark:text-white'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  )
}

function StaffSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4 p-4 md:p-6">
      {!compact && <Skeleton className="h-10 w-44" />}
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {children}
    </th>
  )
}

function jsonRequest(method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN')
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function summarizeDetails(details: unknown): string {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return 'Không có chi tiết'
  }

  const record = details as Record<string, unknown>
  if (typeof record.targetUsername === 'string') {
    return `Tài khoản ${record.targetUsername}`
  }
  if (typeof record.username === 'string') {
    return `Tài khoản ${record.username}`
  }
  if (typeof record.name === 'string') {
    return record.name
  }

  const summary = Object.entries(record)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${detailLabel(key)}: ${formatDetailValue(value)}`)

  return summary.length > 0 ? summary.join(' · ') : 'Có chi tiết thay đổi'
}

function detailLabel(key: string): string {
  const labels: Record<string, string> = {
    fullName: 'Họ tên',
    role: 'Vai trò',
    isActive: 'Trạng thái',
    openingCash: 'Tiền đầu ca',
    stockQuantity: 'Tồn kho',
    paymentMethod: 'Thanh toán',
  }

  return labels[key] ?? key
}

function formatDetailValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (value === null || value === undefined) return ''
  return String(value)
}
