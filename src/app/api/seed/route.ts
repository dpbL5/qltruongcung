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

    // ── Membership Tiers ────────────────────────────────
    const tierSilver = await prisma.membershipTier.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: {},
      create: { id: "00000000-0000-0000-0000-000000000001", name: "Bạc", minHours: 0, minSpent: 0, discountPercent: 5 },
    });
    const tierGold = await prisma.membershipTier.upsert({
      where: { id: "00000000-0000-0000-0000-000000000002" },
      update: {},
      create: { id: "00000000-0000-0000-0000-000000000002", name: "Vàng", minHours: 50, minSpent: 5000000, discountPercent: 10 },
    });
    await prisma.membershipTier.upsert({
      where: { id: "00000000-0000-0000-0000-000000000003" },
      update: {},
      create: { id: "00000000-0000-0000-0000-000000000003", name: "Kim Cương", minHours: 150, minSpent: 15000000, discountPercent: 15 },
    });

    // ── Services ────────────────────────────────────────
    await prisma.service.deleteMany();
    await Promise.all([
      prisma.service.create({ data: { name: "Sting dâu", category: "DRINK", price: 15000, stockQuantity: 50 } }),
      prisma.service.create({ data: { name: "Sting vàng", category: "DRINK", price: 15000, stockQuantity: 50 } }),
      prisma.service.create({ data: { name: "Red Bull", category: "DRINK", price: 20000, stockQuantity: 30 } }),
      prisma.service.create({ data: { name: "Nước suối", category: "DRINK", price: 10000, stockQuantity: 100 } }),
      prisma.service.create({ data: { name: "Cà phê đen", category: "DRINK", price: 25000, stockQuantity: 20 } }),
      prisma.service.create({ data: { name: "Trà đá", category: "DRINK", price: 5000, stockQuantity: 80 } }),
      prisma.service.create({ data: { name: "Thuê cung gỗ", category: "EQUIPMENT", price: 50000, stockQuantity: 10 } }),
      prisma.service.create({ data: { name: "Thuê bao tay", category: "EQUIPMENT", price: 20000, stockQuantity: 15 } }),
    ]);

    // ── Customers ───────────────────────────────────────
    await prisma.customer.deleteMany();
    await Promise.all([
      prisma.customer.create({ data: { fullName: "Nguyễn Văn A", phone: "0912345678", type: "WALK_IN" } }),
      prisma.customer.create({ data: { fullName: "Trần Thị B", phone: "0987654321", type: "STUDENT" } }),
      prisma.customer.create({ data: { fullName: "Lê Văn C", phone: "0905123456", type: "MEMBER", memberCode: "HV001", memberSince: new Date("2025-01-15"), memberTierId: tierSilver.id, totalHoursPlayed: 25, totalSpent: 3750000 } }),
      prisma.customer.create({ data: { fullName: "Phạm Thị D", phone: "0909876543", type: "MEMBER", memberCode: "HV002", memberSince: new Date("2024-06-01"), memberTierId: tierGold.id, totalHoursPlayed: 80, totalSpent: 11000000 } }),
      prisma.customer.create({ data: { fullName: "Hoàng Văn E", phone: "0913555777", type: "WALK_IN" } }),
    ]);

    // ── Promotions ──────────────────────────────────────
    await prisma.promotion.deleteMany();
    await Promise.all([
      prisma.promotion.create({ data: { name: "Chơi nhiều giảm sâu", description: "Giảm 10% cho khách chơi từ 2 giờ", type: "HOURS_THRESHOLD", minHours: 2, discountPercent: 10, applicableCustomerTypes: ["WALK_IN", "STUDENT", "MEMBER"] } }),
      prisma.promotion.create({ data: { name: "Ưu đãi HS/SV", description: "Giảm 20% cho học sinh sinh viên", type: "STUDENT", discountPercent: 20, applicableCustomerTypes: ["STUDENT"] } }),
      prisma.promotion.create({ data: { name: "Ưu đãi hội viên T7", description: "Giảm thêm 5% cho hội viên trong tháng 7", type: "MEMBER_TIER", discountPercent: 5, applicableCustomerTypes: ["MEMBER"], startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") } }),
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
        services: 8,
        customers: 5,
        promotions: 3,
        pricingRules: 3,
        membershipTiers: 3,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
