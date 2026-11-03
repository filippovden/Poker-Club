import { desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { players, ratingHistory, registrations, tournaments } from "./schema";

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

export interface TournamentLedgerRow {
  registrationId: number;
  tournamentId: number;
  tournamentTitle: string;
  startsAt: string;
  playerName: string;
  phone: string;
  status: string;
  checkedIn: boolean;
  tableNumber: number | null;
  seatNumber: number | null;
  place: number | null;
  buyIn: number | null;
  rebuyCount: number;
  addonCount: number;
  rebuyAddonMoney: number;
  paymentMethod: string | null;
}

// Private operational ledger. The public rating pages never receive
// phones, payment information, or these individual ledger rows.
export async function getTournamentLedger(): Promise<TournamentLedgerRow[]> {
  // sqlite-proxy currently maps joined rows by column name and loses values
  // when two tables share columns such as id/status/created_at. Read each
  // table separately and join the small club dataset in memory.
  const [allRegistrations, visibleTournaments] = await Promise.all([
    db.select().from(registrations),
    db.select().from(tournaments).where(eq(tournaments.isHidden, false)),
  ]);
  const tournamentById = new Map(visibleTournaments.map((t) => [t.id, t]));
  return allRegistrations.flatMap((r): TournamentLedgerRow[] => {
    const t = tournamentById.get(r.tournamentId);
    if (!t) return [];
    return [{
      registrationId: r.id, tournamentId: t.id, tournamentTitle: t.title,
      startsAt: t.startsAt, playerName: r.name, phone: r.phone,
      status: r.status, checkedIn: r.checkedIn, tableNumber: r.tableNumber,
      seatNumber: r.seatNumber, place: r.place, buyIn: t.buyIn,
      rebuyCount: r.rebuyCount, addonCount: r.addonCount,
      rebuyAddonMoney: r.totalSpent, paymentMethod: r.paymentMethod,
    }];
  }).sort((a, b) => b.startsAt.localeCompare(a.startsAt) || a.playerName.localeCompare(b.playerName, "ru"));
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
  const [rows, allPlayers, visibleTournaments] = await Promise.all([
    db.select().from(registrations).where(isNotNull(registrations.playerId)),
    db.select().from(players),
    db.select().from(tournaments).where(eq(tournaments.isHidden, false)),
  ]);
  const playerById = new Map(allPlayers.map((p) => [p.id, p]));
  const tournamentById = new Map(visibleTournaments.map((t) => [t.id, t]));

  const byPlayer = new Map<number, PlayerStatsRow>();
  for (const r of rows) {
    const player = playerById.get(r.playerId!);
    const tournament = tournamentById.get(r.tournamentId);
    if (!player || !tournament) continue;
    let entry = byPlayer.get(player.id);
    if (!entry) {
      entry = {
        playerId: player.id,
        name: player.name,
        phone: player.phone,
        rating: player.rating,
        tournamentsPlayed: player.tournamentsPlayed,
        totalRebuys: 0,
        totalAddons: 0,
        rebuyAddonMoney: 0,
        totalBuyIns: 0,
        finishes: [],
      };
      byPlayer.set(player.id, entry);
    }
    entry.totalRebuys += r.rebuyCount;
    entry.totalAddons += r.addonCount;
    entry.rebuyAddonMoney += r.totalSpent;
    entry.totalBuyIns += tournament.buyIn ?? 0;
    if (r.place != null) entry.finishes.push({ tournamentTitle: tournament.title, place: r.place });
  }

  return [...byPlayer.values()].sort((a, b) => b.rating - a.rating);
}

export interface PlayerProfileHistoryRow {
  tournamentId: number;
  tournamentTitle: string;
  startsAt: string;
  place: number;
  pointsEarned: number;
  newRating: number;
}

export interface PlayerProfile {
  id: number;
  name: string;
  rating: number;
  tournamentsPlayed: number;
  rank: number | null;
  bestPlace: number | null;
  history: PlayerProfileHistoryRow[];
}

// Public profile behind each name on /rating — the list itself only ever
// showed name + a single rating number, with no way to see how someone
// actually got there.
export async function getPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player) return null;

  // Rank = 1-based position in the full rating-sorted list, not just "how
  // many players exist" — ties aren't split further, so two players tied
  // at the top both show rank 1 rather than one arbitrarily beating the
  // other.
  const ranked = await db.select({ id: players.id }).from(players).orderBy(desc(players.rating));
  const rankIndex = ranked.findIndex((p) => p.id === playerId);

  const [history, allTournaments] = await Promise.all([
    db.select().from(ratingHistory).where(eq(ratingHistory.playerId, playerId)),
    db.select().from(tournaments),
  ]);
  const tournamentById = new Map(allTournaments.map((t) => [t.id, t]));
  const historyRows = history.flatMap((h): PlayerProfileHistoryRow[] => {
    const tournament = tournamentById.get(h.tournamentId);
    if (!tournament) return [];
    return [{
      tournamentId: tournament.id, tournamentTitle: tournament.title,
      startsAt: tournament.startsAt, place: h.place,
      pointsEarned: h.pointsEarned, newRating: h.newRating,
    }];
  }).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const bestPlace = historyRows.length > 0 ? Math.min(...historyRows.map((h) => h.place)) : null;

  return {
    id: player.id,
    name: player.name,
    rating: player.rating,
    tournamentsPlayed: player.tournamentsPlayed,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    bestPlace,
    history: historyRows,
  };
}
