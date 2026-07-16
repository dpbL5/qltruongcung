import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireMutationAuth } from '@/lib/auth'
import { openShiftSchema } from '@/lib/validations/shift'
import {
  findOpenShiftForStaff,
  findOpenOperationalShift,
  shiftWithParticipantsInclude,
  shiftWithAllParticipantsInclude,
} from '@/lib/business/shifts'
import { openOrJoinShift, mapOpenOrJoinShiftError } from '@/lib/business/use-cases/openOrJoinShift'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()

    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current') === 'true'
    const openOperational = searchParams.get('openOperational') === 'true'
    const includeParticipants = searchParams.get('includeParticipants')
    const takeParam = Number(searchParams.get('limit') ?? 50)
    const take = Number.isInteger(takeParam) && takeParam > 0
      ? Math.min(takeParam, 100)
      : 50
    const statusParam = searchParams.get('status')
    const status =
      statusParam === 'OPEN' || statusParam === 'CLOSED'
        ? statusParam
        : undefined

    if (current) {
      let shift = await findOpenShiftForStaff(prisma, auth.userId)
      if (!shift && auth.role === 'ADMIN') {
        shift = await findOpenOperationalShift(prisma)
      }
      return NextResponse.json({ success: true, data: shift })
    }

    if (openOperational) {
      const shift = await findOpenOperationalShift(prisma)
      return NextResponse.json({ success: true, data: shift })
    }

    const shifts = await prisma.shift.findMany({
      where: {
        ...(auth.role === 'STAFF'
          ? {
              OR: [
                { staffId: auth.userId },
                { participants: { some: { staffId: auth.userId } } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
      },
      include: includeParticipants === 'all'
        ? shiftWithAllParticipantsInclude
        : shiftWithParticipantsInclude,
      orderBy: { openedAt: 'desc' },
      take,
    })

    return NextResponse.json({ success: true, data: shifts })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('GET /api/shifts error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMutationAuth(request)

    const body = await request.json()
    const parsed = openShiftSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await openOrJoinShift({
      staffId: auth.userId,
      openingCash: parsed.data.openingCash,
      notes: parsed.data.notes,
    })

    return NextResponse.json(
      {
        success: true,
        data: result.shift,
        message: result.created
          ? 'Đã mở ca'
          : result.joined
            ? 'Đã tham gia ca đang mở'
            : 'Bạn đang ở trong ca đang mở',
      },
      { status: result.created ? 201 : 200 }
    )
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'CSRF_MISMATCH') {
      return NextResponse.json({ success: false, error: 'Yêu cầu không hợp lệ (CSRF)' }, { status: 403 })
    }
    console.error('POST /api/shifts error:', error)
    const mapped = mapOpenOrJoinShiftError(error as Error)
    return NextResponse.json(
      { success: false, code: mapped.code, error: mapped.message },
      { status: mapped.status }
    )
  }
}
