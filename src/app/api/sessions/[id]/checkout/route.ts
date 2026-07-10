import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { checkoutSessionSchema } from '@/lib/validations/session'
import { calculateSessionPrice } from '@/lib/pricing'
import { generateInvoiceNo } from '@/lib/business/invoices'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { logActivity } from '@/lib/business/audit'

interface CheckoutLine {
  productId: string
  type: 'PRODUCT' | 'SERVICE'
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const parsed = checkoutSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        customer: true,
        membership: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiên' },
        { status: 404 }
      )
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: `Phiên đã ${session.status === 'COMPLETED' ? 'kết thúc' : 'bị hủy'} rồi` },
        { status: 400 }
      )
    }

    const endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : new Date()
    if (endTime < session.startTime) {
      return NextResponse.json(
        { success: false, error: 'Thời gian checkout không được trước lúc check-in' },
        { status: 400 }
      )
    }

    const pricing = await calculateSessionPrice(id, endTime)
    const playDiscountTotal = pricing.typeDiscount + pricing.volumeDiscount
    const playTotal = Math.max(0, pricing.grandTotal)

    const quantityByProductId = new Map<string, number>()
    for (const item of parsed.data.items) {
      quantityByProductId.set(
        item.productId,
        (quantityByProductId.get(item.productId) ?? 0) + item.quantity
      )
    }

    const productIds = Array.from(quantityByProductId.keys())
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: { in: productIds },
            isActive: true,
          },
        })
      : []

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: 'Có sản phẩm không tồn tại hoặc đã ngừng bán' },
        { status: 400 }
      )
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

    // ── Yêu cầu ca làm đang mở để checkout (CLAUDE.md rule 14) ──
    const openShift = await findOpenShiftForStaff(prisma, auth.userId)
    if (!openShift) {
      return NextResponse.json(
        { success: false, error: 'Cần mở hoặc tham gia ca trước khi checkout' },
        { status: 409 }
      )
    }

    if (session.shiftId && session.shiftId !== openShift.id) {
      return NextResponse.json(
        { success: false, error: 'Phiên này không thuộc ca đang mở của nhân viên hiện tại' },
        { status: 409 }
      )
    }

    const shiftId = session.shiftId ?? openShift.id

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          customerId: session.customerId,
          sessionId: id,
          shiftId,
          staffId: auth.userId,
          status: 'PAID',
          subtotal: invoiceSubtotal,
          discountTotal: playDiscountTotal,
          grandTotal: invoiceGrandTotal,
          paidAt,
          notes: parsed.data.notes,
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
            sessionId: id,
            customerType: session.customer.type,
            membershipId: session.membershipId,
            isMemberSession: pricing.isMemberSession,
          },
        },
      })

      for (const line of checkoutLines) {
        const latestProduct = await tx.product.findUnique({
          where: { id: line.productId },
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
          // ── Atomic stock decrement với guard chống oversell ──
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
              staffId: auth.userId,
              type: 'SALE',
              quantity: -line.quantity,
              unitCost: latestProduct.costPrice,
              reason: `Bán kèm phiên ${id}`,
            },
          })
        }
      }

      const payment = await tx.payment.create({
        data: {
          sessionId: id,
          invoiceId: invoice.id,
          shiftId,
          staffId: auth.userId,
          totalHours: pricing.totalHours,
          subtotal: invoiceSubtotal,
          discountTotal: playDiscountTotal,
          grandTotal: invoiceGrandTotal,
          paymentMethod: parsed.data.paymentMethod,
          paidAt,
          notes: parsed.data.notes,
        },
      })

      await tx.session.update({
        where: { id },
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
        userId: auth.userId,
        action: 'SESSION_CHECK_OUT',
        entityType: 'Session',
        entityId: id,
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

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        invoiceId: result.invoice.id,
        invoiceNo: result.invoice.invoiceNo,
        customer: session.customer.fullName,
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
        paymentMethod: parsed.data.paymentMethod,
        paymentId: result.payment.id,
      },
    })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'PRODUCT_UNAVAILABLE') {
      return NextResponse.json({ success: false, error: 'Có sản phẩm không còn bán' }, { status: 400 })
    }
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      return NextResponse.json(
        { success: false, error: `${message.replace('INSUFFICIENT_STOCK:', '')} không đủ tồn kho` },
        { status: 400 }
      )
    }
    console.error('POST /api/sessions/[id]/checkout error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
