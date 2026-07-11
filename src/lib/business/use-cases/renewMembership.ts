import { logActivity } from '@/lib/business/audit'
import {
  calculateRenewalPeriod,
  findLatestMembership,
} from '@/lib/business/memberships'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { generateInvoiceNo } from '@/lib/business/invoices'
import { prisma } from '@/lib/prisma'
import type { PaymentMethod } from '@/types'

export interface RenewMembershipInput {
  staffId: string
  customerId: string
  planId: string
  paymentMethod: PaymentMethod
  paidAt?: Date
  notes?: string
}

export interface RenewMembershipResult {
  membershipId: string
  invoiceId: string
  paymentId: string
  membershipPaymentId: string
  startsAt: Date
  expiresAt: Date
}

export async function renewMembership({
  staffId,
  customerId,
  planId,
  paymentMethod,
  paidAt = new Date(),
  notes,
}: RenewMembershipInput): Promise<RenewMembershipResult> {
  const [customer, plan, latestMembership, openShift] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.membershipPlan.findUnique({ where: { id: planId } }),
    findLatestMembership(prisma, customerId),
    findOpenShiftForStaff(prisma, staffId),
  ])

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND')
  }
  if (!openShift) {
    throw new Error('SHIFT_REQUIRED')
  }
  if (!plan || !plan.isActive) {
    throw new Error('PLAN_NOT_FOUND')
  }

  const { startsAt, expiresAt } = calculateRenewalPeriod(
    latestMembership,
    plan.durationMonths,
    paidAt
  )

  const result = await prisma.$transaction(async (tx) => {
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
        type: 'MEMBER',
        totalSpent: { increment: Number(plan.price) },
      },
    })

    await logActivity(tx, {
      userId: staffId,
      action: 'MEMBERSHIP_RENEW',
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

    return { membership, invoice, payment, membershipPayment }
  })

  return {
    membershipId: result.membership.id,
    invoiceId: result.invoice.id,
    paymentId: result.payment.id,
    membershipPaymentId: result.membershipPayment.id,
    startsAt,
    expiresAt,
  }
}

export function mapRenewMembershipError(error: Error): { code: string; message: string; status: number } {
  const message = error.message

  if (message === 'CUSTOMER_NOT_FOUND') {
    return { code: 'CUSTOMER_NOT_FOUND', message: 'Không tìm thấy khách hàng', status: 404 }
  }
  if (message === 'SHIFT_REQUIRED') {
    return { code: 'SHIFT_REQUIRED', message: 'Cần mở ca trước khi gia hạn hội viên', status: 409 }
  }
  if (message === 'PLAN_NOT_FOUND') {
    return { code: 'PLAN_NOT_FOUND', message: 'Gói hội viên không tồn tại hoặc đã ngừng dùng', status: 404 }
  }

  return { code: 'UNKNOWN', message: 'Lỗi máy chủ', status: 500 }
}
