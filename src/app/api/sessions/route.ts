import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/business/audit'
import { findActiveMembership } from '@/lib/business/memberships'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { findApplicableRate } from '@/lib/pricing'
import { prisma } from '@/lib/prisma'
import { getDayType } from '@/lib/utils'
import { createSessionSchema } from '@/lib/validations/session'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const date = searchParams.get('date')
    const page = clampPositiveInt(searchParams.get('page'), 1, 1, 500)
    const limit = clampPositiveInt(searchParams.get('limit'), 20, 1, 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (date) {
      const dayStart = new Date(date)
      const dayEnd = new Date(date)
      dayEnd.setDate(dayEnd.getDate() + 1)
      where.createdAt = { gte: dayStart, lt: dayEnd }
    }

    const [data, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, type: true } },
          staff: { select: { id: true, fullName: true } },
          membership: { select: { id: true, startsAt: true, expiresAt: true } },
          shift: { select: { id: true, openedAt: true, status: true } },
          payment: { select: { paymentMethod: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.session.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('GET /api/sessions error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}

function clampPositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()

    const body = await request.json()
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const now = new Date()
    const { customerId } = parsed.data

    if (!customerId) {
      const applicableRate = await findApplicableRate(now.getHours(), getDayType(now), now)

      // ── Tạo khách vãng lai ẩn danh trong transaction để tránh race condition ──
      const result = await prisma.$transaction(async (tx) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const anonCount = await tx.customer.count({
          where: {
            type: 'WALK_IN',
            phone: null,
            createdAt: { gte: today, lt: tomorrow },
          },
        })

        const anonCustomer = await tx.customer.create({
          data: {
            fullName: `Khách #${String(anonCount + 1).padStart(3, '0')}`,
            type: 'WALK_IN',
          },
        })

        const openShift = await findOpenShiftForStaff(tx, auth.userId)
        if (!openShift) {
          throw new Error('SHIFT_REQUIRED')
        }

        const session = await tx.session.create({
          data: {
            customerId: anonCustomer.id,
            staffId: auth.userId,
            shiftId: openShift.id,
            startTime: now,
            hourlyRate: applicableRate,
            status: 'ACTIVE',
          },
          include: {
            customer: { select: { id: true, fullName: true, type: true } },
            membership: { select: { id: true, startsAt: true, expiresAt: true } },
            shift: { select: { id: true, openedAt: true, status: true } },
          },
        })

        await logActivity(tx, {
          userId: auth.userId,
          action: 'SESSION_CHECK_IN',
          entityType: 'Session',
          entityId: session.id,
          details: {
            customerId: anonCustomer.id,
            customerType: 'WALK_IN',
            shiftId: openShift.id,
          },
        })

        return session
      })

      return NextResponse.json({ success: true, data: result }, { status: 201 })
    }

    // ── Check-in khách đã có hồ sơ ──
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      )
    }

    const activeSession = await prisma.session.findFirst({
      where: { customerId, status: 'ACTIVE' },
    })
    if (activeSession) {
      return NextResponse.json(
        { success: false, error: 'Khách đang có phiên chơi chưa kết thúc' },
        { status: 400 }
      )
    }

    let membershipId: string | undefined
    let rate = 0

    if (customer.type === 'MEMBER') {
      const activeMembership = await findActiveMembership(prisma, customer.id, now)
      if (!activeMembership) {
        return NextResponse.json(
          {
            success: false,
            code: 'MEMBERSHIP_REQUIRED',
            error: 'Hội viên chưa có gói còn hiệu lực. Vui lòng gia hạn trước khi check-in.',
            data: { customerId: customer.id },
          },
          { status: 409 }
        )
      }

      membershipId = activeMembership.id
      rate = 0
    } else {
      rate = await findApplicableRate(now.getHours(), getDayType(now), now)
    }

    const newSession = await prisma.$transaction(async (tx) => {
      const openShift = await findOpenShiftForStaff(tx, auth.userId)
      if (!openShift) {
        throw new Error('SHIFT_REQUIRED')
      }

      const session = await tx.session.create({
        data: {
          customerId: customer.id,
          staffId: auth.userId,
          shiftId: openShift.id,
          membershipId,
          startTime: now,
          hourlyRate: rate,
          status: 'ACTIVE',
        },
        include: {
          customer: { select: { id: true, fullName: true, type: true } },
          membership: { select: { id: true, startsAt: true, expiresAt: true } },
          shift: { select: { id: true, openedAt: true, status: true } },
        },
      })

      await logActivity(tx, {
        userId: auth.userId,
        action: 'SESSION_CHECK_IN',
        entityType: 'Session',
        entityId: session.id,
        details: {
          customerId: customer.id,
          customerType: customer.type,
          membershipId,
          shiftId: openShift.id,
        },
      })

      return session
    })

    return NextResponse.json({ success: true, data: newSession }, { status: 201 })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'PRICING_RULE_NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: 'Không có quy tắc bảng giá hiệu lực cho thời điểm hiện tại. Vui lòng cập nhật bảng giá trước khi check-in khách vãng lai.',
        },
        { status: 400 }
      )
    }
    if (message === 'SHIFT_REQUIRED') {
      return NextResponse.json(
        { success: false, error: 'Cần mở hoặc tham gia ca trước khi check-in' },
        { status: 409 }
      )
    }
    console.error('POST /api/sessions error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
