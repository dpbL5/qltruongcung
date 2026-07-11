import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { registerMemberSchema } from '@/lib/validations/membership'
import { registerMember, mapRegisterMemberError } from '@/lib/business/use-cases/registerMember'

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

    const result = await registerMember({
      staffId: auth.userId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      planId: parsed.data.planId,
      paymentMethod: parsed.data.paymentMethod,
      paidAt,
      notes: parsed.data.notes,
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('POST /api/memberships/register error:', error)
    const mapped = mapRegisterMemberError(error as Error)
    return NextResponse.json(
      { success: false, code: mapped.code, error: mapped.message },
      { status: mapped.status }
    )
  }
}
