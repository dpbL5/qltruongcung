// ── DELETE /api/sessions/[id]/orders/[orderId] ────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    await requireAuth();
    const { id, orderId } = await params;

    const order = await prisma.sessionOrder.findUnique({
      where: { id: orderId },
      include: { service: true },
    });

    if (!order || order.sessionId !== id) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy order" },
        { status: 404 }
      );
    }

    // Xoá order + hoàn stock
    await prisma.$transaction(async (tx) => {
      await tx.sessionOrder.delete({ where: { id: orderId } });

      // Hoàn stock nếu có quản lý tồn kho
      if (order.service.stockQuantity !== null) {
        await tx.service.update({
          where: { id: order.serviceId },
          data: { stockQuantity: order.service.stockQuantity + order.quantity },
        });
      }
    });

    return NextResponse.json({ success: true, message: "Đã xoá dịch vụ khỏi phiên" });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("DELETE order error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
