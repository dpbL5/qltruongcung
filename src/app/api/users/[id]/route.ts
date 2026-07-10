// ── PUT /api/users/[id] ─────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/business/audit";
import { resetPasswordSchema, updateUserSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Kiểm tra user tồn tại trước khi update
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: parsed.data,
        select: { id: true, username: true, fullName: true, role: true, isActive: true },
      });

      await logActivity(tx, {
        userId: auth.userId,
        action: "USER_UPDATE",
        entityType: "User",
        entityId: id,
        details: {
          targetUsername: existing.username,
          before: {
            fullName: existing.fullName,
            role: existing.role,
            isActive: existing.isActive,
          },
          after: {
            fullName: updated.fullName,
            role: updated.role,
            isActive: updated.isActive,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    if ((error as Error).message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Không có quyền" }, { status: 403 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }
    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── Reset password ─────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Kiểm tra user tồn tại trước khi đổi mật khẩu
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });

      await logActivity(tx, {
        userId: auth.userId,
        action: "USER_PASSWORD_RESET",
        entityType: "User",
        entityId: id,
        details: {
          targetUsername: existing.username,
          targetFullName: existing.fullName,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Đã đổi mật khẩu" });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    if ((error as Error).message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Không có quyền" }, { status: 403 });
    }
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
