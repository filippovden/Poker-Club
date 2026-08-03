import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { players, registrations, tournaments } from "./schema";

export interface TournamentStatsRow {
  tournamentId: number;
  title: string;
  startsAt: string;
  format: string;
  status: string;
  buyIn: number | null;
  playersCount: number;
  totalRebuys: number;
  totalAddons: number;
  rebuyAddonMoney: number;
  totalCash: number | null;
}

// Test tournaments (is_hidden) are excluded outright — their fake rebuys
// and fake cash would otherwise pollute real revenue/analytics numbers.
export async function getTournamentStats(): Promise<TournamentStatsRow[]> {
  const rows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.isHidden, false))
    .orderBy(tournaments.startsAt);

  const regs = await db
    .select({
      tournamentId: registrations.tournamentId,
      status: registrations.status,
      rebuyCount: registrations.rebuyCount,
      addonCount: registrations.addonCount,
      totalSpent: registrations.totalSpent,
    })
    .from(registrations)
    .where(inArray(registrations.status, ["playing", "eliminated"]));

  const byTournament = new Map<number, typeof regs>();
  for (const r of regs) {
    if (!byTournament.has(r.tournamentId)) byTournament.set(r.tournamentId, []);
    byTournament.get(r.tournamentId)!.push(r);
  }

  return rows.map((t) => {
    const entries = byTournament.get(t.id) ?? [];
    const playersCount = entries.length;
    const totalRebuys = entries.reduce((sum, r) => sum + r.rebuyCount, 0);
    const totalAddons = entries.reduce((sum, r) => sum + r.addonCount, 0);
    const rebuyAddonMoney = entries.reduce((sum, r) => sum + r.totalSpent, 0);
    const totalCash = t.buyIn != null ? playersCount * t.buyIn + rebuyAddonMoney : null;
    return {
      tournamentId: t.id,
      title: t.title,
      startsAt: t.startsAt,
      format: t.format,
      status: t.status,
      buyIn: t.buyIn,
      playersCount,
      totalRebuys,
      totalAddons,
      rebuyAddonMoney,
      totalCash,
    };
  });
}

export interface PlayerStatsRow {
  playerId: number;
  name: string;
  phone: string;
  rating: number;
  tournamentsPlayed: number;
  totalRebuys: number;
  totalAddons: number;
  rebuyAddonMoney: number;
  totalBuyIns: number;
  finishes: { tournamentTitle: string; place: number }[];
}

// Only tournaments that have actually been scored (adminFinishTournament
// links registrations.player_id) contribute here — a still-live tournament
// has no finished places yet, so it can't affect these totals.
export async function getPlayerStats(): Promise<PlayerStatsRow[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      phone: players.phone,
      rating: players.rating,
      tournamentsPlayed: players.tournamentsPlayed,
      rebuyCount: registrations.rebuyCount,
      addonCount: registrations.addonCount,
      totalSpent: registrations.totalSpent,
      buyIn: tournaments.buyIn,
      place: registrations.place,
      tournamentTitle: tournaments.title,
    })
    .from(registrations)
    .innerJoin(players, eq(registrations.playerId, players.id))
    .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
    .where(and(eq(tournaments.isHidden, false), isNotNull(registrations.playerId)));

  const byPlayer = new Map<number, PlayerStatsRow>();
  for (const r of rows) {
    let entry = byPlayer.get(r.playerId);
    if (!entry) {
      entry = {
        playerId: r.playerId,
        name: r.name,
        phone: r.phone,
        rating: r.rating,
        tournamentsPlayed: r.tournamentsPlayed,
        totalRebuys: 0,
        totalAddons: 0,
        rebuyAddonMoney: 0,
        totalBuyIns: 0,
        finishes: [],
      };
      byPlayer.set(r.playerId, entry);
    }
    entry.totalRebuys += r.rebuyCount;
    entry.totalAddons += r.addonCount;
    entry.rebuyAddonMoney += r.totalSpent;
    entry.totalBuyIns += r.buyIn ?? 0;
    if (r.place != null) entry.finishes.push({ tournamentTitle: r.tournamentTitle, place: r.place });
  }

  return [...byPlayer.values()].sort((a, b) => b.rating - a.rating);
}
