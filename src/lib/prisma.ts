// ── Prisma Client singleton (Prisma 7 + PostgreSQL) ─────
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSchemaFromUrl(url: string): string | undefined {
  try {
    return new URL(url).searchParams.get("schema") ?? undefined;
  } catch {
    return undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL!;
  const schema = getSchemaFromUrl(dbUrl);

  // PrismaPg option `schema` chỉ định schema name cho Prisma-generated queries.
  // Nếu không set, adapter query vào search_path mặc định (public),
  // dẫn đến lỗi "table does not exist" khi bảng nằm ở schema khác (VD: app).
  const adapter = new PrismaPg(dbUrl, { schema });

  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
