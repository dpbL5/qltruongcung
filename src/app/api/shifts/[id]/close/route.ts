import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { closeShiftSchema } from '@/lib/validations/shift'
import { closeShift, mapCloseShiftError } from '@/lib/business/use-cases/closeShift'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()

    const { id } = await params
    const body = await request.json()
    const parsed = closeShiftSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await closeShift({
      shiftId: id,
      staffId: auth.userId,
      staffRole: auth.role,
      username: auth.username,
      fullName: auth.fullName,
      closingCash: parsed.data.closingCash,
      notes: parsed.data.notes,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    const mapped = mapCloseShiftError(error as Error)
    return NextResponse.json(
      { success: false, code: mapped.code, error: mapped.message },
      { status: mapped.status }
    )
  }
}
