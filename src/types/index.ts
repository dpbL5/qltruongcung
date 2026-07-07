// ── Shared TypeScript types ─────────────────────────────

// Re-export Prisma enums as convenience types
export type UserRole = "ADMIN" | "STAFF";
export type CustomerType = "WALK_IN" | "STUDENT" | "MEMBER";
export type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type ServiceCategory = "DRINK" | "EQUIPMENT" | "OTHER";
export type DayType = "WEEKDAY" | "WEEKEND" | "HOLIDAY";
export type PeakType = "PEAK" | "OFF_PEAK";
export type PromotionType =
  | "HOURS_THRESHOLD"
  | "STUDENT"
  | "MEMBER_TIER"
  | "PERCENTAGE"
  | "FIXED";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD";
export type ShiftStatus = "ACTIVE" | "COMPLETED";

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
