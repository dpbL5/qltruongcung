// ── GET /api/auth/me ────────────────────────────────────
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Chưa đăng nhập" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: session,
  });
}
