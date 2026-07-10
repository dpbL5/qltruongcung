import { Prisma } from '@/generated/prisma/client'

type MembershipStore = Pick<Prisma.TransactionClient, 'membership'>

export function addMonthsKeepingDay(date: Date, months: number): Date {
  const result = new Date(date)
  const originalDay = result.getDate()

  result.setDate(1)
  result.setMonth(result.getMonth() + months)

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate()

  result.setDate(Math.min(originalDay, lastDayOfTargetMonth))
  return result
}

export async function findActiveMembership(
  db: MembershipStore,
  customerId: string,
  at: Date = new Date()
) {
  return db.membership.findFirst({
    where: {
      customerId,
      status: 'ACTIVE',
      startsAt: { lte: at },
      expiresAt: { gt: at },
    },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  })
}

export async function findLatestMembership(
  db: MembershipStore,
  customerId: string
) {
  return db.membership.findFirst({
    where: {
      customerId,
      status: 'ACTIVE',
    },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  })
}

export function calculateRenewalPeriod(
  latestMembership: { expiresAt: Date } | null,
  durationMonths: number,
  paidAt: Date = new Date()
) {
  const startsAt =
    latestMembership && latestMembership.expiresAt > paidAt
      ? new Date(latestMembership.expiresAt)
      : new Date(paidAt)

  const expiresAt = addMonthsKeepingDay(startsAt, durationMonths)

  return { startsAt, expiresAt }
}
