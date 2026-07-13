import { findActiveMembership } from '@/lib/business/memberships'
import {
  calculatePromotionDiscount,
  type PromotionSnapshot,
} from '@/lib/promotion-calculation'
import { prisma } from '@/lib/prisma'
import { calcHours, getDayType, getVnDay, getVnHour } from '@/lib/utils'
import type { DayType } from '@/types'

export interface PricingResult {
  hourlyRate: number
  totalHours: number
  subtotal: number
  promotionDiscount: number
  grandTotal: number
  isMemberSession: boolean
  promotion: PromotionSnapshot | null
}

export async function findApplicableRate(
  currentHour: number,
  dayType: DayType,
  at: Date = new Date()
): Promise<number> {
  const rule = await findApplicablePricingRule(currentHour, dayType, at)
  if (!rule) throw new Error('PRICING_RULE_NOT_FOUND')
  return Number(rule.ratePerHour)
}

export async function countApplicablePricingRules(at: Date = new Date()): Promise<number> {
  return prisma.pricingRule.count({
    where: pricingRuleWhere(getVnHour(at), getDayType(at), at),
  })
}

export interface OverlapInfo {
  id: string
  name: string
  daysOfWeek: number[]
  hourFrom: number
  hourTo: number | null
  effectiveFrom: Date
  effectiveTo: Date | null
}

export async function findOverlappingRules(
  daysOfWeek: number[],
  hourFrom: number,
  hourTo: number | null,
  effectiveFrom: Date,
  effectiveTo: Date | null,
  excludeId?: string,
): Promise<OverlapInfo[]> {
  const effectiveEnd = effectiveTo ?? new Date('2099-12-31')
  const hTo = hourTo ?? 24
  const normalizedDays = normalizeDaysOfWeek(daysOfWeek)

  const rules = await prisma.pricingRule.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      hourFrom: { lt: hTo },
      OR: [
        { hourTo: null },
        { hourTo: { gt: hourFrom } },
      ],
      effectiveFrom: { lte: effectiveEnd },
      AND: [{
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
      }],
    },
    select: {
      id: true,
      name: true,
      daysOfWeek: true,
      dayType: true,
      hourFrom: true,
      hourTo: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
  })

  return rules
    .map((rule) => ({
      ...rule,
      daysOfWeek: resolveRuleDaysOfWeek(rule.daysOfWeek, rule.dayType),
    }))
    .filter((rule) => hasSharedDay(normalizedDays, rule.daysOfWeek))
}

export function deriveDayTypeFromDays(daysOfWeek: number[]): DayType {
  const normalizedDays = normalizeDaysOfWeek(daysOfWeek)
  return normalizedDays.length > 0 && normalizedDays.every((day) => day === 0 || day === 6)
    ? 'WEEKEND'
    : 'WEEKDAY'
}

export function normalizeDaysOfWeek(daysOfWeek: number[]): number[] {
  return [...new Set(daysOfWeek)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right)
}

export function resolveRuleDaysOfWeek(daysOfWeek: number[] | null | undefined, dayType: DayType): number[] {
  const normalizedDays = normalizeDaysOfWeek(daysOfWeek ?? [])
  if (normalizedDays.length > 0) return normalizedDays
  return dayType === 'WEEKEND' ? [0, 6] : [1, 2, 3, 4, 5]
}

export async function calculateSessionPrice(
  sessionId: string,
  endTime: Date,
  promotion: PromotionSnapshot | null = null
): Promise<PricingResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      customer: true,
      membership: true,
    },
  })

  if (!session) throw new Error('SESSION_NOT_FOUND')

  const totalHours = calcHours(session.startTime, endTime)

  const activeMembership = session.membership
    ?? (session.customer.type === 'MEMBER'
      ? await findActiveMembership(prisma, session.customerId, session.startTime)
      : null)

  if (session.customer.type === 'MEMBER' && activeMembership) {
    return {
      hourlyRate: 0,
      totalHours,
      subtotal: 0,
      promotionDiscount: 0,
      grandTotal: 0,
      isMemberSession: true,
      promotion: null,
    }
  }

  const currentHour = getVnHour(session.startTime)
  const dayType = getDayType(session.startTime)

  const applicableRule = await findApplicablePricingRule(currentHour, dayType, session.startTime)

  let hourlyRate: number
  let tiers: { minHours: number; ratePerHour: number }[] = []

  if (applicableRule) {
    hourlyRate = Number(applicableRule.ratePerHour)
    tiers = await fetchPricingTiers(applicableRule.id)
  } else {
    hourlyRate = Number(session.hourlyRate)
    if (!hourlyRate) {
      hourlyRate = await findApplicableRate(currentHour, dayType, session.startTime)
    }
  }

  // Tính tiền luỹ tiến theo các mức giá: mỗi phân khúc giờ dùng mức giá riêng
  const progressiveSubtotal = calculateTieredSubtotal(hourlyRate, tiers, totalHours)

  // Promotion discount tính trên progressive subtotal
  const promotionDiscount = promotion
    ? calculatePromotionDiscount({ totalHours, subtotal: progressiveSubtotal, promotion })
    : 0

  const grandTotal = Math.max(0, progressiveSubtotal - promotionDiscount)

  return {
    hourlyRate,
    totalHours,
    subtotal: progressiveSubtotal,
    promotionDiscount,
    grandTotal,
    isMemberSession: false,
    promotion,
  }
}

/**
 * Lấy danh sách các mức giá luỹ tiến của một quy tắc giá,
 * sắp xếp tăng dần theo minHours.
 */
async function fetchPricingTiers(
  ruleId: string
): Promise<{ minHours: number; ratePerHour: number }[]> {
  const tiers = await prisma.pricingTier.findMany({
    where: { ruleId },
    orderBy: { minHours: 'asc' },
  })
  return tiers.map((t) => ({
    minHours: t.minHours,
    ratePerHour: Number(t.ratePerHour),
  }))
}

/**
 * Tính tiền giờ chơi theo mô hình luỹ tiến:
 * - Từ giờ 0 đến tier[0].minHours: dùng baseRate
 * - Từ tier[0].minHours đến tier[1].minHours: dùng tier[0].ratePerHour
 * - ...
 * - Từ tier cuối đến hết: dùng tier cuối.ratePerHour
 *
 * Ví dụ: baseRate = 100k, tier[0] = { minHours: 1, ratePerHour: 60k }, chơi 4h
 *   → 1h × 100k + 3h × 60k = 280k
 */
export function calculateTieredSubtotal(
  baseRate: number,
  tiers: { minHours: number; ratePerHour: number }[],
  totalHours: number
): number {
  if (totalHours <= 0 || (tiers.length === 0 && baseRate <= 0)) return 0

  let remainingHours = totalHours
  let subtotal = 0
  let currentRate = baseRate
  let segmentStart = 0

  for (const tier of tiers) {
    const segmentEnd = tier.minHours
    const segmentHours = Math.max(0, Math.min(remainingHours, segmentEnd - segmentStart))
    subtotal += Math.round(segmentHours * currentRate)
    remainingHours -= segmentHours
    currentRate = tier.ratePerHour
    segmentStart = segmentEnd

    if (remainingHours <= 0) break
  }

  // Số giờ còn lại dùng mức giá của tier cuối cùng
  if (remainingHours > 0) {
    subtotal += Math.round(remainingHours * currentRate)
  }

  return subtotal
}

async function findApplicablePricingRule(
  currentHour: number,
  dayType: DayType,
  at: Date
) {
  return prisma.pricingRule.findFirst({
    where: pricingRuleWhere(currentHour, dayType, at),
    orderBy: [
      { effectiveFrom: 'desc' },
      { createdAt: 'desc' },
    ],
  })
}

function pricingRuleWhere(
  currentHour: number,
  dayType: DayType,
  at: Date
) {
  return {
    hourFrom: { lte: currentHour },
    OR: [
      { hourTo: null },
      { hourTo: { gt: currentHour } },
    ],
    effectiveFrom: { lte: at },
    AND: [
      {
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: at } },
        ],
      },
      {
        OR: [
          { daysOfWeek: { has: getVnDay(at) } },
          {
            daysOfWeek: { isEmpty: true },
            dayType,
          },
        ],
      },
    ],
  }
}

function hasSharedDay(left: number[], right: number[]): boolean {
  return left.some((day) => right.includes(day))
}
