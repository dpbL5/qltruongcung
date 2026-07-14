// Prisma 7 config — connection URL cho CLI (db push, migrate, generate).
// - Runtime (PrismaClient) dùng adapter với DATABASE_URL trong src/lib/prisma.ts
// - CLI dùng url ở đây — phải là session-mode connection (DIRECT_URL, port 5432)
//   để thực thi DDL an toàn, bypass transaction pooler (PgBouncer port 6543).
//   Nếu DIRECT_URL không set, fallback về DATABASE_URL.
// See https://pris.ly/d/config-datasource
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Dùng DIRECT_URL (session pooler) cho CLI vì transaction pooler không hỗ trợ DDL.
    // Fallback về DATABASE_URL nếu không có DIRECT_URL (VD: local Docker).
    url: (process.env["DIRECT_URL"] || process.env["DATABASE_URL"])!,
  },
});
