// ── Auth Proxy (Next.js 16 route protection) ────────────
// Bảo vệ toàn bộ (dashboard) route group
// Docs: node_modules/next/dist/docs/.../proxy.md

import { verifySession } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    // Chưa login → redirect về trang login
    const loginUrl = new URL("/login", request.url);
    // Lưu URL gốc để sau khi login redirect lại
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  // Đã login → cho phép tiếp tục
  return;
}
