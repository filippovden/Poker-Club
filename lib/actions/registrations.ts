"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Введите имя").max(120),
  phone: z
    .string()
    .trim()
    .min(5, "Введите номер телефона")
    .max(32)
    .regex(/^[\d\s()+-]+$/, "Похоже на некорректный номер телефона"),
  email: z
    .string()
    .trim()
    .max(200)
    .email("Похоже на некорректный email")
    .optional()
    .or(z.literal("")),
  consent: z.literal("on", "Нужно согласие на обработку персональных данных"),
  age: z.literal("on", "Нужно подтверждение возраста 18+"),
  // honeypot: real users never fill this hidden field
  website: z.string().max(0).optional().or(z.literal("")),
});

export interface RegisterResult {
  error?: string;
  success?: boolean;
  cancelToken?: string;
}

export async function registerForTournamentAction(
  tournamentId: number,
  _prev: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    consent: formData.get("consent"),
    age: formData.get("age"),
    website: formData.get("website") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }
  if (parsed.data.website) {
    // honeypot tripped — pretend success, do nothing
    return { success: true, cancelToken: "" };
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return { error: "Турнир не найден" };
  if (tournament.status === "completed") {
    return { error: "Регистрация на этот турнир уже закрыта" };
  }

  const [{ value: approvedCount }] = await db
    .select({ value: count() })
    .from(registrations)
    .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "approved")));

  if (tournament.maxPlayers && approvedCount >= tournament.maxPlayers) {
    return { error: "Все места заняты" };
  }

  const duplicateConditions = [eq(registrations.phone, parsed.data.phone)];
  if (parsed.data.email) duplicateConditions.push(eq(registrations.email, parsed.data.email));

  const [existing] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        or(...duplicateConditions),
        or(eq(registrations.status, "pending"), eq(registrations.status, "approved")),
      ),
    )
    .limit(1);

  if (existing) {
    return { error: "Вы уже подавали заявку на этот турнир" };
  }

  const cancelToken = randomUUID();

  await db.insert(registrations).values({
    tournamentId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    cancelToken,
    status: "pending",
  });

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { success: true, cancelToken };
}

export async function cancelRegistrationAction(token: string) {
  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.cancelToken, token))
    .limit(1);

  if (!registration) return { error: "Регистрация не найдена или уже отменена" };

  await db.delete(registrations).where(eq(registrations.cancelToken, token));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { success: true, tournamentId: registration.tournamentId };
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
}

export async function adminListRegistrations(tournamentId: number) {
  await requireAdmin();
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(registrations.createdAt);
}

export async function adminRemoveRegistration(id: number) {
  await requireAdmin();
  await db.delete(registrations).where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}

export async function adminSetRegistrationStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
) {
  await requireAdmin();
  const patch: Partial<typeof registrations.$inferInsert> = { status };
  if (status !== "approved") {
    patch.tableNumber = null;
    patch.seatNumber = null;
  }
  await db.update(registrations).set(patch).where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}

export interface AssignSeatsResult {
  error?: string;
  seated?: number;
  unseated?: number;
}

// Randomly balances all approved applicants across the tournament's
// tables — mirrors how live tournaments actually draw seats, rather
// than letting players pick a specific chair online.
export async function adminAssignSeats(tournamentId: number): Promise<AssignSeatsResult> {
  await requireAdmin();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament?.tableCount || !tournament?.seatsPerTable) {
    return { error: "Для этого турнира не настроена рассадка по столам" };
  }

  const approved = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "approved")));

  const capacity = tournament.tableCount * tournament.seatsPerTable;
  const shuffled = [...approved].sort(() => Math.random() - 0.5);
  const toSeat = shuffled.slice(0, capacity);
  const overflow = shuffled.slice(capacity);

  for (const [i, reg] of toSeat.entries()) {
    const tableNumber = Math.floor(i / tournament.seatsPerTable) + 1;
    const seatNumber = (i % tournament.seatsPerTable) + 1;
    await db
      .update(registrations)
      .set({ tableNumber, seatNumber })
      .where(eq(registrations.id, reg.id));
  }
  for (const reg of overflow) {
    await db
      .update(registrations)
      .set({ tableNumber: null, seatNumber: null })
      .where(eq(registrations.id, reg.id));
  }

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { seated: toSeat.length, unseated: overflow.length };
}

export async function adminSetSeat(
  id: number,
  tableNumber: number | null,
  seatNumber: number | null,
) {
  await requireAdmin();
  await db.update(registrations).set({ tableNumber, seatNumber }).where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}
