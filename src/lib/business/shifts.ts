import { Prisma } from '@/generated/prisma/client'

type ShiftLookupStore = Pick<Prisma.TransactionClient, 'shift'>
type ShiftStore = Pick<Prisma.TransactionClient, 'shift' | 'payment'>

export const shiftWithParticipantsInclude = {
  staff: { select: { id: true, fullName: true } },
  participants: {
    where: { leftAt: null },
    include: { staff: { select: { id: true, fullName: true } } },
    orderBy: { joinedAt: 'asc' },
  },
} satisfies Prisma.ShiftInclude

export const shiftWithAllParticipantsInclude = {
  staff: { select: { id: true, fullName: true } },
  participants: {
    include: { staff: { select: { id: true, fullName: true, username: true, role: true, isActive: true } } },
    orderBy: { joinedAt: 'asc' },
  },
  _count: {
    select: {
      sessions: true,
      payments: true,
      membershipPayments: true,
    },
  },
} satisfies Prisma.ShiftInclude

export async function findOpenShiftForStaff(
  db: ShiftLookupStore,
  staffId: string
) {
  return db.shift.findFirst({
    where: {
      status: 'OPEN',
      OR: [
        { staffId },
        {
          participants: {
            some: {
              staffId,
              leftAt: null,
            },
          },
        },
      ],
    },
    include: shiftWithParticipantsInclude,
    orderBy: { openedAt: 'desc' },
  })
}

export async function findOpenOperationalShift(db: ShiftLookupStore) {
  return db.shift.findFirst({
    where: { status: 'OPEN' },
    include: shiftWithParticipantsInclude,
    orderBy: { openedAt: 'desc' },
  })
}

export async function calculateExpectedCash(
  db: ShiftStore,
  shiftId: string
): Promise<number> {
  const shift = await db.shift.findUnique({ where: { id: shiftId } })
  if (!shift) throw new Error('SHIFT_NOT_FOUND')

  const cashPayments = await db.payment.aggregate({
    where: {
      shiftId,
      paymentMethod: 'CASH',
    },
    _sum: { grandTotal: true },
  })

  return Number(shift.openingCash) + Number(cashPayments._sum.grandTotal ?? 0)
}
