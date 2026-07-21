"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const tournamentSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  format: z.enum(["NLH", "PLO", "MTT"]),
  startsAt: z.string().min(1, "Дата обязательна"),
  buyIn: z.coerce.number().int().min(0).nullable(),
  description: z.string().nullable(),
  status: z.enum(["upcoming", "live", "completed"]),
});

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
    description: formData.get("description") || null,
    status: formData.get("status") || "upcoming",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  await db.insert(tournaments).values(parsed.data);
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
    description: formData.get("description") || null,
    status: formData.get("status") || "upcoming",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  await db.update(tournaments).set(parsed.data).where(eq(tournaments.id, id));
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
