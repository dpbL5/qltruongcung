import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')?.trim()
    const action = searchParams.get('action')?.trim()
    const entityType = searchParams.get('entityType')?.trim()
    const search = searchParams.get('search')?.trim()
    const limit = parseLimit(searchParams.get('limit'))

    const where: Prisma.ActivityLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { entityType: { contains: search, mode: 'insensitive' } },
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
              { user: { username: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        select: {
          id: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        limit,
        total,
      },
    })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 })
    }
    console.error('GET /api/activity-logs error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT)
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}
