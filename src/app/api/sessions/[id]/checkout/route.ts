// ── POST /api/sessions/[id]/checkout ────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkoutSessionSchema } from "@/lib/validations/session";
import { calculateSessionPrice } from "@/lib/pricing";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySession();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    const { id } = await params;

    const body = await request.json();
    const parsed = checkoutSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Kiểm tra session tồn tại và đang active/paused
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiên" },
        { status: 404 }
      );
    }

    if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
      return NextResponse.json(
        { success: false, error: `Phiên đã ${session.status === "COMPLETED" ? "kết thúc" : "bị huỷ"} rồi` },
        { status: 400 }
      );
    }

    // Xác định thời gian kết thúc
    const endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : new Date();

    // Tính giá
    const pricing = await calculateSessionPrice(id, endTime);

    // Grand total
    const grandTotal = pricing.subtotal
      - pricing.typeDiscount
      - pricing.volumeDiscount;

    // Tạo payment + cập nhật session + cập nhật KH
    const result = await prisma.$transaction(async (tx) => {
      // 1. Tạo payment
      const payment = await tx.payment.create({
        data: {
          sessionId: id,
          staffId: auth.userId,
          totalHours: pricing.totalHours,
          subtotal: pricing.subtotal,
          discountTotal: pricing.typeDiscount + pricing.volumeDiscount,
          grandTotal: Math.max(0, grandTotal),
          paymentMethod: parsed.data.paymentMethod,
          paidAt: new Date(),
          notes: parsed.data.notes,
        },
      });

      // 2. Cập nhật session
      await tx.session.update({
        where: { id },
        data: {
          endTime,
          status: "COMPLETED",
          totalHours: pricing.totalHours,
          subtotal: pricing.subtotal,
          discountAmount: pricing.typeDiscount + pricing.volumeDiscount,
          totalAmount: Math.max(0, grandTotal),
        },
      });

      // 3. Cập nhật thống kê khách hàng
      await tx.customer.update({
        where: { id: session.customerId },
        data: {
          totalHoursPlayed: { increment: pricing.totalHours },
          totalSpent: { increment: Math.max(0, grandTotal) },
        },
      });

      return payment;
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        customer: session.customer.fullName,
        startTime: session.startTime,
        endTime,
        totalHours: pricing.totalHours,
        hourlyRate: pricing.hourlyRate,
        subtotal: pricing.subtotal,
        typeDiscount: pricing.typeDiscount,
        volumeDiscount: pricing.volumeDiscount,
        grandTotal: Math.max(0, grandTotal),
        paymentMethod: parsed.data.paymentMethod,
        paymentId: result.id,
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("POST /api/sessions/[id]/checkout error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
