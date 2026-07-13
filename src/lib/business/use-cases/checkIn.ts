import { logActivity } from '@/lib/business/audit'
import { findActiveMembership } from '@/lib/business/memberships'
import { findOpenShiftForStaff } from '@/lib/business/shifts'
import { prisma } from '@/lib/prisma'
import { findApplicableRate } from '@/lib/pricing'
import { getDayType, getVnHour, parseStartOfDay, parseEndOfDay } from '@/lib/utils'

export interface CheckInInput {
  staffId: string
  customerId?: string
  now?: Date
}

export interface CheckInResult {
  id: string
  customerId: string
  staffId: string
  shiftId: string | null
  membershipId: string | null
  startTime: Date
  hourlyRate: number
  status: 'ACTIVE'
  customer: { id: string; fullName: string; type: 'WALK_IN' | 'MEMBER' }
  membership: { id: string; startsAt: Date; expiresAt: Date } | null
  shift: { id: string; openedAt: Date; status: 'OPEN' | 'CLOSED' } | null
}

export async function checkIn({
  staffId,
  customerId,
  now = new Date(),
}: CheckInInput): Promise<CheckInResult> {
  if (!customerId) {
    return checkInAnonymousWalkIn({ staffId, now })
  }

  return checkInRegisteredCustomer({ staffId, customerId, now })
}

async function checkInAnonymousWalkIn({
  staffId,
  now,
}: {
  staffId: string
  now: Date
}) {
  const applicableRate = await findApplicableRate(getVnHour(now), getDayType(now), now)

  const result = await prisma.$transaction(async (tx) => {
    // ── Dùng parseStartOfDay/parseEndOfDay để tính mốc ngày theo giờ Việt Nam (UTC+7) ──
    const todayStr = now.toISOString().slice(0, 10)
    const today = parseStartOfDay(todayStr)
    const tomorrow = parseEndOfDay(todayStr)
    // parseEndOfDay trả về 23:59:59.999 VN, cần +1ms để làm cận trên cho lt
    const tomorrowBoundary = new Date(tomorrow.getTime() + 1)

    const anonCount = await tx.customer.count({
      where: {
        type: 'WALK_IN',
        phone: null,
        createdAt: { gte: today, lt: tomorrowBoundary },
      },
    })

    const anonCustomer = await tx.customer.create({
      data: {
        fullName: `Khách #${String(anonCount + 1).padStart(3, '0')}`,
        type: 'WALK_IN',
      },
    })

    const openShift = await findOpenShiftForStaff(tx, staffId)
    if (!openShift) {
      throw new Error('SHIFT_REQUIRED')
    }

    const session = await tx.session.create({
      data: {
        customerId: anonCustomer.id,
        staffId,
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
      userId: staffId,
      action: 'SESSION_CHECK_IN',
      entityType: 'Session',
      entityId: session.id,
      details: {
        customerId: anonCustomer.id,
        customerType: 'WALK_IN',
        shiftId: openShift.id,
        hourlyRate: applicableRate,
      },
    })

    return session
  })

  return {
    ...result,
    hourlyRate: Number(result.hourlyRate),
  } as CheckInResult
}

async function checkInRegisteredCustomer({
  staffId,
  customerId,
  now,
}: {
  staffId: string
  customerId: string
  now: Date
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })
  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND')
  }

  const activeSession = await prisma.session.findFirst({
    where: { customerId, status: 'ACTIVE' },
  })
  if (activeSession) {
    throw new Error('ACTIVE_SESSION_EXISTS')
  }

  let membershipId: string | undefined
  let rate = 0

  if (customer.type === 'MEMBER') {
    const activeMembership = await findActiveMembership(prisma, customer.id, now)
    if (!activeMembership) {
      throw new Error('MEMBERSHIP_REQUIRED')
    }
    membershipId = activeMembership.id
    rate = 0
  } else {
    rate = await findApplicableRate(getVnHour(now), getDayType(now), now)
  }

  const result = await prisma.$transaction(async (tx) => {
    const openShift = await findOpenShiftForStaff(tx, staffId)
    if (!openShift) {
      throw new Error('SHIFT_REQUIRED')
    }

    const session = await tx.session.create({
      data: {
        customerId: customer.id,
        staffId,
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
      userId: staffId,
      action: 'SESSION_CHECK_IN',
      entityType: 'Session',
      entityId: session.id,
      details: {
        customerId: customer.id,
        customerType: customer.type,
        membershipId,
        shiftId: openShift.id,
        hourlyRate: rate,
      },
    })

    return session
  })

  return {
    ...result,
    hourlyRate: Number(result.hourlyRate),
  } as CheckInResult
}

export function mapCheckInError(error: Error): { code: string; message: string; status: number } {
  const message = error.message

  if (message === 'CUSTOMER_NOT_FOUND') {
    return { code: 'CUSTOMER_NOT_FOUND', message: 'Không tìm thấy khách hàng', status: 404 }
  }
  if (message === 'ACTIVE_SESSION_EXISTS') {
    return { code: 'ACTIVE_SESSION_EXISTS', message: 'Khách đang có phiên chơi chưa kết thúc', status: 400 }
  }
  if (message === 'MEMBERSHIP_REQUIRED') {
    return {
      code: 'MEMBERSHIP_REQUIRED',
      message: 'Hội viên chưa có gói còn hiệu lực. Vui lòng gia hạn trước khi check-in.',
      status: 409,
    }
  }
  if (message === 'PRICING_RULE_NOT_FOUND') {
    return {
      code: 'PRICING_RULE_NOT_FOUND',
      message: 'Không có quy tắc bảng giá hiệu lực cho thời điểm hiện tại. Vui lòng cập nhật bảng giá trước khi check-in khách vãng lai.',
      status: 400,
    }
  }
  if (message === 'SHIFT_REQUIRED') {
    return { code: 'SHIFT_REQUIRED', message: 'Cần mở hoặc tham gia ca trước khi check-in', status: 409 }
  }

  return { code: 'UNKNOWN', message: 'Lỗi máy chủ', status: 500 }
}
