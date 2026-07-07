// ── POST /api/sessions/[id]/orders ──────────────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { addOrderSchema } from "@/lib/validations/session";

// ── POST: Thêm dịch vụ vào phiên ───────────────────────
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
    const parsed = addOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Kiểm tra session active
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session || (session.status !== "ACTIVE" && session.status !== "PAUSED")) {
      return NextResponse.json(
        { success: false, error: "Phiên không tồn tại hoặc đã kết thúc" },
        { status: 400 }
      );
    }

    // Kiểm tra dịch vụ
    const service = await prisma.service.findUnique({
      where: { id: parsed.data.serviceId },
    });
    if (!service || !service.isActive) {
      return NextResponse.json(
        { success: false, error: "Dịch vụ không tồn tại hoặc đã ngừng bán" },
        { status: 404 }
      );
    }

    // Kiểm tra tồn kho
    if (service.stockQuantity !== null && service.stockQuantity < parsed.data.quantity) {
      return NextResponse.json(
        { success: false, error: `Tồn kho không đủ. Còn ${service.stockQuantity} ${service.name}` },
        { status: 400 }
      );
    }

    // Tạo order + trừ stock
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.sessionOrder.create({
        data: {
          sessionId: id,
          serviceId: parsed.data.serviceId,
          quantity: parsed.data.quantity,
          unitPrice: service.price,
          subtotal: parsed.data.quantity * Number(service.price),
        },
        include: { service: true },
      });

      // Trừ stock nếu có quản lý tồn kho
      if (service.stockQuantity !== null) {
        await tx.service.update({
          where: { id: parsed.data.serviceId },
          data: { stockQuantity: service.stockQuantity - parsed.data.quantity },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("POST orders error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
