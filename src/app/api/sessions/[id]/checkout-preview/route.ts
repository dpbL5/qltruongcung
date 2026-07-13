import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { findAvailablePromotionById } from '@/lib/business/promotions'
import { calculateSessionPrice } from '@/lib/pricing'
import { prisma } from '@/lib/prisma'
import type { PlayTimeQuote } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiên' },
        { status: 404 }
      )
    }
    if (session.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Chỉ có thể xem tạm tính cho phiên đang chơi' },
        { status: 400 }
      )
    }

    const promotionRuleId = _request.nextUrl.searchParams.get('promotionRuleId')
    const promotion = promotionRuleId
      ? await findAvailablePromotionById(promotionRuleId)
      : null

    if (promotionRuleId && !promotion) {
      return NextResponse.json(
        { success: false, error: 'Khuyến mại không còn hiệu lực để áp dụng' },
        { status: 409 }
      )
    }

    const pricing = await calculateSessionPrice(id, new Date(), promotion)
    const quote: PlayTimeQuote = {
      sessionId: id,
      totalHours: pricing.totalHours,
      hourlyRate: pricing.hourlyRate,
      subtotal: pricing.subtotal,
      discountAmount: pricing.promotionDiscount,
      grandTotal: pricing.grandTotal,
      isMemberSession: pricing.isMemberSession,
      promotion: pricing.promotion,
    }

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'PRICING_RULE_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bảng giá đã áp dụng cho phiên này' },
        { status: 409 }
      )
    }

    console.error('GET /api/sessions/[id]/checkout-preview error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
