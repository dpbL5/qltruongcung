// ── Pricing Engine ─────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { getDayType, getPeakType, calcHours } from "@/lib/utils";
import type { CustomerType, DayType, PeakType } from "@/types";

// ── Constants ──────────────────────────────────────────
const DEFAULT_HOURLY_RATE = 150000; // Fallback nếu không có PricingRule

// ── Types ──────────────────────────────────────────────
export interface PricingResult {
  hourlyRate: number;       // Giá/giờ hiệu quả sau khi áp dụng rule
  totalHours: number;
  subtotal: number;          // Tiền giờ (chưa giảm giá)
  typeDiscount: number;      // Giảm theo loại KH (student, member)
  volumeDiscount: number;    // Giảm theo tổng giờ
  grandTotal: number;        // Tổng thanh toán
}

// ── Volume discount tiers ──────────────────────────────
// TODO: Điều chỉnh theo yêu cầu stakeholder
const VOLUME_TIERS = [
  { maxHours: 1, percent: 0 },
  { maxHours: 2, percent: 5 },
  { maxHours: 4, percent: 10 },
  { maxHours: Infinity, percent: 15 },
];

// ── Customer type discount ─────────────────────────────
const MEMBER_DISCOUNT_PERCENT = 5;

function getCustomerTypeDiscount(type: CustomerType): number {
  switch (type) {
    case "MEMBER":
      return MEMBER_DISCOUNT_PERCENT;
    default:
      return 0;
  }
}

// ── Tìm pricing rule phù hợp ───────────────────────────
export async function findApplicableRate(
  currentHour: number,
  dayType: DayType,
  peakType: PeakType
): Promise<number> {
  // Tìm rule khớp với dayType + peakType + khoảng giờ
  const rule = await prisma.pricingRule.findFirst({
    where: {
      dayType,
      peakType,
      hourFrom: { lte: currentHour },
      AND: [
        { hourTo: { gte: currentHour } },
        { effectiveFrom: { lte: new Date() } },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
      ],
    },
  });

  if (rule) return Number(rule.ratePerHour);

  // Fallback về giá mặc định
  return DEFAULT_HOURLY_RATE;
}

// ── Tính giá đầy đủ cho session ────────────────────────
export async function calculateSessionPrice(
  sessionId: string,
  endTime: Date
): Promise<PricingResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      customer: true,
    },
  });

  if (!session) throw new Error("Session not found");

  // 1. Tính tổng giờ
  const totalHours = calcHours(session.startTime, endTime);
  const currentHour = session.startTime.getHours();
  const dayType = getDayType(session.startTime);
  const peakType = getPeakType(session.startTime);

  // 2. Tìm giá/giờ áp dụng
  const hourlyRate =
    Number(session.hourlyRate) ||
    (await findApplicableRate(currentHour, dayType, peakType));

  // 3. Tính subtotal (tiền giờ)
  const subtotal = Math.round(totalHours * hourlyRate);

  // 4. Volume discount
  let volumeDiscountPercent = 0;
  for (const tier of VOLUME_TIERS) {
    if (totalHours <= tier.maxHours) {
      volumeDiscountPercent = tier.percent;
      break;
    }
  }
  const volumeDiscount = Math.round((subtotal * volumeDiscountPercent) / 100);

  // 5. Customer type discount
  const typeDiscountPercent = getCustomerTypeDiscount(
    session.customer.type as CustomerType
  );
  const typeDiscount = Math.round((subtotal * typeDiscountPercent) / 100);

  // 6. Grand total
  const grandTotal = subtotal - volumeDiscount - typeDiscount;

  return {
    hourlyRate,
    totalHours,
    subtotal,
    typeDiscount,
    volumeDiscount,
    grandTotal: Math.max(0, grandTotal),
  };
}
