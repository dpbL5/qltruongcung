export function formatVND(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${num.toLocaleString('vi-VN')}đ`
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h${m}p`
}

export function calcHours(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}

export function today(): string {
  return toInputDate(new Date())
}

export function toInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDayType(date: Date = new Date()): import('../types').DayType {
  const day = date.getDay()
  return day === 0 || day === 6 ? 'WEEKEND' : 'WEEKDAY'
}

export function getPeakType(date: Date = new Date()): import('../types').PeakType {
  const hour = date.getHours()
  if ((hour >= 9 && hour < 11) || (hour >= 14 && hour < 16) || (hour >= 19 && hour < 21)) {
    return 'PEAK'
  }
  return 'OFF_PEAK'
}

export function parseStartOfDay(value: string): Date {
  const date = new Date(`${value}T00:00:00`)
  date.setHours(0, 0, 0, 0)
  return date
}

export function parseEndOfDay(value: string): Date {
  const date = new Date(`${value}T23:59:59.999`)
  date.setHours(23, 59, 59, 999)
  return date
}

// ── Date-only string → local-time Date (tránh lệch múi giờ UTC) ──
// new Date("2026-07-11") → midnight UTC = 7:00 sáng giờ VN → sai với mong đợi người dùng.
// Các hàm bên dưới dùng constructor (year, month-1, day) để lấy midnight theo giờ địa phương.

/**
 * Biến chuỗi date-only "YYYY-MM-DD" thành Date lúc 00:00:00.000 giờ địa phương.
 * Dùng cho `effectiveFrom` của bảng giá và các trường ngày hiệu lực bắt đầu.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Biến chuỗi date-only "YYYY-MM-DD" thành Date lúc 23:59:59.999 giờ địa phương.
 * Dùng cho `effectiveTo` để ngày kết thúc bao phủ hết ngày.
 */
export function parseLocalDateEnd(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999)
}
