import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function check() {
  try {
    const userCount = await prisma.user.count()
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    console.log('✅ Kết nối Postgres thành công')
    console.log(`   Host     : localhost:5432`)
    console.log(`   DB       : qltruongcung`)
    console.log(`   Users    : ${userCount}`)
    console.log(`   Admin    : ${admin ? admin.username : 'không có'}`)
    console.log(`   Tables   : ${(tables as { table_name: string }[]).map((t) => t.table_name).join(', ')}`)
  } catch (error) {
    console.error('❌ Kết nối Postgres thất bại:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

check()
