import { formatVND } from '@/lib/utils'

export function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0)
}

export function money(value: number | string | null | undefined): string {
  return formatVND(toNumber(value))
}

export function formatClock(dateValue: string | Date): string {
  return new Date(dateValue).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDay(dateValue: string | Date): string {
  return new Date(dateValue).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function calcElapsedHMS(startTime: string): string {
  const diffMs = Date.now() - new Date(startTime).getTime()
  if (diffMs < 0) return '00:00:00'

  const totalSeconds = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60

  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':')
}

export function calcCurrentPlayCost(startTime: string, hourlyRate: number | string): number {
  const diffMs = Date.now() - new Date(startTime).getTime()
  if (diffMs < 0) return 0

  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
  return Math.round(totalHours * toNumber(hourlyRate))
}

export function paymentMethodLabel(method: string): string {
  if (method === 'CASH') return 'Tiền mặt'
  if (method === 'TRANSFER') return 'Chuyển khoản'
  if (method === 'CARD') return 'Thẻ'
  return method
}
