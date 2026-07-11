// ── GET/PUT /api/customers/[id] ──────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateCustomerSchema } from "@/lib/validations/customer";

// ── GET: Chi tiết khách hàng ───────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        type: true,
        totalHoursPlayed: true,
        totalSpent: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { sessions: true } },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy khách hàng" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("GET /api/customers/[id] error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── PUT: Cập nhật khách hàng ───────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy khách hàng" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Chuẩn hóa phone rỗng về null
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        phone: parsed.data.phone || null,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        type: true,
        totalHoursPlayed: true,
        totalSpent: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("PUT /api/customers/[id] error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
