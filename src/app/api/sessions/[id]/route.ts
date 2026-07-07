// ── GET/PUT /api/sessions/[id] ──────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateSessionSchema } from "@/lib/validations/session";

// ── GET: Chi tiết phiên ────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        customer: { include: { memberTier: true } },
        staff: { select: { id: true, fullName: true } },
        orders: { include: { service: true } },
        appliedPromotions: { include: { promotion: true } },
        payment: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiên" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── PUT: Cập nhật phiên (pause, cancel...) ─────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiên" },
        { status: 404 }
      );
    }

    await prisma.session.update({ where: { id }, data: parsed.data });

    const updated = await prisma.session.findUnique({
      where: { id },
      include: { customer: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
