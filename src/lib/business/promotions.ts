import type { PromotionRule } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import {
  type PromotionDiscountType,
  type PromotionSnapshot,
} from '@/lib/promotion-calculation'
import { getDayType, getVnDay, getVnHour } from '@/lib/utils'
import type { DayType } from '@/types'

export interface PromotionOverlapInfo {
  id: string
  name: string
  daysOfWeek: number[]
  hourFrom: number
  hourTo: number | null
  effectiveFrom: Date
  effectiveTo: Date | null
}

export async function findAvailablePromotions(at: Date = new Date()): Promise<PromotionSnapshot[]> {
  const rules = await prisma.promotionRule.findMany({
    where: promotionRuleWhere(at),
    orderBy: [
      { effectiveFrom: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return rules.map(toPromotionSnapshot)
}

export async function findAvailablePromotionById(
  id: string,
  at: Date = new Date()
): Promise<PromotionSnapshot | null> {
  const rule = await prisma.promotionRule.findFirst({
    where: {
      id,
      ...promotionRuleWhere(at),
    },
  })

  return rule ? toPromotionSnapshot(rule) : null
}

export async function findOverlappingActivePromotionRules({
  daysOfWeek,
  hourFrom,
  hourTo,
  effectiveFrom,
  effectiveTo,
  excludeId,
}: {
  daysOfWeek: number[]
  hourFrom: number
  hourTo: number | null
  effectiveFrom: Date
  effectiveTo: Date | null
  excludeId?: string
}): Promise<PromotionOverlapInfo[]> {
  const candidateEnd = effectiveTo ?? new Date('2099-12-31T23:59:59.999Z')
  const candidateHourTo = hourTo ?? 24
  const normalizedDays = normalizePromotionDays(daysOfWeek)

  const rules = await prisma.promotionRule.findMany({
    where: {
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined,
      hourFrom: { lt: candidateHourTo },
      OR: [
        { hourTo: null },
        { hourTo: { gt: hourFrom } },
      ],
      effectiveFrom: { lte: candidateEnd },
      AND: [
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: effectiveFrom } },
          ],
        },
      ],
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
      daysOfWeek: resolvePromotionDays(rule.daysOfWeek, rule.dayType),
    }))
    .filter((rule) => hasSharedDay(normalizedDays, rule.daysOfWeek))
}

export function normalizePromotionDays(daysOfWeek: number[]): number[] {
  return [...new Set(daysOfWeek)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right)
}

export function derivePromotionDayType(daysOfWeek: number[]): DayType {
  const normalizedDays = normalizePromotionDays(daysOfWeek)
  return normalizedDays.length > 0 && normalizedDays.every((day) => day === 0 || day === 6)
    ? 'WEEKEND'
    : 'WEEKDAY'
}

export function resolvePromotionDays(daysOfWeek: number[] | null | undefined, dayType: DayType): number[] {
  const normalizedDays = normalizePromotionDays(daysOfWeek ?? [])
  if (normalizedDays.length > 0) return normalizedDays
  return dayType === 'WEEKEND' ? [0, 6] : [1, 2, 3, 4, 5]
}

export function toPromotionSnapshot(rule: Pick<
  PromotionRule,
  'id' | 'name' | 'discountType' | 'discountValue'
>): PromotionSnapshot {
  return {
    ruleId: rule.id,
    name: rule.name,
    discountType: rule.discountType as PromotionDiscountType,
    discountValue: Number(rule.discountValue),
  }
}

export function promotionRuleWhere(at: Date) {
  const currentHour = getVnHour(at)
  const dayType = getDayType(at)

  return {
    isActive: true,
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
