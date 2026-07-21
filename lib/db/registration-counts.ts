import { count, eq } from "drizzle-orm";
import { db } from "./client";
import { registrations } from "./schema";

export async function getRegistrationCounts(): Promise<Record<number, number>> {
  const rows = await db
    .select({ tournamentId: registrations.tournamentId, value: count() })
    .from(registrations)
    .where(eq(registrations.status, "approved"))
    .groupBy(registrations.tournamentId);

  return Object.fromEntries(rows.map((r) => [r.tournamentId, r.value]));
}
