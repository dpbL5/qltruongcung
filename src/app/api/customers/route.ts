import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createCustomerSchema } from '@/lib/validations/customer'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type')
    const includeMembershipStatus = searchParams.get('includeMembershipStatus') === 'true'
    const page = clampPositiveInt(searchParams.get('page'), 1, 1, 500)
    const limit = clampPositiveInt(searchParams.get('limit'), 20, 1, 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }
    if (type === 'WALK_IN' || type === 'MEMBER') {
      where.type = type
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

    if (!includeMembershipStatus || customers.length === 0) {
      return NextResponse.json({
        success: true,
        data: customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    const now = new Date()
    const customerIds = customers.map((customer) => customer.id)
    const memberships = await prisma.membership.findMany({
      where: {
        customerId: { in: customerIds },
        status: 'ACTIVE',
      },
      include: { plan: true },
      orderBy: [{ customerId: 'asc' }, { expiresAt: 'desc' }],
    })

    const membershipsByCustomer = new Map<string, typeof memberships>()
    for (const membership of memberships) {
      const existing = membershipsByCustomer.get(membership.customerId) ?? []
      existing.push(membership)
      membershipsByCustomer.set(membership.customerId, existing)
    }

    const data = customers.map((customer) => {
      const customerMemberships = membershipsByCustomer.get(customer.id) ?? []
      const currentMembership = customerMemberships.find((membership) =>
        membership.startsAt <= now && membership.expiresAt > now
      ) ?? null
      const latestMembership = customerMemberships[0] ?? null

      return {
        ...customer,
        currentMembership,
        latestMembership,
        membershipStatus: currentMembership
          ? 'ACTIVE'
          : latestMembership
            ? 'EXPIRED'
            : 'NONE',
      }
    })

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('GET /api/customers error:', error)
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
    await requireAuth()

    const body = await request.json()
    const parsed = createCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        type: parsed.data.type,
      },
    })

    return NextResponse.json({ success: true, data: customer }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('POST /api/customers error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
