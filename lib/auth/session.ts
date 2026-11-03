import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";

const COOKIE_NAME = "lp_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me",
);

export interface SessionPayload {
  adminId: number;
  username: string;
  [key: string]: unknown;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!Number.isSafeInteger(payload.adminId) || typeof payload.username !== "string") return null;
    const [admin] = await db.select({ id: admins.id }).from(admins).where(and(eq(admins.id, payload.adminId as number), eq(admins.username, payload.username))).limit(1);
    return admin ? payload as SessionPayload : null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
