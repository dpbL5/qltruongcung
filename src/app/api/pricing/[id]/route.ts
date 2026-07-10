import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logActivity } from '@/lib/business/audit'
import {
  deriveDayTypeFromDays,
  findOverlappingRules,
  normalizeDaysOfWeek,
  resolveRuleDaysOfWeek,
} from '@/lib/pricing'
import { prisma } from '@/lib/prisma'
import { parseLocalDate, parseLocalDateEnd } from '@/lib/utils'
import { updatePricingRuleSchema } from '@/lib/validations/pricing'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const parsed = updatePricingRuleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await prisma.pricingRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy quy tắc bảng giá' },
        { status: 404 }
      )
    }

    // ── Kiểm tra chồng lấn theo ngày lặp, khung giờ và hiệu lực ──
    const legacyDayType = parsed.data.dayType ?? existing.dayType
    const daysOfWeek = parsed.data.daysOfWeek !== undefined
      ? normalizeDaysOfWeek(parsed.data.daysOfWeek)
      : resolveRuleDaysOfWeek(existing.daysOfWeek, legacyDayType)
    const dayType = parsed.data.daysOfWeek !== undefined
      ? deriveDayTypeFromDays(daysOfWeek)
      : legacyDayType
    const hourFrom = parsed.data.hourFrom ?? existing.hourFrom
    const hourTo = parsed.data.hourTo !== undefined ? parsed.data.hourTo : existing.hourTo
    const effectiveFrom = parsed.data.effectiveFrom
      ? parseLocalDate(parsed.data.effectiveFrom)
      : existing.effectiveFrom
    const effectiveTo = parsed.data.effectiveTo !== undefined
      ? (parsed.data.effectiveTo ? parseLocalDateEnd(parsed.data.effectiveTo) : null)
      : existing.effectiveTo

    const overlaps = await findOverlappingRules(
      daysOfWeek,
      hourFrom,
      hourTo,
      effectiveFrom,
      effectiveTo,
      id,
    )

    const updated = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { ...parsed.data }
      if (parsed.data.name) data.name = parsed.data.name.trim()
      if (parsed.data.daysOfWeek !== undefined) {
        data.daysOfWeek = daysOfWeek
        data.dayType = dayType
      }
      if (parsed.data.effectiveFrom) data.effectiveFrom = parseLocalDate(parsed.data.effectiveFrom)
      if (parsed.data.effectiveTo !== undefined) {
        data.effectiveTo = parsed.data.effectiveTo ? parseLocalDateEnd(parsed.data.effectiveTo) : null
      }

      const rule = await tx.pricingRule.update({
        where: { id },
        data,
      })

      await logActivity(tx, {
        userId: auth.userId,
        action: 'PRICING_RULE_UPDATE',
        entityType: 'PricingRule',
        entityId: id,
        details: {
          before: {
            name: existing.name,
            hourFrom: existing.hourFrom,
            hourTo: existing.hourTo,
            ratePerHour: Number(existing.ratePerHour),
            daysOfWeek: existing.daysOfWeek,
            dayType: existing.dayType,
          },
          after: {
            name: rule.name,
            hourFrom: rule.hourFrom,
            hourTo: rule.hourTo,
            ratePerHour: Number(rule.ratePerHour),
            daysOfWeek: rule.daysOfWeek,
            dayType: rule.dayType,
          },
        },
      })

      return rule
    })

    return NextResponse.json(
      {
        success: true,
        data: updated,
        ...(overlaps.length > 0 ? { warnings: overlaps.map(o => `Trùng khung giờ với quy tắc "${o.name}"`) } : {}),
      }
    )
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 })
    }
    console.error('PUT /api/pricing/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    const { id } = await params

    const existing = await prisma.pricingRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy quy tắc bảng giá' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.pricingRule.delete({ where: { id } })

      await logActivity(tx, {
        userId: auth.userId,
        action: 'PRICING_RULE_DELETE',
        entityType: 'PricingRule',
        entityId: id,
        details: {
          name: existing.name,
          hourFrom: existing.hourFrom,
          hourTo: existing.hourTo,
          ratePerHour: Number(existing.ratePerHour),
          daysOfWeek: existing.daysOfWeek,
          dayType: existing.dayType,
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Đã xóa quy tắc bảng giá' })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 })
    }
    console.error('DELETE /api/pricing/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ' }, { status: 500 })
  }
}
