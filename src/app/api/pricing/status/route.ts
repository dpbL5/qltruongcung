import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { countApplicablePricingRules } from '@/lib/pricing'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAuth()

    const now = new Date()
    const [count, activeCount] = await Promise.all([
      prisma.pricingRule.count(),
      countApplicablePricingRules(now),
    ])

    return NextResponse.json({
      success: true,
      data: {
        count,
        activeCount,
        checkedAt: now,
      },
    })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('GET /api/pricing/status error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
