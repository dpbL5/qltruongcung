// ── GET /api/reports/export ─────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "revenue";
    const from = searchParams.get("from") || new Date().toISOString().split("T")[0];
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    let csvData = "";

    if (type === "revenue") {
      const payments = await prisma.payment.findMany({
        where: { paidAt: { gte: fromDate, lte: toDate } },
        include: {
          session: {
            select: {
              customer: { select: { fullName: true } },
            },
          },
          staff: { select: { fullName: true } },
        },
        orderBy: { paidAt: "asc" },
      });

      // CSV header
      csvData = "Thời gian,Khách hàng,Tổng giờ,Tiền giờ,Giảm giá,Tổng tiền,PT Thanh toán,Nhân viên\n";
      for (const p of payments) {
        csvData += [
          p.paidAt.toISOString(),
          `"${p.session.customer.fullName}"`,
          Number(p.totalHours),
          Number(p.subtotal),
          Number(p.discountTotal),
          Number(p.grandTotal),
          p.paymentMethod,
          `"${p.staff.fullName}"`,
        ].join(",") + "\n";
      }
    } else if (type === "sessions") {
      const sessions = await prisma.session.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: {
          customer: { select: { fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      csvData = "Ngày tạo,Khách hàng,Trạng thái,Bắt đầu,Kết thúc,Tổng giờ,Tổng tiền\n";
      for (const s of sessions) {
        csvData += [
          s.createdAt.toISOString().split("T")[0],
          `"${s.customer.fullName}"`,
          s.status,
          s.startTime.toISOString(),
          s.endTime?.toISOString() || "",
          Number(s.totalHours ?? 0),
          Number(s.totalAmount ?? 0),
        ].join(",") + "\n";
      }
    }

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}_${from}_${to}.csv"`,
      },
    });
  } catch (error) {
    if ((error as Error).message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Không có quyền" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
