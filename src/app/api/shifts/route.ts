import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { openShiftSchema } from '@/lib/validations/shift'
import {
  findOpenOperationalShift,
  findOpenShiftForStaff,
  shiftWithAllParticipantsInclude,
  shiftWithParticipantsInclude,
} from '@/lib/business/shifts'
import { logActivity } from '@/lib/business/audit'

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
      const shift = await findOpenShiftForStaff(prisma, auth.userId)
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
    const auth = await requireAuth()

    const body = await request.json()
    const parsed = openShiftSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await openOrJoinShift(auth.userId, parsed.data)

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
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('POST /api/shifts error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}

async function openOrJoinShift(
  staffId: string,
  data: { openingCash: number; notes?: string }
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const currentShift = await findOpenShiftForStaff(tx, staffId)
        if (currentShift) {
          return { shift: currentShift, created: false, joined: false }
        }

        const openShift = await findOpenOperationalShift(tx)
        if (openShift) {
          await tx.shiftParticipant.upsert({
            where: {
              shiftId_staffId: {
                shiftId: openShift.id,
                staffId,
              },
            },
            update: {
              leftAt: null,
              role: 'STAFF',
            },
            create: {
              shiftId: openShift.id,
              staffId,
              role: 'STAFF',
            },
          })

          await logActivity(tx, {
            userId: staffId,
            action: 'SHIFT_JOIN',
            entityType: 'Shift',
            entityId: openShift.id,
            details: { joinedAt: new Date().toISOString() },
          })

          const joinedShift = await tx.shift.findUniqueOrThrow({
            where: { id: openShift.id },
            include: shiftWithParticipantsInclude,
          })

          return { shift: joinedShift, created: false, joined: true }
        }

        const newShift = await tx.shift.create({
          data: {
            staffId,
            openSlot: 'OPERATIONAL',
            openingCash: data.openingCash,
            notes: data.notes,
            participants: {
              create: {
                staffId,
                role: 'LEAD',
              },
            },
          },
          include: shiftWithParticipantsInclude,
        })

        await logActivity(tx, {
          userId: staffId,
          action: 'SHIFT_OPEN',
          entityType: 'Shift',
          entityId: newShift.id,
          details: {
            openingCash: data.openingCash,
          },
        })

        return { shift: newShift, created: true, joined: false }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2002' || error.code === 'P2034')

      if (!isRetryable || attempt === 1) {
        throw error
      }
    }
  }

  throw new Error('SHIFT_OPEN_FAILED')
}
