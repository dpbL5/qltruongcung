// ── GET /api/promotions & POST /api/promotions ──────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (active === "false") where.isActive = false;
    else if (active === "true") where.isActive = true;
    if (type) where.type = type;

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: promotions });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "Tên CTKM không được để trống" }, { status: 400 });
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: body.name.trim(),
        description: body.description,
        type: body.type || "PERCENTAGE",
        minHours: body.minHours,
        discountPercent: body.discountPercent,
        discountAmount: body.discountAmount,
        maxDiscount: body.maxDiscount,
        applicableCustomerTypes: body.applicableCustomerTypes || ["WALK_IN"],
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json({ success: true, data: promotion }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    if ((error as Error).message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Không có quyền" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
