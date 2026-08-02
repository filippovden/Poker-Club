"use server";

import { and, eq, gt, isNotNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { announceNewTournament } from "@/lib/telegram/broadcast";
import { samaraWallClockToUtcIso } from "@/lib/timezone";

const tournamentSchema = z
  .object({
    title: z.string().min(1, "Название обязательно"),
    format: z.enum(["NLH", "PLO", "MTT"]),
    startsAt: z.string().min(1, "Дата обязательна"),
    buyIn: z.coerce.number().int().min(0).nullable(),
    maxPlayers: z.coerce.number().int().min(1).nullable(),
    tableCount: z.coerce.number().int().min(1).nullable(),
    seatsPerTable: z.coerce.number().int().min(1).nullable(),
    startingStack: z.coerce.number().int().min(0).nullable(),
    rebuyChips: z.coerce.number().int().min(0).nullable(),
    addonChips: z.coerce.number().int().min(0).nullable(),
    description: z.string().nullable(),
    status: z.enum(["upcoming", "live", "completed"]),
  })
  .refine((v) => (v.tableCount == null) === (v.seatsPerTable == null), {
    message: "Укажите и число столов, и мест за столом (или оставьте оба поля пустыми)",
    path: ["tableCount"],
  });

function withComputedCapacity<T extends { tableCount: number | null; seatsPerTable: number | null; maxPlayers: number | null }>(
  data: T,
) {
  if (data.tableCount != null && data.seatsPerTable != null) {
    return { ...data, maxPlayers: data.tableCount * data.seatsPerTable };
  }
  return data;
}

export interface ActionResult {
  error?: string;
  success?: boolean;
}

// If a tournament's table layout shrinks (or is removed), any existing
// seat assignments that no longer fit the new grid would otherwise sit
// there silently — occupying a seat that no longer visually exists.
// Clear only the ones that are actually out of range.
async function clearOutOfRangeSeats(
  tournamentId: number,
  tableCount: number | null,
  seatsPerTable: number | null,
) {
  if (tableCount == null || seatsPerTable == null) {
    await db
      .update(registrations)
      .set({ tableNumber: null, seatNumber: null })
      .where(eq(registrations.tournamentId, tournamentId));
    return;
  }
  await db
    .update(registrations)
    .set({ tableNumber: null, seatNumber: null })
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        or(
          and(isNotNull(registrations.tableNumber), gt(registrations.tableNumber, tableCount)),
          and(isNotNull(registrations.seatNumber), gt(registrations.seatNumber, seatsPerTable)),
        ),
      ),
    );
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
}

export async function createTournamentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = tournamentSchema.safeParse({
    title: formData.get("title"),
    format: formData.get("format"),
    startsAt: formData.get("startsAt"),
    buyIn: formData.get("buyIn") || null,
    maxPlayers: formData.get("maxPlayers") || null,
    tableCount: formData.get("tableCount") || null,
    seatsPerTable: formData.get("seatsPerTable") || null,
    startingStack: formData.get("startingStack") || null,
    rebuyChips: formData.get("rebuyChips") || null,
    addonChips: formData.get("addonChips") || null,
    description: formData.get("description") || null,
    status: formData.get("status") || "upcoming",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  const [created] = await db
    .insert(tournaments)
    .values(withComputedCapacity({ ...parsed.data, startsAt: samaraWallClockToUtcIso(parsed.data.startsAt) }))
    .returning();
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");

  if (created) {
    announceNewTournament(created).catch((err) =>
      console.error("[telegram] new-tournament broadcast failed:", err),
    );
  }

  return { success: true };
}

export async function updateTournamentAction(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = tournamentSchema.safeParse({
    title: formData.get("title"),
    format: formData.get("format"),
    startsAt: formData.get("startsAt"),
    buyIn: formData.get("buyIn") || null,
    maxPlayers: formData.get("maxPlayers") || null,
    tableCount: formData.get("tableCount") || null,
    seatsPerTable: formData.get("seatsPerTable") || null,
    startingStack: formData.get("startingStack") || null,
    rebuyChips: formData.get("rebuyChips") || null,
    addonChips: formData.get("addonChips") || null,
    description: formData.get("description") || null,
    status: formData.get("status") || "upcoming",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  await db
    .update(tournaments)
    .set(withComputedCapacity({ ...parsed.data, startsAt: samaraWallClockToUtcIso(parsed.data.startsAt) }))
    .where(eq(tournaments.id, id));
  await clearOutOfRangeSeats(id, parsed.data.tableCount, parsed.data.seatsPerTable);
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteTournamentAction(id: number) {
  await requireAdmin();
  await db.delete(tournaments).where(eq(tournaments.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}
