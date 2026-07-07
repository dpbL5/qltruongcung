// ── GET /api/reports/revenue ────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || new Date().toISOString().split("T")[0];
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: fromDate, lte: toDate },
      },
      include: {
        session: {
          select: {
            customer: { select: { fullName: true } },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    // Group by day
    const grouped: Record<string, { revenue: number; count: number }> = {};
    for (const p of payments) {
      const key = p.paidAt.toISOString().split("T")[0];
      if (!grouped[key]) grouped[key] = { revenue: 0, count: 0 };
      grouped[key].revenue += Number(p.grandTotal);
      grouped[key].count += 1;
    }

    const data = Object.entries(grouped).map(([period, val]) => ({
      period,
      revenue: val.revenue,
      sessionCount: val.count,
      avgRevenuePerSession: val.count > 0 ? Math.round(val.revenue / val.count) : 0,
    }));

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

    return NextResponse.json({
      success: true,
      data,
      summary: {
        from,
        to,
        totalRevenue,
        totalSessions: data.reduce((sum, d) => sum + d.sessionCount, 0),
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("Reports error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
