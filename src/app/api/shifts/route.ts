// ── GET /api/shifts & POST /api/shifts ────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { startShiftSchema } from "@/lib/validations/shift";

// ── GET: Danh sách ca làm ───────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Staff chỉ xem ca của mình; Admin xem tất cả hoặc lọc theo userId
    const where: Record<string, unknown> = {};
    if (auth.role === "ADMIN") {
      if (userId) where.userId = userId;
    } else {
      where.userId = auth.userId;
    }

    if (status) where.status = status;
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.startTime = { gte: dayStart, lt: dayEnd };
    }

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { startTime: "desc" },
      }),
      prisma.shift.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/shifts error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── POST: Bắt đầu ca làm ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = startShiftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Kiểm tra chưa có ca ACTIVE nào
    const existingActive = await prisma.shift.findFirst({
      where: { userId: auth.userId, status: "ACTIVE" },
    });
    if (existingActive) {
      return NextResponse.json(
        { success: false, error: "Bạn đang có ca làm chưa kết thúc" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.create({
      data: {
        userId: auth.userId,
        startTime: new Date(),
        status: "ACTIVE",
        notes: parsed.data.notes,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: shift }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shifts error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
