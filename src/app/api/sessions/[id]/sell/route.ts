import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireMutationAuth } from '@/lib/auth'
import { sellItems, mapSellItemsError } from '@/lib/business/use-cases/sellItems'
import { z } from 'zod'

const sellSchema = z.object({
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD']),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('ID sản phẩm không hợp lệ'),
        quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
      })
    )
    .min(1, 'Cần chọn ít nhất một sản phẩm'),
  notes: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMutationAuth(request)
    const { id } = await params

    const body = await request.json()
    const parsed = sellSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await sellItems({
      sessionId: id,
      staffId: auth.userId,
      paymentMethod: parsed.data.paymentMethod,
      items: parsed.data.items,
      notes: parsed.data.notes,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'CSRF_MISMATCH') {
      return NextResponse.json({ success: false, error: 'Yêu cầu không hợp lệ (CSRF)' }, { status: 403 })
    }
    console.error('POST /api/sessions/[id]/sell error:', error)
    const mapped = mapSellItemsError(error as Error)
    return NextResponse.json(
      { success: false, code: mapped.code, error: mapped.message },
      { status: mapped.status }
    )
  }
}
