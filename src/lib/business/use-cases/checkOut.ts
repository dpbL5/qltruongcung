import { logActivity } from '@/lib/business/audit'
import { findActiveMembership } from '@/lib/business/memberships'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { prisma } from '@/lib/prisma'
import { calculateSessionPrice } from '@/lib/pricing'
import { generateInvoiceNo } from '@/lib/business/invoices'
import type { PaymentMethod } from '@/types'

export interface CheckoutLineInput {
  productId: string
  quantity: number
}

export interface CheckoutInput {
  sessionId: string
  staffId: string
  paymentMethod: PaymentMethod
  endTime?: Date
  items: CheckoutLineInput[]
  notes?: string
}

export interface CheckoutResult {
  sessionId: string
  invoiceId: string
  invoiceNo: string
  customerName: string
  startTime: Date
  endTime: Date
  totalHours: number
  hourlyRate: number
  subtotal: number
  playSubtotal: number
  productSubtotal: number
  typeDiscount: number
  volumeDiscount: number
  grandTotal: number
  isMemberSession: boolean
  paymentMethod: PaymentMethod
  paymentId: string
}

interface CheckoutLine {
  productId: string
  type: 'PRODUCT' | 'SERVICE'
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export async function checkOut({
  sessionId,
  staffId,
  paymentMethod,
  endTime = new Date(),
  items,
  notes,
}: CheckoutInput): Promise<CheckoutResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { customer: true, membership: true },
  })

  if (!session) {
    throw new Error('SESSION_NOT_FOUND')
  }
  if (session.status !== 'ACTIVE') {
    throw new Error(session.status === 'COMPLETED' ? 'SESSION_COMPLETED' : 'SESSION_CANCELLED')
  }
  if (endTime < session.startTime) {
    throw new Error('END_TIME_BEFORE_START')
  }

  const pricing = await calculateSessionPrice(sessionId, endTime)
  const playDiscountTotal = pricing.typeDiscount + pricing.volumeDiscount
  const playTotal = Math.max(0, pricing.grandTotal)

  const quantityByProductId = new Map<string, number>()
  for (const item of items) {
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity
    )
  }

  const productIds = Array.from(quantityByProductId.keys())
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          costPrice: true,
          stockQuantity: true,
          isActive: true,
        },
      })
    : []

  if (products.length !== productIds.length) {
    throw new Error('PRODUCT_NOT_FOUND')
  }

  const checkoutLines: CheckoutLine[] = products.map((product) => {
    const quantity = quantityByProductId.get(product.id) ?? 0
    const unitPrice = Number(product.price)
    return {
      productId: product.id,
      type: product.type,
      description: product.name,
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice,
    }
  })

  const productSubtotal = checkoutLines.reduce((sum, line) => sum + line.subtotal, 0)
  const invoiceSubtotal = pricing.subtotal + productSubtotal
  const invoiceGrandTotal = playTotal + productSubtotal
  const paidAt = new Date()

  const result = await prisma.$transaction(async (tx) => {
    // ── Kiểm tra ca làm trong transaction để tránh TOCTOU race ──
    const openShift = await findOpenShiftForStaff(tx, staffId)
    if (!openShift) {
      throw new Error('SHIFT_REQUIRED')
    }
    if (session.shiftId && session.shiftId !== openShift.id) {
      throw new Error('SHIFT_MISMATCH')
    }

    const shiftId = session.shiftId ?? openShift.id

    // ── Re-validate membership trong transaction (TOCTOU guard) ──
    if (pricing.isMemberSession) {
      const activeNow = await findActiveMembership(tx, session.customerId, new Date())
      if (!activeNow) {
        throw new Error('MEMBERSHIP_EXPIRED_DURING_CHECKOUT')
      }
    }

    const invoice = await tx.invoice.create({
      data: {
        invoiceNo: generateInvoiceNo(),
        customerId: session.customerId,
        sessionId,
        shiftId,
        staffId,
        status: 'PAID',
        subtotal: invoiceSubtotal,
        discountTotal: playDiscountTotal,
        grandTotal: invoiceGrandTotal,
        paidAt,
        notes,
      },
    })

    await tx.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        type: 'PLAY_TIME',
        description: pricing.isMemberSession
          ? 'Giờ chơi hội viên'
          : 'Giờ chơi khách vãng lai',
        quantity: pricing.totalHours,
        unitPrice: pricing.hourlyRate,
        subtotal: pricing.subtotal,
        discountAmount: playDiscountTotal,
        total: playTotal,
        metadata: {
          sessionId,
          customerType: session.customer.type,
          membershipId: session.membershipId,
          isMemberSession: pricing.isMemberSession,
        },
      },
    })

    for (const line of checkoutLines) {
      const latestProduct = await tx.product.findUnique({
        where: { id: line.productId },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          costPrice: true,
          stockQuantity: true,
          isActive: true,
        },
      })

      if (!latestProduct || !latestProduct.isActive) {
        throw new Error('PRODUCT_UNAVAILABLE')
      }

      const invoiceItem = await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: latestProduct.id,
          type: latestProduct.type,
          description: latestProduct.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          subtotal: line.subtotal,
          discountAmount: 0,
          total: line.subtotal,
        },
      })

      if (latestProduct.type === 'PRODUCT') {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: latestProduct.id,
            stockQuantity: { gte: line.quantity },
          },
          data: {
            stockQuantity: { decrement: line.quantity },
          },
        })

        if (stockUpdate.count === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${latestProduct.name}`)
        }

        await tx.stockMovement.create({
          data: {
            productId: latestProduct.id,
            invoiceItemId: invoiceItem.id,
            shiftId,
            staffId,
            type: 'SALE',
            quantity: -line.quantity,
            unitCost: latestProduct.costPrice,
            reason: `Bán kèm phiên ${sessionId}`,
          },
        })
      }
    }

    const payment = await tx.payment.create({
      data: {
        sessionId,
        invoiceId: invoice.id,
        shiftId,
        staffId,
        totalHours: pricing.totalHours,
        subtotal: invoiceSubtotal,
        discountTotal: playDiscountTotal,
        grandTotal: invoiceGrandTotal,
        paymentMethod,
        paidAt,
        notes,
      },
    })

    await tx.session.update({
      where: { id: sessionId },
      data: {
        shiftId,
        endTime,
        status: 'COMPLETED',
        totalHours: pricing.totalHours,
        subtotal: pricing.subtotal,
        discountAmount: playDiscountTotal,
        totalAmount: invoiceGrandTotal,
      },
    })

    await tx.customer.update({
      where: { id: session.customerId },
      data: {
        totalHoursPlayed: { increment: pricing.totalHours },
        totalSpent: { increment: invoiceGrandTotal },
      },
    })

    await logActivity(tx, {
      userId: staffId,
      action: 'SESSION_CHECK_OUT',
      entityType: 'Session',
      entityId: sessionId,
      details: {
        invoiceId: invoice.id,
        paymentId: payment.id,
        shiftId: shiftId ?? null,
        grandTotal: invoiceGrandTotal,
        productSubtotal,
        isMemberSession: pricing.isMemberSession,
      },
    })

    return { invoice, payment }
  })

  return {
    sessionId,
    invoiceId: result.invoice.id,
    invoiceNo: result.invoice.invoiceNo,
    customerName: session.customer.fullName,
    startTime: session.startTime,
    endTime,
    totalHours: pricing.totalHours,
    hourlyRate: pricing.hourlyRate,
    subtotal: invoiceSubtotal,
    playSubtotal: pricing.subtotal,
    productSubtotal,
    typeDiscount: pricing.typeDiscount,
    volumeDiscount: pricing.volumeDiscount,
    grandTotal: invoiceGrandTotal,
    isMemberSession: pricing.isMemberSession,
    paymentMethod,
    paymentId: result.payment.id,
  }
}

export function mapCheckoutError(error: Error): { code: string; message: string; status: number } {
  const message = error.message

  if (message === 'SESSION_NOT_FOUND') {
    return { code: 'SESSION_NOT_FOUND', message: 'Không tìm thấy phiên', status: 404 }
  }
  if (message === 'SESSION_COMPLETED') {
    return { code: 'SESSION_COMPLETED', message: 'Phiên đã kết thúc rồi', status: 400 }
  }
  if (message === 'SESSION_CANCELLED') {
    return { code: 'SESSION_CANCELLED', message: 'Phiên đã bị hủy rồi', status: 400 }
  }
  if (message === 'END_TIME_BEFORE_START') {
    return { code: 'END_TIME_BEFORE_START', message: 'Thời gian checkout không được trước lúc check-in', status: 400 }
  }
  if (message === 'PRODUCT_NOT_FOUND') {
    return { code: 'PRODUCT_NOT_FOUND', message: 'Có sản phẩm không tồn tại hoặc đã ngừng bán', status: 400 }
  }
  if (message === 'PRODUCT_UNAVAILABLE') {
    return { code: 'PRODUCT_UNAVAILABLE', message: 'Có sản phẩm không còn bán', status: 400 }
  }
  if (message.startsWith('INSUFFICIENT_STOCK:')) {
    return { code: 'INSUFFICIENT_STOCK', message: `${message.replace('INSUFFICIENT_STOCK:', '')} không đủ tồn kho`, status: 400 }
  }
  if (message === 'SHIFT_REQUIRED') {
    return { code: 'SHIFT_REQUIRED', message: 'Cần mở hoặc tham gia ca trước khi checkout', status: 409 }
  }
  if (message === 'SHIFT_MISMATCH') {
    return { code: 'SHIFT_MISMATCH', message: 'Phiên này không thuộc ca đang mở của nhân viên hiện tại', status: 409 }
  }
  if (message === 'MEMBERSHIP_EXPIRED_DURING_CHECKOUT') {
    return { code: 'MEMBERSHIP_EXPIRED_DURING_CHECKOUT', message: 'Gói hội viên đã hết hạn trong lúc checkout. Vui lòng thử lại.', status: 409 }
  }

  return { code: 'UNKNOWN', message: 'Lỗi máy chủ', status: 500 }
}
