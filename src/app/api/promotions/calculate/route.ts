// ── POST /api/promotions/calculate ──────────────────────
// Tính KM áp dụng được cho 1 session
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Thiếu sessionId" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { customer: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiên" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Lấy tất cả CTKM đang active, phù hợp loại KH
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        applicableCustomerTypes: { has: session.customer.type },
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
    });

    // Tính KM áp dụng được
    const applicable: Array<{
      promotion: { id: string; name: string; type: string };
      discountAmount: number;
      reason: string;
    }> = [];

    let totalDiscount = 0;

    for (const promo of promotions) {
      const result = calculatePromotionDiscount({
        type: promo.type,
        minHours: promo.minHours ? Number(promo.minHours) : undefined,
        discountPercent: promo.discountPercent ? Number(promo.discountPercent) : undefined,
        maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : undefined,
        discountAmount: promo.discountAmount ? Number(promo.discountAmount) : undefined,
      }, {
        startTime: session.startTime,
        hourlyRate: Number(session.hourlyRate ?? 0),
        customer: session.customer ? { type: session.customer.type } : null,
      });
      if (result.applicable) {
        applicable.push({
          promotion: {
            id: promo.id,
            name: promo.name,
            type: promo.type,
          },
          discountAmount: result.discount,
          reason: result.reason,
        });
        totalDiscount += result.discount;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        applicable,
        totalDiscount,
        customerType: session.customer.type,
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── Helper: Tính discount cho 1 promotion ───────────────
interface PromoCalc {
  type: string;
  minHours?: number;
  discountPercent?: number;
  maxDiscount?: number;
  discountAmount?: number;
}

interface SessionCalc {
  startTime: Date;
  hourlyRate: number;
  customer?: { type: string } | null;
}

function calculatePromotionDiscount(
  promo: PromoCalc,
  session: SessionCalc
): { applicable: boolean; discount: number; reason: string } {
  const promoType = promo.type;
  const minHours = Number(promo.minHours ?? 0);

  // Ước tính số giờ (nếu session chưa kết thúc)
  const startTime = new Date(session.startTime);
  const now = new Date();
  const estimatedHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  switch (promoType) {
    case "HOURS_THRESHOLD": {
      if (estimatedHours >= minHours) {
        const discountPercent = Number(promo.discountPercent ?? 0);
        const maxDiscount = Number(promo.maxDiscount ?? Infinity);
        // Discount tính trên số giờ × rate ước tính
        const rawDiscount = Math.round(estimatedHours * Number(session.hourlyRate ?? 0) * discountPercent / 100);
        const discount = Math.min(rawDiscount, maxDiscount);
        return {
          applicable: true,
          discount,
          reason: `Chơi ${estimatedHours.toFixed(1)}h ≥ ${minHours}h: giảm ${discountPercent}%`,
        };
      }
      return { applicable: false, discount: 0, reason: `Chưa đủ ${minHours}h` };
    }

    case "STUDENT": {
      if (session.customer?.type === "STUDENT") {
        const discountPercent = Number(promo.discountPercent ?? 0);
        const discount = Math.round(estimatedHours * Number(session.hourlyRate ?? 0) * discountPercent / 100);
        return { applicable: true, discount, reason: `HS/SV: giảm ${discountPercent}%` };
      }
      return { applicable: false, discount: 0, reason: "Không phải HS/SV" };
    }

    case "MEMBER_TIER": {
      if (session.customer?.type === "MEMBER") {
        const discountPercent = Number(promo.discountPercent ?? 0);
        const discount = Math.round(estimatedHours * Number(session.hourlyRate ?? 0) * discountPercent / 100);
        return { applicable: true, discount, reason: `Hội viên: giảm ${discountPercent}%` };
      }
      return { applicable: false, discount: 0, reason: "Không phải hội viên" };
    }

    case "PERCENTAGE": {
      const discountPercent = Number(promo.discountPercent ?? 0);
      const discount = Math.round(estimatedHours * Number(session.hourlyRate ?? 0) * discountPercent / 100);
      return { applicable: true, discount, reason: `Giảm ${discountPercent}%` };
    }

    case "FIXED": {
      const discount = Number(promo.discountAmount ?? 0);
      return { applicable: true, discount, reason: `Giảm ${discount.toLocaleString("vi-VN")}đ` };
    }

    default:
      return { applicable: false, discount: 0, reason: "Loại KM không xác định" };
  }
}
