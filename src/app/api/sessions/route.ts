// ── GET /api/sessions & POST /api/sessions ──────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, verifySession } from "@/lib/auth";
import { createSessionSchema } from "@/lib/validations/session";
import { findApplicableRate } from "@/lib/pricing";
import { getDayType, getPeakType } from "@/lib/utils";

// ── GET: Danh sách phiên bắn ───────────────────────────
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.createdAt = { gte: dayStart, lt: dayEnd };
    }

    const [data, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, type: true } },
          staff: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.session.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── POST: Tạo phiên mới (Check-in) ─────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { hourlyRate } = parsed.data;
    let { customerId } = parsed.data;

    // Nếu không có customerId → tự tạo khách ẩn danh
    if (!customerId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Đếm số khách ẩn danh đã tạo hôm nay
      const anonCount = await prisma.customer.count({
        where: {
          type: "WALK_IN",
          phone: null,
          createdAt: { gte: today, lt: tomorrow },
        },
      });
      const anonNumber = anonCount + 1;
      const anonName = `Khách #${String(anonNumber).padStart(3, "0")}`;

      const anonCustomer = await prisma.customer.create({
        data: {
          fullName: anonName,
          type: "WALK_IN",
        },
      });
      customerId = anonCustomer.id;
    } else {
      // Kiểm tra khách có session active nào chưa (chỉ check với khách đã biết)
      const activeSession = await prisma.session.findFirst({
        where: { customerId, status: { in: ["ACTIVE", "PAUSED"] } },
      });
      if (activeSession) {
        return NextResponse.json(
          { success: false, error: "Khách đang có phiên chơi chưa kết thúc" },
          { status: 400 }
        );
      }
    }

    // Xác định giá/giờ
    const now = new Date();
    const rate = hourlyRate
      || await findApplicableRate(now.getHours(), getDayType(now), getPeakType(now));

    const newSession = await prisma.session.create({
      data: {
        customerId,
        staffId: auth.userId,
        startTime: now,
        hourlyRate: rate,
        status: "ACTIVE",
      },
      include: {
        customer: { select: { id: true, fullName: true, type: true } },
      },
    });

    return NextResponse.json({ success: true, data: newSession }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("POST /api/sessions error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
