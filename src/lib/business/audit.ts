import { Prisma } from '@/generated/prisma/client'

type AuditStore = Pick<Prisma.TransactionClient, 'activityLog'>

interface LogActivityInput {
  userId: string
  action: string
  entityType: string
  entityId: string
  details?: Prisma.InputJsonValue
}

export async function logActivity(
  db: AuditStore,
  input: LogActivityInput
) {
  return db.activityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details,
    },
  })
}
