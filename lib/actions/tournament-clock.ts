"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournamentClocks, tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_BLIND_LEVELS,
  clockPosition,
  elapsedAt,
  levelStartSeconds,
  parseBlindLevels,
  totalSeconds,
  type BlindLevel,
} from "@/lib/tournament-clock";

export type ClockSnapshot = {
  levels: BlindLevel[];
  elapsedSeconds: number;
  running: boolean;
  serverNow: number;
  status: "upcoming" | "live" | "completed";
  totalPlayers: number;
  remainingPlayers: number;
};

async function requireAdmin() {
  if (!(await getSession())) throw new Error("Требуется авторизация");
}

async function findTournament(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return tournament ?? null;
}

async function readClock(id: number) {
  const [row] = await db.select().from(tournamentClocks).where(eq(tournamentClocks.tournamentId, id)).limit(1);
  return row ?? null;
}

const busyClocks = new Set<number>();
async function withClockLock<T extends { error?: string }>(id: number, action: () => Promise<T>): Promise<T> {
  if (busyClocks.has(id)) return { error: "Таймер уже обновляется. Повторите действие через секунду." } as T;
  busyClocks.add(id);
  try { return await action(); } finally { busyClocks.delete(id); }
}

export async function getClockSnapshot(tournamentId: number): Promise<ClockSnapshot> {
  await requireAdmin();
  const tournament = await findTournament(tournamentId);
  if (!tournament) throw new Error("Турнир не найден");
  const [clock, entrants] = await Promise.all([
    readClock(tournamentId),
    db.select({ status: registrations.status }).from(registrations).where(eq(registrations.tournamentId, tournamentId)),
  ]);
  let levels = DEFAULT_BLIND_LEVELS;
  if (clock) {
    try { levels = parseBlindLevels(JSON.parse(clock.levelsJson)) ?? DEFAULT_BLIND_LEVELS; } catch { /* fall back to the safe default */ }
  }
  const now = Date.now();
  const elapsedSeconds = clock ? Math.min(totalSeconds(levels), tournament.status === "completed" ? clock.elapsedSeconds : elapsedAt(now, clock.elapsedSeconds, clock.runningSince)) : 0;
  return {
    levels,
    elapsedSeconds,
    running: Boolean(clock?.runningSince) && tournament.status !== "completed" && elapsedSeconds < totalSeconds(levels),
    serverNow: now,
    status: tournament.status,
    totalPlayers: entrants.filter((entry) => entry.status === "playing" || entry.status === "eliminated").length,
    remainingPlayers: entrants.filter((entry) => entry.status === "playing").length,
  };
}

export type ClockCommand = "toggle" | "next" | "previous" | "reset";

export async function changeClock(tournamentId: number, command: ClockCommand): Promise<{ error?: string; snapshot?: ClockSnapshot }> {
  await requireAdmin();
  const tournament = await findTournament(tournamentId);
  if (!tournament) return { error: "Турнир не найден" };
  if (tournament.status === "completed") return { error: "Турнир уже завершён" };
  if (!["toggle", "next", "previous", "reset"].includes(command)) return { error: "Неизвестная команда" };
  if (command === "toggle" && tournament.status !== "live") return { error: "Сначала запустите турнир в разделе «Ход игры»" };

  return withClockLock(tournamentId, async () => {
    await db.insert(tournamentClocks).values({ tournamentId, levelsJson: JSON.stringify(DEFAULT_BLIND_LEVELS) }).onConflictDoNothing();
    const clock = await readClock(tournamentId);
    if (!clock) return { error: "Не удалось открыть таймер" };
    let levels = DEFAULT_BLIND_LEVELS;
    try { levels = parseBlindLevels(JSON.parse(clock.levelsJson)) ?? DEFAULT_BLIND_LEVELS; } catch { /* safe default */ }
    const now = Date.now();
    const current = Math.min(totalSeconds(levels), elapsedAt(now, clock.elapsedSeconds, clock.runningSince));
    let elapsedSeconds = current;
    let runningSince: string | null = clock.runningSince;
    if (command === "toggle") {
      runningSince = (clock.runningSince || current >= totalSeconds(levels)) ? null : new Date(now).toISOString();
    } else if (command === "reset") {
      elapsedSeconds = 0;
      runningSince = null;
    } else {
      const position = clockPosition(levels, current);
      const index = command === "next" ? Math.min(position.index + 1, levels.length) : Math.max(position.index - 1, 0);
      elapsedSeconds = levelStartSeconds(levels, index);
      runningSince = clock.runningSince && elapsedSeconds < totalSeconds(levels) ? new Date(now).toISOString() : null;
    }
    await db.update(tournamentClocks).set({ elapsedSeconds, runningSince, updatedAt: new Date(now).toISOString() }).where(eq(tournamentClocks.tournamentId, tournamentId));
    return { snapshot: await getClockSnapshot(tournamentId) };
  });
}

export async function saveBlindLevels(tournamentId: number, input: unknown): Promise<{ error?: string; snapshot?: ClockSnapshot }> {
  await requireAdmin();
  const tournament = await findTournament(tournamentId);
  if (!tournament) return { error: "Турнир не найден" };
  if (tournament.status === "completed") return { error: "Турнир уже завершён" };
  const levels = parseBlindLevels(input);
  if (!levels) return { error: "Проверьте уровни, блайнды и длительность" };
  return withClockLock(tournamentId, async () => {
    const existing = await readClock(tournamentId);
    if (existing?.runningSince) return { error: "Сначала поставьте таймер на паузу" };
    await db.insert(tournamentClocks).values({ tournamentId, levelsJson: JSON.stringify(levels) }).onConflictDoNothing();
    await db.update(tournamentClocks).set({ levelsJson: JSON.stringify(levels), elapsedSeconds: 0, runningSince: null, updatedAt: new Date().toISOString() }).where(eq(tournamentClocks.tournamentId, tournamentId));
    return { snapshot: await getClockSnapshot(tournamentId) };
  });
}
