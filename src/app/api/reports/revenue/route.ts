import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toInputDate, parseStartOfDay, parseEndOfDay } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || toInputDate(new Date())
    const to = searchParams.get('to') || toInputDate(new Date())
    const fromDate = parseStartOfDay(from)
    const toDate = parseEndOfDay(to)

    if (fromDate > toDate) {
      return NextResponse.json(
        { success: false, error: 'Khoảng ngày không hợp lệ' },
        { status: 400 }
      )
    }

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: fromDate, lte: toDate },
        ...(auth.role === 'STAFF' ? { staffId: auth.userId } : {}),
      },
      orderBy: { paidAt: 'asc' },
    })

    const grouped: Record<string, { revenue: number; count: number }> = {}
    for (const payment of payments) {
      const key = toInputDate(payment.paidAt)
      if (!grouped[key]) grouped[key] = { revenue: 0, count: 0 }
      grouped[key].revenue += Number(payment.grandTotal)
      grouped[key].count += 1
    }

    const data = Object.entries(grouped).map(([period, value]) => ({
      period,
      revenue: value.revenue,
      sessionCount: value.count,
      avgRevenuePerSession: value.count > 0 ? Math.round(value.revenue / value.count) : 0,
    }))

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
    const totalSessions = data.reduce((sum, item) => sum + item.sessionCount, 0)

    return NextResponse.json({
      success: true,
      data,
      summary: {
        from,
        to,
        totalRevenue,
        totalSessions,
        averagePayment: totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0,
      },
    })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('GET /api/reports/revenue error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}

