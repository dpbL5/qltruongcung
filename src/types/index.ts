// ── Shared TypeScript types ─────────────────────────────

// Re-export Prisma enums as convenience types
export type UserRole = "ADMIN" | "STAFF";
export type CustomerType = "WALK_IN" | "MEMBER";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type DayType = "WEEKDAY" | "WEEKEND";
export type PeakType = "PEAK" | "OFF_PEAK";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD";
export type MembershipStatus = "ACTIVE" | "CANCELLED";
export type InvoiceStatus = "DRAFT" | "PAID" | "CANCELLED";
export type InvoiceItemType = "PLAY_TIME" | "MEMBERSHIP_FEE" | "PRODUCT" | "SERVICE" | "DISCOUNT";
export type ProductType = "PRODUCT" | "SERVICE";
export type StockMovementType = "RESTOCK" | "SALE" | "ADJUSTMENT" | "VOID";
export type ShiftStatus = "OPEN" | "CLOSED";
export type ShiftParticipantRole = "LEAD" | "STAFF";

// ── Session payload (JWT) ──────────────────────────────
export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
}

// ── API response wrappers ──────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Report types ───────────────────────────────────────
export interface DashboardStats {
  todayRevenue: number;
  todaySessions: number;
  activeSessions: number;
  totalCustomersToday: number;
}

export interface RevenueReport {
  period: string;
  revenue: number;
  sessionCount: number;
  avgRevenuePerSession: number;
}
