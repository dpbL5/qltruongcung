import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireMutationAuth } from '@/lib/auth'
import { renewMembershipSchema } from '@/lib/validations/membership'
import { renewMembership, mapRenewMembershipError } from '@/lib/business/use-cases/renewMembership'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMutationAuth(request)

    const body = await request.json()
    const parsed = renewMembershipSchema.safeParse(body)

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

    const result = await renewMembership({
      staffId: auth.userId,
      customerId: parsed.data.customerId,
      planId: parsed.data.planId,
      paymentMethod: parsed.data.paymentMethod,
      paidAt,
      notes: parsed.data.notes,
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'CSRF_MISMATCH') {
      return NextResponse.json({ success: false, error: 'Yêu cầu không hợp lệ (CSRF)' }, { status: 403 })
    }
    console.error('POST /api/memberships/renew error:', error)
    const mapped = mapRenewMembershipError(error as Error)
    return NextResponse.json(
      { success: false, code: mapped.code, error: mapped.message },
      { status: mapped.status }
    )
  }
}
