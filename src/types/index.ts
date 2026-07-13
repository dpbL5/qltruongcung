// ── Shared TypeScript types ─────────────────────────────

// Re-export Prisma enums as convenience types
export type UserRole = "ADMIN" | "STAFF"
export type CustomerType = "WALK_IN" | "MEMBER"
export type SessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED"
export type DayType = "WEEKDAY" | "WEEKEND"
export type PromotionDiscountType = "FIXED_AMOUNT" | "PERCENT" | "FIXED_PER_HOUR" | "PERCENT_PLAY_TIME"
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD"
export type MembershipStatus = "ACTIVE" | "CANCELLED"
export type InvoiceStatus = "DRAFT" | "PAID" | "CANCELLED"
export type InvoiceItemType = "PLAY_TIME" | "MEMBERSHIP_FEE" | "PRODUCT" | "SERVICE" | "DISCOUNT"
export type ProductType = "PRODUCT" | "SERVICE"
export type StockMovementType = "RESTOCK" | "SALE" | "ADJUSTMENT" | "VOID"
export type ShiftStatus = "OPEN" | "CLOSED"
export type ShiftParticipantRole = "LEAD" | "STAFF"

export interface PromotionRule {
  id: string
  name: string
  discountType: PromotionDiscountType
  discountValue: number | string
  daysOfWeek: number[]
  hourFrom: number
  hourTo: number | null
  dayType: DayType
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PromotionSnapshot {
  ruleId: string
  name: string
  discountType: PromotionDiscountType
  discountValue: number
}

export interface PlayTimeQuote {
  sessionId: string
  totalHours: number
  hourlyRate: number
  subtotal: number
  discountAmount: number
  grandTotal: number
  isMemberSession: boolean
  promotion: PromotionSnapshot | null
}

export interface PricingTier {
  id: string
  ruleId: string
  minHours: number
  ratePerHour: number | string
}

// ── Session payload (JWT) ──────────────────────────────
export interface SessionPayload {
  userId: string
  username: string
  fullName: string
  role: UserRole
}

// ── API response wrappers ──────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  current?: unknown
  error?: string
  message?: string
  warnings?: string[]
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ── Report types ───────────────────────────────────────
export interface DashboardStats {
  todayRevenue: number
  todaySessions: number
  activeSessions: number
  totalCustomersToday: number
}

export interface RevenueReport {
  period: string
  revenue: number
  sessionCount: number
  avgRevenuePerSession: number
}
