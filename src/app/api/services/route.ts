// ── GET /api/services & POST /api/services ──────────────
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (active === "false") where.isActive = false;
    else where.isActive = true;

    const services = await prisma.service.findMany({
      where,
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, category, price, stockQuantity } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Tên dịch vụ không được để trống" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: { name: name.trim(), category: category || "DRINK", price: price || 0, stockQuantity },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    if ((error as Error).message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Không có quyền" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
