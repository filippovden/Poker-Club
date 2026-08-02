// Fisher-Yates shuffle — used to randomize who gets seated first (and, by
// extension, which seat/table they land on), mirroring how a live
// tournament draws seats rather than seating people in signup order.
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface Seat {
  tableNumber: number;
  seatNumber: number;
}

// Assigns `countToSeat` new players across `tableCount` tables, given which
// seats are already occupied at each — always placing the next player at
// whichever table currently has the fewest occupants (and still has a free
// seat). This greedy rule guarantees every table ends up within 1 player of
// every other regardless of arrival order: with 45 players / 5 tables that's
// 9-9-9-9-9, with 42 it's 9-9-8-8-8, with 37 it's 8-8-7-7-7, with 31 it's
// 7-6-6-6-6 — and it never touches a seat that's already taken, so players
// who were seated earlier (and already told their friends where they're
// sitting) never get moved.
export function planBalancedSeats(
  countToSeat: number,
  tableCount: number,
  seatsPerTable: number,
  occupiedSeatsByTable: Set<number>[],
): Seat[] {
  const freeByTable: number[][] = [];
  const countByTable: number[] = [];
  for (let t = 0; t < tableCount; t++) {
    const occupied = occupiedSeatsByTable[t] ?? new Set<number>();
    const free: number[] = [];
    for (let s = 1; s <= seatsPerTable; s++) {
      if (!occupied.has(s)) free.push(s);
    }
    freeByTable.push(free);
    countByTable.push(occupied.size);
  }

  const plan: Seat[] = [];
  for (let i = 0; i < countToSeat; i++) {
    let best = -1;
    for (let t = 0; t < tableCount; t++) {
      if (freeByTable[t].length === 0) continue;
      if (best === -1 || countByTable[t] < countByTable[best]) best = t;
    }
    if (best === -1) break; // no room left anywhere
    const seatNumber = freeByTable[best].shift()!;
    plan.push({ tableNumber: best + 1, seatNumber });
    countByTable[best] += 1;
  }
  return plan;
}
