import { findActiveMembership } from '@/lib/business/memberships'
import { prisma } from '@/lib/prisma'
import { calcHours, getDayType, getVnDay, getVnHour } from '@/lib/utils'
import type { DayType } from '@/types'

export interface PricingResult {
  hourlyRate: number
  totalHours: number
  subtotal: number
  typeDiscount: number
  volumeDiscount: number
  grandTotal: number
  isMemberSession: boolean
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
  endTime: Date
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
      typeDiscount: 0,
      volumeDiscount: 0,
      grandTotal: 0,
      isMemberSession: true,
    }
  }

  const currentHour = getVnHour(session.startTime)
  const hourlyRate =
    Number(session.hourlyRate)
    || await findApplicableRate(
      currentHour,
      getDayType(session.startTime),
      session.startTime
    )

  const subtotal = Math.round(totalHours * hourlyRate)

  return {
    hourlyRate,
    totalHours,
    subtotal,
    typeDiscount: 0,
    volumeDiscount: 0,
    grandTotal: Math.max(0, subtotal),
    isMemberSession: false,
  }
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
