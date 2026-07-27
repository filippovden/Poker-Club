"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { tournamentRegistrationDeepLink } from "@/lib/telegram/client";
import { setRegistrationStatus } from "@/lib/registrations/set-status";
import { createRegistration } from "@/lib/registrations/create";

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
  comment: z.string().trim().max(500, "Слишком длинный комментарий").optional().or(z.literal("")),
  consent: z.literal("on", "Нужно согласие на обработку персональных данных"),
  age: z.literal("on", "Нужно подтверждение возраста 18+"),
  // honeypot: real users never fill this hidden field
  website: z.string().max(0).optional().or(z.literal("")),
});

export interface RegisterResult {
  error?: string;
  success?: boolean;
  cancelToken?: string;
  telegramLink?: string;
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
    comment: formData.get("comment") || "",
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

  const result = await createRegistration({
    tournamentId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    comment: parsed.data.comment || null,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");

  return {
    success: true,
    cancelToken: result.cancelToken,
    telegramLink: result.cancelToken
      ? (tournamentRegistrationDeepLink(result.cancelToken) ?? undefined)
      : undefined,
  };
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
  const result = await setRegistrationStatus(id, status);
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return result;
}

export interface AssignSeatsResult {
  error?: string;
  seated?: number;
  unseated?: number;
}

// Seats only the not-yet-seated approved applicants into the remaining
// free seats — players who are already seated keep their table/seat
// (re-running this after new approvals shouldn't move people who
// already told their friends where they're sitting). Randomizing who
// gets which of the free seats still mirrors how live tournaments draw
// seats, rather than letting players pick a specific chair online.
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
  const { tableCount, seatsPerTable } = tournament;

  const approved = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "approved")));

  const isValidSeat = (t: number | null, s: number | null): t is number =>
    t != null && s != null && t >= 1 && t <= tableCount && s >= 1 && s <= seatsPerTable;

  const alreadySeated = approved.filter((r) => isValidSeat(r.tableNumber, r.seatNumber));
  const needsSeating = approved.filter((r) => !isValidSeat(r.tableNumber, r.seatNumber));

  const occupied = new Set(alreadySeated.map((r) => `${r.tableNumber}-${r.seatNumber}`));
  const freeSeats: { tableNumber: number; seatNumber: number }[] = [];
  for (let t = 1; t <= tableCount; t++) {
    for (let s = 1; s <= seatsPerTable; s++) {
      if (!occupied.has(`${t}-${s}`)) freeSeats.push({ tableNumber: t, seatNumber: s });
    }
  }

  const shuffled = [...needsSeating].sort(() => Math.random() - 0.5);
  const toSeat = shuffled.slice(0, freeSeats.length);
  const overflow = shuffled.slice(freeSeats.length);

  for (const [i, reg] of toSeat.entries()) {
    await db
      .update(registrations)
      .set(freeSeats[i])
      .where(eq(registrations.id, reg.id));
  }
  for (const reg of overflow) {
    if (reg.tableNumber != null || reg.seatNumber != null) {
      await db
        .update(registrations)
        .set({ tableNumber: null, seatNumber: null })
        .where(eq(registrations.id, reg.id));
    }
  }

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { seated: alreadySeated.length + toSeat.length, unseated: overflow.length };
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

export async function adminSetPlace(id: number, place: number | null) {
  await requireAdmin();
  await db.update(registrations).set({ place }).where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}
