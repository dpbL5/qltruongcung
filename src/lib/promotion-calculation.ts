import type { PromotionDiscountType, PromotionSnapshot } from '@/types'

export type { PromotionDiscountType, PromotionSnapshot } from '@/types'

export interface PromotionSnapshotSource {
  promotionRuleId: string | null
  promotionName: string | null
  promotionDiscountType: PromotionDiscountType | null
  promotionDiscountValue: number | string | { toString(): string } | null
}

export interface PlayPriceCalculation {
  subtotal: number
  promotionDiscount: number
  grandTotal: number
}

export type PromotionMetadata = Record<string, string | number>

export function toPromotionSnapshot(source: PromotionSnapshotSource): PromotionSnapshot | null {
  if (
    !source.promotionRuleId
    || !source.promotionName
    || !source.promotionDiscountType
    || source.promotionDiscountValue === null
  ) {
    return null
  }

  const discountValue = Number(source.promotionDiscountValue)
  if (!Number.isFinite(discountValue) || discountValue <= 0) return null

  return {
    ruleId: source.promotionRuleId,
    name: source.promotionName,
    discountType: source.promotionDiscountType,
    discountValue,
  }
}

export function toPromotionMetadata(promotion: PromotionSnapshot | null): PromotionMetadata | null {
  if (!promotion) return null

  return {
    ruleId: promotion.ruleId,
    name: promotion.name,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
  }
}

export function calculatePlayPrice({
  totalHours,
  hourlyRate,
  promotion,
  subtotal: subtotalOverride,
}: {
  totalHours: number
  hourlyRate: number
  promotion?: PromotionSnapshot | null
  /** Pre-computed subtotal (e.g. from tiered pricing). If omitted, computed as totalHours × hourlyRate. */
  subtotal?: number
}): PlayPriceCalculation {
  const safeHours = Number.isFinite(totalHours) ? Math.max(0, totalHours) : 0
  const safeHourlyRate = Number.isFinite(hourlyRate) ? Math.max(0, hourlyRate) : 0
  const subtotal = subtotalOverride ?? Math.round(safeHours * safeHourlyRate)
  const promotionDiscount = calculatePromotionDiscount({
    totalHours: safeHours,
    subtotal,
    promotion,
  })

  return {
    subtotal,
    promotionDiscount,
    grandTotal: Math.max(0, subtotal - promotionDiscount),
  }
}

export function calculatePromotionDiscount({
  totalHours,
  subtotal,
  promotion,
}: {
  totalHours: number
  subtotal: number
  promotion?: PromotionSnapshot | null
}): number {
  if (!promotion || subtotal <= 0) return 0

  const discountValue = Number(promotion.discountValue)
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0

  let rawDiscount: number
  switch (promotion.discountType) {
    case 'FIXED_PER_HOUR':
      rawDiscount = Math.round(totalHours * discountValue)
      break
    case 'FIXED_AMOUNT':
      rawDiscount = Math.round(discountValue)
      break
    case 'PERCENT':
    case 'PERCENT_PLAY_TIME':
      rawDiscount = Math.round(subtotal * discountValue / 100)
      break
    default:
      return 0
  }

  return Math.min(subtotal, Math.max(0, rawDiscount))
}
