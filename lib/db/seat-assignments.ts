import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { registrations } from "./schema";

export interface SeatAssignment {
  tableNumber: number;
  seatNumber: number;
}

export async function getSeatAssignments(): Promise<Record<number, SeatAssignment[]>> {
  const rows = await db
    .select({
      tournamentId: registrations.tournamentId,
      tableNumber: registrations.tableNumber,
      seatNumber: registrations.seatNumber,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.status, "approved"),
        isNotNull(registrations.tableNumber),
        isNotNull(registrations.seatNumber),
      ),
    );

  const map: Record<number, SeatAssignment[]> = {};
  for (const row of rows) {
    if (row.tableNumber == null || row.seatNumber == null) continue;
    (map[row.tournamentId] ??= []).push({
      tableNumber: row.tableNumber,
      seatNumber: row.seatNumber,
    });
  }
  return map;
}
