import { count, inArray } from "drizzle-orm";
import { db } from "./client";
import { registrations } from "./schema";

// A tournament's public "registered" count shouldn't drop once it goes
// live — "approved" applicants who start playing move to "playing" and
// then "eliminated" as they bust, so all three still count as part of the
// field (only "pending"/"rejected" don't).
export async function getRegistrationCounts(): Promise<Record<number, number>> {
  const rows = await db
    .select({ tournamentId: registrations.tournamentId, value: count() })
    .from(registrations)
    .where(inArray(registrations.status, ["approved", "playing", "eliminated"]))
    .groupBy(registrations.tournamentId);

  return Object.fromEntries(rows.map((r) => [r.tournamentId, r.value]));
}
