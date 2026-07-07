// ── GET/PUT /api/shifts/[id] ──────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { endShiftSchema } from "@/lib/validations/shift";

// ── GET: Chi tiết ca làm ────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy ca làm" },
        { status: 404 }
      );
    }

    // Chỉ admin hoặc chính chủ mới xem được
    if (auth.role !== "ADMIN" && shift.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Không có quyền" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: shift });
  } catch (error) {
    console.error("GET /api/shifts/[id] error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── PUT: Kết thúc ca làm ────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    const { id } = await params;

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy ca làm" },
        { status: 404 }
      );
    }

    // Chỉ admin hoặc chính chủ mới kết thúc ca
    if (auth.role !== "ADMIN" && shift.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Không có quyền" },
        { status: 403 }
      );
    }

    if (shift.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Ca làm đã kết thúc rồi" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = endShiftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        endTime: new Date(),
        status: "COMPLETED",
        notes: parsed.data.notes ?? shift.notes,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/shifts/[id] error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
