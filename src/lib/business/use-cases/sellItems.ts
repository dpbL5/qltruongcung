import { logActivity } from '@/lib/business/audit'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { generateInvoiceNo } from '@/lib/business/invoices'
import { prisma } from '@/lib/prisma'
import type { PaymentMethod } from '@/types'

export interface SellLineInput {
  productId: string
  quantity: number
}

export interface SellItemsInput {
  sessionId: string
  staffId: string
  paymentMethod: PaymentMethod
  items: SellLineInput[]
  notes?: string
}

export interface SellItemsResult {
  invoiceId: string
  invoiceNo: string
  paymentId: string
  grandTotal: number
}

export async function sellItems({
  sessionId,
  staffId,
  paymentMethod,
  items,
  notes,
}: SellItemsInput): Promise<SellItemsResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { customer: true },
  })

  if (!session) throw new Error('SESSION_NOT_FOUND')
  if (session.status !== 'ACTIVE') {
    throw new Error(session.status === 'COMPLETED' ? 'SESSION_COMPLETED' : 'SESSION_CANCELLED')
  }

  if (items.length === 0) throw new Error('NO_ITEMS')

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

  if (products.length !== productIds.length) throw new Error('PRODUCT_NOT_FOUND')

  const lines = products.map((product) => {
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

  const grandTotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const paidAt = new Date()

  const result = await prisma.$transaction(async (tx) => {
    // ── Kiểm tra ca làm trong transaction để tránh TOCTOU race ──
    const openShift = await findOpenShiftForStaff(tx, staffId)
    if (!openShift) throw new Error('SHIFT_REQUIRED')

    const shiftId = session.shiftId ?? openShift.id
    const invoice = await tx.invoice.create({
      data: {
        invoiceNo: generateInvoiceNo('SEL'),
        customerId: session.customerId,
        sessionId,
        shiftId,
        staffId,
        status: 'PAID',
        subtotal: grandTotal,
        discountTotal: 0,
        grandTotal,
        paidAt,
        notes,
      },
    })

    for (const line of lines) {
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
        invoiceId: invoice.id,
        shiftId,
        staffId,
        totalHours: 0,
        subtotal: grandTotal,
        discountTotal: 0,
        grandTotal,
        paymentMethod,
        paidAt,
        notes,
      },
    })

    await tx.customer.update({
      where: { id: session.customerId },
      data: {
        totalSpent: { increment: grandTotal },
      },
    })

    await logActivity(tx, {
      userId: staffId,
      action: 'SESSION_SELL',
      entityType: 'Invoice',
      entityId: invoice.id,
      details: {
        sessionId,
        paymentId: payment.id,
        shiftId,
        grandTotal,
        itemCount: lines.length,
      },
    })

    return { invoice, payment }
  })

  return {
    invoiceId: result.invoice.id,
    invoiceNo: result.invoice.invoiceNo,
    paymentId: result.payment.id,
    grandTotal,
  }
}

export function mapSellItemsError(error: Error): { code: string; message: string; status: number } {
  const message = error.message

  if (message === 'SESSION_NOT_FOUND') return { code: 'SESSION_NOT_FOUND', message: 'Không tìm thấy phiên', status: 404 }
  if (message === 'SESSION_COMPLETED') return { code: 'SESSION_COMPLETED', message: 'Phiên đã kết thúc rồi', status: 400 }
  if (message === 'SESSION_CANCELLED') return { code: 'SESSION_CANCELLED', message: 'Phiên đã bị hủy rồi', status: 400 }
  if (message === 'NO_ITEMS') return { code: 'NO_ITEMS', message: 'Chưa chọn sản phẩm để bán', status: 400 }
  if (message === 'PRODUCT_NOT_FOUND') return { code: 'PRODUCT_NOT_FOUND', message: 'Có sản phẩm không tồn tại hoặc đã ngừng bán', status: 400 }
  if (message === 'PRODUCT_UNAVAILABLE') return { code: 'PRODUCT_UNAVAILABLE', message: 'Có sản phẩm không còn bán', status: 400 }
  if (message.startsWith('INSUFFICIENT_STOCK:')) return { code: 'INSUFFICIENT_STOCK', message: `${message.replace('INSUFFICIENT_STOCK:', '')} không đủ tồn kho`, status: 400 }
  if (message === 'SHIFT_REQUIRED') return { code: 'SHIFT_REQUIRED', message: 'Cần mở hoặc tham gia ca trước khi bán hàng', status: 409 }

  return { code: 'UNKNOWN', message: 'Lỗi máy chủ', status: 500 }
}
