import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { registrations } from "./schema";

export interface TournamentResultRow {
  name: string;
  place: number;
}

export async function getTournamentResults(): Promise<Record<number, TournamentResultRow[]>> {
  const rows = await db
    .select({
      tournamentId: registrations.tournamentId,
      name: registrations.name,
      place: registrations.place,
    })
    .from(registrations)
    .where(and(eq(registrations.status, "approved"), isNotNull(registrations.place)));

  const map: Record<number, TournamentResultRow[]> = {};
  for (const row of rows) {
    if (row.place == null) continue;
    (map[row.tournamentId] ??= []).push({ name: row.name, place: row.place });
  }
  for (const key of Object.keys(map)) {
    map[Number(key)].sort((a, b) => a.place - b.place);
  }
  return map;
}
