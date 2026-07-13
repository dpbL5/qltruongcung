import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const p = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
})

async function main() {
  try {
    const result = await p.$queryRawUnsafe(`SELECT unnest(enum_range(NULL::"PromotionDiscountType"))::text as val`)
    console.log('Enum values:', JSON.stringify(result))
  } finally {
    await p.$disconnect()
  }
}

main()
