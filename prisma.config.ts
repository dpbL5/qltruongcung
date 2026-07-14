// Prisma 7 config — connection URLs được định nghĩa ở đây thay vì trong schema.prisma.
// - url: dùng cho Prisma Client (qua adapter) — có thể là transaction pooler (PgBouncer port 6543)
// - directUrl: dùng cho CLI (db push, migrate) — phải là session-mode connection (port 5432)
//   để thực thi DDL an toàn, bypass transaction pooler.
// See https://pris.ly/d/config-datasource
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // DIRECT_URL dùng cho prisma db push / migrations — bypass transaction pooler
    // Nếu không set, Prisma CLI fallback về DATABASE_URL.
    directUrl: process.env["DIRECT_URL"],
  },
});
