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
