import { count } from "drizzle-orm";
import { db } from "./client";
import { registrations } from "./schema";

export interface StatusCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export async function getRegistrationStatusCounts(): Promise<Record<number, StatusCounts>> {
  const rows = await db
    .select({
      tournamentId: registrations.tournamentId,
      status: registrations.status,
      value: count(),
    })
    .from(registrations)
    .groupBy(registrations.tournamentId, registrations.status);

  const map: Record<number, StatusCounts> = {};
  for (const row of rows) {
    const entry = (map[row.tournamentId] ??= { pending: 0, approved: 0, rejected: 0 });
    if (row.status === "pending" || row.status === "rejected") {
      entry[row.status] = row.value;
    }
    // Once a tournament goes live, "approved" players move through
    // "playing" and "eliminated" — they're still part of the confirmed
    // field, so the dashboard's "одобрено" count folds all three together
    // rather than silently dropping to 0 the moment the tournament starts.
    if (row.status === "approved" || row.status === "playing" || row.status === "eliminated") {
      entry.approved += row.value;
    }
  }
  return map;
}
