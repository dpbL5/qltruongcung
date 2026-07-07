// ── GET /api/shifts/active ────────────────────────────────
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const activeShift = await prisma.shift.findFirst({
      where: { userId: auth.userId, status: "ACTIVE" },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: activeShift });
  } catch (error) {
    console.error("GET /api/shifts/active error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
