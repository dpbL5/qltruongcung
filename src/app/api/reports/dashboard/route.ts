// ── GET /api/reports/dashboard ──────────────────────────
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { DashboardStats } from "@/types";

export async function GET() {
  try {
    await requireAuth();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayPayments,
      todaySessions,
      activeSessions,
      totalCustomersToday,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { paidAt: { gte: today, lt: tomorrow } },
        _sum: { grandTotal: true },
      }),
      prisma.session.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.session.count({
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    const stats: DashboardStats = {
      todayRevenue: Number(todayPayments._sum.grandTotal ?? 0),
      todaySessions,
      activeSessions,
      totalCustomersToday,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
