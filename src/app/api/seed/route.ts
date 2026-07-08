// ── POST /api/seed (development only) ──────────────────
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    // ── Admin ───────────────────────────────────────────
    const adminHash = await bcrypt.hash("admin123", 12);
    await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: { username: "admin", passwordHash: adminHash, fullName: "Quản trị viên", role: "ADMIN" },
    });

    // ── Staff ───────────────────────────────────────────
    const staffHash = await bcrypt.hash("staff123", 12);
    await prisma.user.upsert({
      where: { username: "staff" },
      update: {},
      create: { username: "staff", passwordHash: staffHash, fullName: "Nhân viên POS", role: "STAFF" },
    });

    // ── Customers ───────────────────────────────────────
    await prisma.customer.deleteMany();
    await Promise.all([
      prisma.customer.create({ data: { fullName: "Nguyễn Văn A", phone: "0912345678", type: "WALK_IN" } }),
      prisma.customer.create({ data: { fullName: "Trần Thị B", phone: "0987654321", type: "MEMBER", totalHoursPlayed: 15, totalSpent: 2250000 } }),
      prisma.customer.create({ data: { fullName: "Lê Văn C", phone: "0905123456", type: "MEMBER", totalHoursPlayed: 25, totalSpent: 3750000 } }),
      prisma.customer.create({ data: { fullName: "Phạm Thị D", phone: "0909876543", type: "MEMBER", totalHoursPlayed: 80, totalSpent: 11000000 } }),
      prisma.customer.create({ data: { fullName: "Hoàng Văn E", phone: "0913555777", type: "WALK_IN" } }),
    ]);

    // ── Pricing Rules ───────────────────────────────────
    await prisma.pricingRule.deleteMany();
    await Promise.all([
      prisma.pricingRule.create({ data: { name: "Giờ thường - Ngày thường", hourFrom: 0, hourTo: 24, ratePerHour: 150000, dayType: "WEEKDAY", peakType: "OFF_PEAK", effectiveFrom: new Date("2026-01-01") } }),
      prisma.pricingRule.create({ data: { name: "Giờ cao điểm - Ngày thường", hourFrom: 17, hourTo: 21, ratePerHour: 180000, dayType: "WEEKDAY", peakType: "PEAK", effectiveFrom: new Date("2026-01-01") } }),
      prisma.pricingRule.create({ data: { name: "Cuối tuần", hourFrom: 0, hourTo: 24, ratePerHour: 200000, dayType: "WEEKEND", peakType: "PEAK", effectiveFrom: new Date("2026-01-01") } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Seed hoàn tất!",
      accounts: [
        { role: "Admin", username: "admin", password: "admin123" },
        { role: "Staff", username: "staff", password: "staff123" },
      ],
      counts: {
        customers: 5,
        pricingRules: 3,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
