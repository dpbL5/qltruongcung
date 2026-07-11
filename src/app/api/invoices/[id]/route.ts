import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    const { id } = await params

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID hoá đơn không hợp lệ' },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, fullName: true, phone: true, type: true },
        },
        session: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
        shift: {
          select: { id: true, openedAt: true, closedAt: true },
        },
        staff: {
          select: { id: true, fullName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, type: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          include: {
            staff: { select: { id: true, fullName: true } },
          },
        },
        membershipPayments: {
          include: {
            membership: {
              include: {
                plan: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy hoá đơn' },
        { status: 404 }
      )
    }

    const isAdmin = auth.role === 'ADMIN'
    const isOwner = invoice.staffId === auth.userId
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền xem hoá đơn này' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        status: invoice.status,
        subtotal: Number(invoice.subtotal),
        discountTotal: Number(invoice.discountTotal),
        grandTotal: Number(invoice.grandTotal),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString(),
        customer: invoice.customer
          ? {
              id: invoice.customer.id,
              fullName: invoice.customer.fullName,
              phone: invoice.customer.phone,
              type: invoice.customer.type,
            }
          : null,
        session: invoice.session
          ? {
              id: invoice.session.id,
              startTime: invoice.session.startTime.toISOString(),
              endTime: invoice.session.endTime?.toISOString() ?? null,
              status: invoice.session.status,
            }
          : null,
        shift: invoice.shift
          ? {
              id: invoice.shift.id,
              openedAt: invoice.shift.openedAt.toISOString(),
              closedAt: invoice.shift.closedAt?.toISOString() ?? null,
            }
          : null,
        staff: { id: invoice.staff.id, fullName: invoice.staff.fullName },
        items: invoice.items.map((item) => ({
          id: item.id,
          type: item.type,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          discountAmount: Number(item.discountAmount),
          total: Number(item.total),
          product: item.product
            ? { id: item.product.id, name: item.product.name, sku: item.product.sku, type: item.product.type }
            : null,
          metadata: item.metadata,
        })),
        payments: invoice.payments.map((payment) => ({
          id: payment.id,
          paymentMethod: payment.paymentMethod,
          grandTotal: Number(payment.grandTotal),
          paidAt: payment.paidAt.toISOString(),
          notes: payment.notes,
          staff: { id: payment.staff.id, fullName: payment.staff.fullName },
        })),
        membershipPayments: invoice.membershipPayments.map((mp) => ({
          id: mp.id,
          amount: Number(mp.amount),
          paidAt: mp.paidAt.toISOString(),
          planName: mp.membership?.plan?.name ?? null,
        })),
      },
    })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('GET /api/invoices/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
