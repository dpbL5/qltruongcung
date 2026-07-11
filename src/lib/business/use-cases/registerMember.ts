import { logActivity } from '@/lib/business/audit'
import { calculateRenewalPeriod } from '@/lib/business/memberships'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { generateInvoiceNo } from '@/lib/business/invoices'
import { prisma } from '@/lib/prisma'
import type { PaymentMethod } from '@/types'

export interface RegisterMemberInput {
  staffId: string
  fullName: string
  phone?: string | null
  planId: string
  paymentMethod: PaymentMethod
  paidAt?: Date
  notes?: string
}

export interface RegisterMemberResult {
  customer: { id: string; fullName: string; phone: string | null; type: 'MEMBER' }
  membership: { id: string; startsAt: Date; expiresAt: Date; status: 'ACTIVE' | 'CANCELLED' }
  invoiceId: string
  paymentId: string
  membershipPaymentId: string
}

export async function registerMember({
  staffId,
  fullName,
  phone,
  planId,
  paymentMethod,
  paidAt = new Date(),
  notes,
}: RegisterMemberInput): Promise<RegisterMemberResult> {
  const [plan, openShift] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { id: planId } }),
    findOpenShiftForStaff(prisma, staffId),
  ])

  if (!openShift) {
    throw new Error('SHIFT_REQUIRED')
  }
  if (!plan || !plan.isActive) {
    throw new Error('PLAN_NOT_FOUND')
  }

  const { startsAt, expiresAt } = calculateRenewalPeriod(null, plan.durationMonths, paidAt)

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        fullName,
        phone: phone || null,
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
        staffId,
        status: 'PAID',
        subtotal: plan.price,
        discountTotal: 0,
        grandTotal: plan.price,
        paidAt,
        notes,
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
        staffId,
        totalHours: 0,
        subtotal: plan.price,
        discountTotal: 0,
        grandTotal: plan.price,
        paymentMethod,
        paidAt,
        notes,
      },
    })

    const membershipPayment = await tx.membershipPayment.create({
      data: {
        customerId: customer.id,
        membershipId: membership.id,
        planId: plan.id,
        invoiceId: invoice.id,
        shiftId: openShift.id,
        staffId,
        amount: plan.price,
        paymentMethod,
        paidAt,
        notes,
      },
    })

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalSpent: { increment: Number(plan.price) },
      },
    })

    await logActivity(tx, {
      userId: staffId,
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

  return {
    customer: {
      id: result.customer.id,
      fullName: result.customer.fullName,
      phone: result.customer.phone,
      type: result.customer.type as 'MEMBER',
    },
    membership: result.membership,
    invoiceId: result.invoice.id,
    paymentId: result.payment.id,
    membershipPaymentId: result.membershipPayment.id,
  }
}

export function mapRegisterMemberError(error: Error): { code: string; message: string; status: number } {
  const message = error.message

  if (message === 'SHIFT_REQUIRED') {
    return { code: 'SHIFT_REQUIRED', message: 'Cần mở ca trước khi đăng ký hội viên', status: 409 }
  }
  if (message === 'PLAN_NOT_FOUND') {
    return { code: 'PLAN_NOT_FOUND', message: 'Gói hội viên không tồn tại hoặc đã ngừng dùng', status: 404 }
  }

  return { code: 'UNKNOWN', message: 'Lỗi máy chủ', status: 500 }
}
