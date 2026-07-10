import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { registerMemberSchema } from '@/lib/validations/membership'
import { calculateRenewalPeriod } from '@/lib/business/memberships'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { generateInvoiceNo } from '@/lib/business/invoices'
import { logActivity } from '@/lib/business/audit'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()

    const body = await request.json()
    const parsed = registerMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    if (parsed.data.paidAt && auth.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Chỉ quản trị viên được chọn ngày thu phí' },
        { status: 403 }
      )
    }

    const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date()
    if (paidAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: 'Ngày thu phí không được ở tương lai' },
        { status: 400 }
      )
    }
    const [plan, openShift] = await Promise.all([
      prisma.membershipPlan.findUnique({ where: { id: parsed.data.planId } }),
      findOpenShiftForStaff(prisma, auth.userId),
    ])

    if (!openShift) {
      return NextResponse.json(
        { success: false, error: 'Cần mở ca trước khi đăng ký hội viên' },
        { status: 409 }
      )
    }

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: 'Gói hội viên không tồn tại hoặc đã ngừng dùng' },
        { status: 404 }
      )
    }

    const { startsAt, expiresAt } = calculateRenewalPeriod(null, plan.durationMonths, paidAt)

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          fullName: parsed.data.fullName,
          phone: parsed.data.phone || null,
          type: 'MEMBER',
        },
      })

      const membership = await tx.membership.create({
        data: {
          customerId: customer.id,
          planId: plan.id,
          startsAt,
          expiresAt,
          status: 'ACTIVE',
        },
        include: { plan: true },
      })

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: generateInvoiceNo('MEM'),
          customerId: customer.id,
          shiftId: openShift.id,
          staffId: auth.userId,
          status: 'PAID',
          subtotal: plan.price,
          discountTotal: 0,
          grandTotal: plan.price,
          paidAt,
          notes: parsed.data.notes,
          items: {
            create: {
              type: 'MEMBERSHIP_FEE',
              description: `Phí hội viên - ${plan.name}`,
              quantity: 1,
              unitPrice: plan.price,
              subtotal: plan.price,
              discountAmount: 0,
              total: plan.price,
              metadata: {
                membershipId: membership.id,
                planId: plan.id,
                startsAt: startsAt.toISOString(),
                expiresAt: expiresAt.toISOString(),
              },
            },
          },
        },
      })

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          shiftId: openShift.id,
          staffId: auth.userId,
          totalHours: 0,
          subtotal: plan.price,
          discountTotal: 0,
          grandTotal: plan.price,
          paymentMethod: parsed.data.paymentMethod,
          paidAt,
          notes: parsed.data.notes,
        },
      })

      const membershipPayment = await tx.membershipPayment.create({
        data: {
          customerId: customer.id,
          membershipId: membership.id,
          planId: plan.id,
          invoiceId: invoice.id,
          shiftId: openShift.id,
          staffId: auth.userId,
          amount: plan.price,
          paymentMethod: parsed.data.paymentMethod,
          paidAt,
          notes: parsed.data.notes,
        },
      })

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: { increment: Number(plan.price) },
        },
      })

      await logActivity(tx, {
        userId: auth.userId,
        action: 'MEMBERSHIP_REGISTER',
        entityType: 'Membership',
        entityId: membership.id,
        details: {
          customerId: customer.id,
          invoiceId: invoice.id,
          paymentId: payment.id,
          membershipPaymentId: membershipPayment.id,
          planId: plan.id,
          startsAt: startsAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      })

      return { customer, membership, invoice, payment, membershipPayment }
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('POST /api/memberships/register error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
