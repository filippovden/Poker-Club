"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const tournamentSchema = z
  .object({
    title: z.string().min(1, "Название обязательно"),
    format: z.enum(["NLH", "PLO", "MTT"]),
    startsAt: z.string().min(1, "Дата обязательна"),
    buyIn: z.coerce.number().int().min(0).nullable(),
    maxPlayers: z.coerce.number().int().min(1).nullable(),
    tableCount: z.coerce.number().int().min(1).nullable(),
    seatsPerTable: z.coerce.number().int().min(1).nullable(),
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
    description: formData.get("description") || null,
    status: formData.get("status") || "upcoming",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  await db.insert(tournaments).values(withComputedCapacity(parsed.data));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
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
    description: formData.get("description") || null,
    status: formData.get("status") || "upcoming",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  await db
    .update(tournaments)
    .set(withComputedCapacity(parsed.data))
    .where(eq(tournaments.id, id));
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
