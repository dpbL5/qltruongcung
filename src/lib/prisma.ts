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
  //
  // ── Connection pool cho Supabase free tier ──
  // Supabase free tier giới hạn connection pool thấp (~15-20 session-mode connections).
  // Giới hạn pool client để tránh cạn kiệt connection khi nhiều query chạy song song.
  // PrismaPg chấp nhận pg.Pool config object, bao gồm connectionString và pool options.
  const adapter = new PrismaPg(
    {
      connectionString: dbUrl,
      max: 5,                         // Tối đa 5 connection — an toàn cho Supabase free tier
      idleTimeoutMillis: 30_000,      // Đóng connection idle sau 30s
      connectionTimeoutMillis: 10_000, // Timeout chờ connection sau 10s
    },
    { schema }
  );

  return new PrismaClient({ adapter });
}

// ── Singleton: tái sử dụng PrismaClient giữa các lần HMR để tránh
//    tạo connection pool mới mỗi lần hot-reload (Turbopack).
function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createPrismaClient();
  }

  // Dev: dùng lại instance đã tạo để tránh leak connection
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
