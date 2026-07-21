"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function isLockedOut(key: string): boolean {
  const entry = attempts.get(key);
  return entry != null && entry.lockedUntil > Date.now();
}

function registerFailure(key: string) {
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

function clearFailures(key: string) {
  attempts.delete(key);
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "Введите логин и пароль" };
  }

  if (isLockedOut(username)) {
    return {
      error: "Слишком много неудачных попыток входа. Попробуйте снова через 15 минут.",
    };
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    registerFailure(username);
    return { error: "Неверный логин или пароль" };
  }

  clearFailures(username);
  await createSession({ adminId: admin.id, username: admin.username });
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
