import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { closeShiftSchema } from '@/lib/validations/shift'
import { calculateExpectedCash, shiftWithParticipantsInclude } from '@/lib/business/shifts'
import { logActivity } from '@/lib/business/audit'

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

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        participants: {
          where: { leftAt: null },
          select: { staffId: true },
        },
      },
    })
    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy ca làm' },
        { status: 404 }
      )
    }

    if (shift.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: 'Ca làm đã đóng' },
        { status: 400 }
      )
    }

    const isActiveParticipant = shift.participants.some(
      (participant) => participant.staffId === auth.userId
    )

    if (auth.role !== 'ADMIN' && shift.staffId !== auth.userId && !isActiveParticipant) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền đóng ca này' },
        { status: 403 }
      )
    }

    const closedAt = new Date()

    // ── Tính expected cash trong cùng transaction để tránh race condition ──
    const updated = await prisma.$transaction(async (tx) => {
      const expectedCash = await calculateExpectedCash(tx, id)
      const closingCash = parsed.data.closingCash
      const cashDifference = closingCash - expectedCash

      await tx.shiftParticipant.updateMany({
        where: {
          shiftId: id,
          leftAt: null,
        },
        data: {
          leftAt: closedAt,
        },
      })

      const closedShift = await tx.shift.update({
        where: { id },
        data: {
          status: 'CLOSED',
          openSlot: null,
          closedAt,
          closingCash,
          expectedCash,
          cashDifference,
          notes: parsed.data.notes,
        },
        include: shiftWithParticipantsInclude,
      })

      await logActivity(tx, {
        userId: auth.userId,
        action: 'SHIFT_CLOSE',
        entityType: 'Shift',
        entityId: id,
        details: {
          closedBy: {
            userId: auth.userId,
            username: auth.username,
            fullName: auth.fullName,
            role: auth.role,
          },
          expectedCash,
          closingCash,
          cashDifference,
          closedAt: closedAt.toISOString(),
        },
      })

      return closedShift
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 })
    }
    if (message === 'SHIFT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ca làm' }, { status: 404 })
    }
    console.error('POST /api/shifts/[id]/close error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
