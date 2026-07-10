// ── JWT Auth với jose ───────────────────────────────────
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/types";

// ── Config ─────────────────────────────────────────────
const rawSessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production" && (!rawSessionSecret || rawSessionSecret.length < 32)) {
  throw new Error("SESSION_SECRET phải có ít nhất 32 ký tự trong production");
}

const SESSION_SECRET = new TextEncoder().encode(
  rawSessionSecret || "dev-secret-change-in-production-min-32-chars!!"
);
const SESSION_NAME = "qltrungcung_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 giờ

// ── Create session ─────────────────────────────────────
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SESSION_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

// ── Verify session ─────────────────────────────────────
export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Destroy session ────────────────────────────────────
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_NAME);
}

// ── Require auth (throws nếu chưa login) ──────────────
export async function requireAuth(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
}

// ── Require admin role ─────────────────────────────────
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
