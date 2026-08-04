"use server";

import { and, desc, eq, gt, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  players,
  ratingHistory,
  registrations,
  tournamentActions,
  tournaments,
  type Registration,
  type Tournament,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { sendTelegramMessage, tournamentRegistrationDeepLink } from "@/lib/telegram/client";
import { buildSeatAssignedMessage } from "@/lib/telegram/messages";
import { setRegistrationStatus } from "@/lib/registrations/set-status";
import { createRegistration } from "@/lib/registrations/create";
import { planBalancedSeats, shuffle } from "@/lib/tournaments/seating";
import { computeRatingChange } from "@/lib/tournaments/rating";
import { normalizePhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/actions/tournaments";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Введите имя").max(120),
  phone: z
    .string()
    .trim()
    .min(5, "Введите номер телефона")
    .max(32)
    .regex(/^[\d\s()+-]+$/, "Похоже на некорректный номер телефона"),
  email: z
    .string()
    .trim()
    .max(200)
    .email("Похоже на некорректный email")
    .optional()
    .or(z.literal("")),
  comment: z.string().trim().max(500, "Слишком длинный комментарий").optional().or(z.literal("")),
  consent: z.literal("on", "Нужно согласие на обработку персональных данных"),
  age: z.literal("on", "Нужно подтверждение возраста 18+"),
  // honeypot: real users never fill this hidden field
  website: z.string().max(0).optional().or(z.literal("")),
});

export interface RegisterResult {
  error?: string;
  success?: boolean;
  cancelToken?: string;
  telegramLink?: string;
}

export async function registerForTournamentAction(
  tournamentId: number,
  _prev: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    comment: formData.get("comment") || "",
    consent: formData.get("consent"),
    age: formData.get("age"),
    website: formData.get("website") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }
  if (parsed.data.website) {
    // honeypot tripped — pretend success, do nothing
    return { success: true, cancelToken: "" };
  }

  const result = await createRegistration({
    tournamentId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    comment: parsed.data.comment || null,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");

  return {
    success: true,
    cancelToken: result.cancelToken,
    telegramLink: result.cancelToken
      ? (tournamentRegistrationDeepLink(result.cancelToken) ?? undefined)
      : undefined,
  };
}

export async function cancelRegistrationAction(token: string) {
  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.cancelToken, token))
    .limit(1);

  if (!registration) return { error: "Регистрация не найдена или уже отменена" };
  // An old bookmarked cancel link shouldn't be able to pull a player out of
  // a tournament that's already underway or finished — that would delete
  // their live stack/place and the rating history built on top of it.
  if (registration.status === "playing" || registration.status === "eliminated") {
    return { error: "Турнир уже начался — самостоятельная отмена недоступна, обратитесь к организатору" };
  }

  await db.delete(registrations).where(eq(registrations.cancelToken, token));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { success: true, tournamentId: registration.tournamentId };
}

export interface LookupResultItem {
  registration: Registration;
  tournament: Tournament;
}

export interface LookupResult {
  error?: string;
  items?: LookupResultItem[];
}

// Self-service status lookup for anyone who applied without ever linking
// Telegram (or lost the one-off cancel link) — phone + name is not a real
// secret (either could be guessed), so this is a convenience lookup, not
// an account login; nothing here is more sensitive than what the person
// already handed over at registration time.
export async function lookupRegistrationsAction(phone: string, name: string): Promise<LookupResult> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedName = name.trim().toLowerCase();
  if (normalizedPhone.length < 10 || !normalizedName) {
    return { error: "Введите телефон и имя, указанные при регистрации" };
  }

  const rows = await db
    .select()
    .from(registrations)
    .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
    .where(eq(tournaments.isHidden, false));

  const matches = rows.filter(
    (r) =>
      normalizePhone(r.registrations.phone) === normalizedPhone &&
      r.registrations.name.trim().toLowerCase() === normalizedName,
  );

  if (matches.length === 0) {
    return { error: "Заявки не найдены — проверьте телефон и имя (как указывали при регистрации)" };
  }

  return {
    items: matches
      .map((r) => ({ registration: r.registrations, tournament: r.tournaments }))
      .sort((a, b) => new Date(b.tournament.startsAt).getTime() - new Date(a.tournament.startsAt).getTime()),
  };
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
  return session;
}

// The live-play actions below do a read (e.g. "how many are still playing")
// followed by writes based on that read — two rapid clicks (a double-click,
// or two admins acting on the same tournament at once) can interleave
// between that read and write, since each `await` yields back to the event
// loop. A single Node process serving this app means a simple in-memory
// per-tournament lock is enough to serialize them; it wouldn't help across
// multiple server instances, but this app only ever runs one.
const busyTournaments = new Set<number>();

async function withTournamentLock<T extends { error?: string }>(
  tournamentId: number,
  run: () => Promise<T>,
): Promise<T> {
  if (busyTournaments.has(tournamentId)) {
    return { error: "Другое действие с этим турниром уже выполняется — подождите секунду и повторите" } as T;
  }
  busyTournaments.add(tournamentId);
  try {
    return await run();
  } finally {
    busyTournaments.delete(tournamentId);
  }
}

export async function adminListRegistrations(tournamentId: number) {
  await requireAdmin();
  return db
    .select()
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(registrations.createdAt);
}

export interface ParticipantSearchRow {
  id: number;
  name: string;
  phone: string;
  status: string;
  tournamentId: number;
  tournamentTitle: string;
  createdAt: string;
}

// The bot already has a phone/name search, but only inside the admin
// Telegram chat — this is the same lookup for the web dashboard, so
// finding "has this person ever applied" doesn't require opening every
// tournament's "Заявки" dialog one at a time.
export async function adminSearchParticipants(query: string): Promise<ParticipantSearchRow[]> {
  await requireAdmin();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const digitsQ = normalizePhone(query);

  const rows = await db
    .select({
      id: registrations.id,
      name: registrations.name,
      phone: registrations.phone,
      status: registrations.status,
      createdAt: registrations.createdAt,
      tournamentId: tournaments.id,
      tournamentTitle: tournaments.title,
    })
    .from(registrations)
    .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
    .orderBy(desc(registrations.createdAt));

  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      (digitsQ.length >= 4 && normalizePhone(r.phone).includes(digitsQ)),
  );
}

export interface TournamentActionRow {
  id: number;
  playerName: string;
  adminUsername: string | null;
  type: string;
  chips: number | null;
  money: number | null;
  createdAt: string;
}

// The rebuy/addon/eliminate audit log (tournament_actions) was write-only —
// logged on every action but nowhere to actually read it back. This is the
// read side, for the "История действий" list in the live tournament view.
export async function adminListTournamentActions(tournamentId: number): Promise<TournamentActionRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: tournamentActions.id,
      playerName: registrations.name,
      adminUsername: tournamentActions.adminUsername,
      type: tournamentActions.type,
      chips: tournamentActions.chips,
      money: tournamentActions.money,
      createdAt: tournamentActions.createdAt,
    })
    .from(tournamentActions)
    .innerJoin(registrations, eq(tournamentActions.registrationId, registrations.id))
    .where(eq(tournamentActions.tournamentId, tournamentId))
    .orderBy(desc(tournamentActions.createdAt));
  return rows;
}

export async function adminRemoveRegistration(id: number) {
  await requireAdmin();
  await db.delete(registrations).where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}

export interface UpdateContactResult {
  error?: string;
  success?: boolean;
}

// Fixes a typo'd name/phone without deleting and recreating the whole
// application (which would lose its seat, status, and history).
export async function adminUpdateRegistrationContact(
  id: number,
  name: string,
  phone: string,
): Promise<UpdateContactResult> {
  await requireAdmin();
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  if (trimmedName.length < 2) return { error: "Введите имя" };
  if (trimmedPhone.length < 5) return { error: "Введите номер телефона" };

  await db
    .update(registrations)
    .set({ name: trimmedName, phone: trimmedPhone })
    .where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function adminSetRegistrationStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
) {
  await requireAdmin();
  const result = await setRegistrationStatus(id, status);
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return result;
}

export interface BulkApproveResult {
  approved: number;
  failed: number;
}

// Approves every still-pending application one at a time (reusing the same
// per-registration capacity check and Telegram notify as a single approve)
// rather than in parallel — sequential calls mean the capacity check on
// registration N sees registration N-1's approval already counted, so a
// tournament with fewer open seats than pending applicants stops exactly
// at the cap instead of overbooking.
export async function adminApproveAllPending(tournamentId: number): Promise<BulkApproveResult> {
  await requireAdmin();
  const pending = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "pending")));

  let approved = 0;
  let failed = 0;
  for (const r of pending) {
    const result = await setRegistrationStatus(r.id, "approved");
    if (result.error) failed++;
    else approved++;
  }

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { approved, failed };
}

export interface AssignSeatsResult {
  error?: string;
  seated?: number;
  unseated?: number;
}

// Seats only the not-yet-seated approved applicants — players who are
// already seated keep their table/seat (re-running this after new
// approvals shouldn't move people who already told their friends where
// they're sitting). New arrivals are shuffled (Fisher-Yates) and then
// each placed at whichever table currently has the fewest occupants, so
// the whole tournament stays balanced (every table within 1 player of
// every other) no matter how many passes this runs across.
export async function adminAssignSeats(tournamentId: number): Promise<AssignSeatsResult> {
  await requireAdmin();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament?.tableCount || !tournament?.seatsPerTable) {
    return { error: "Для этого турнира не настроена рассадка по столам" };
  }
  const { tableCount, seatsPerTable } = tournament;

  const approved = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "approved")));

  const isValidSeat = (t: number | null, s: number | null): t is number =>
    t != null && s != null && t >= 1 && t <= tableCount && s >= 1 && s <= seatsPerTable;

  const alreadySeated = approved.filter((r) => isValidSeat(r.tableNumber, r.seatNumber));
  const needsSeating = approved.filter((r) => !isValidSeat(r.tableNumber, r.seatNumber));

  const occupiedByTable: Set<number>[] = Array.from({ length: tableCount }, () => new Set<number>());
  for (const r of alreadySeated) {
    occupiedByTable[r.tableNumber! - 1].add(r.seatNumber!);
  }

  const shuffled = shuffle(needsSeating);
  const plan = planBalancedSeats(shuffled.length, tableCount, seatsPerTable, occupiedByTable);
  const toSeat = shuffled.slice(0, plan.length);
  const overflow = shuffled.slice(plan.length);

  for (const [i, reg] of toSeat.entries()) {
    await db.update(registrations).set(plan[i]).where(eq(registrations.id, reg.id));
    // Only the newly-seated get pinged — re-running this after new
    // approvals shouldn't re-notify everyone who was already seated.
    if (reg.telegramChatId) {
      sendTelegramMessage(
        reg.telegramChatId,
        buildSeatAssignedMessage(tournament, plan[i].tableNumber, plan[i].seatNumber),
      ).catch((err) => console.error("[telegram] seat notify failed:", err));
    }
  }
  for (const reg of overflow) {
    if (reg.tableNumber != null || reg.seatNumber != null) {
      await db
        .update(registrations)
        .set({ tableNumber: null, seatNumber: null })
        .where(eq(registrations.id, reg.id));
    }
  }

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { seated: alreadySeated.length + toSeat.length, unseated: overflow.length };
}

// --- live tournament play: start, rebuy/addon, elimination, finish -------

export async function adminStartTournament(tournamentId: number): Promise<ActionResult> {
  await requireAdmin();

  return withTournamentLock<ActionResult>(tournamentId, async () => {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) return { error: "Турнир не найден" };

    await db.update(tournaments).set({ status: "live" }).where(eq(tournaments.id, tournamentId));

    // Only seated approved players actually start playing — anyone approved
    // but never seated (shouldn't normally happen) sits out rather than
    // silently getting a stack with no table.
    await db
      .update(registrations)
      .set({ status: "playing", currentStack: tournament.startingStack ?? null })
      .where(
        and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.status, "approved"),
          isNotNull(registrations.tableNumber),
          isNotNull(registrations.seatNumber),
        ),
      );

    revalidatePath("/tournaments");
    revalidatePath("/admin/dashboard");
    return { success: true };
  });
}

export interface StackActionResult {
  error?: string;
  success?: boolean;
  newStack?: number;
}

export async function adminRebuyOrAddon(
  registrationId: number,
  type: "rebuy" | "addon",
  chips: number,
  money: number,
): Promise<StackActionResult> {
  const session = await requireAdmin();

  const [reg] = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  if (!reg) return { error: "Игрок не найден" };
  if (reg.status !== "playing") return { error: "Игрок сейчас не в игре" };

  return withTournamentLock<StackActionResult>(reg.tournamentId, async () => {
    const newStack = (reg.currentStack ?? 0) + chips;
    await db
      .update(registrations)
      .set({
        currentStack: newStack,
        rebuyCount: type === "rebuy" ? reg.rebuyCount + 1 : reg.rebuyCount,
        addonCount: type === "addon" ? reg.addonCount + 1 : reg.addonCount,
        totalSpent: reg.totalSpent + money,
      })
      .where(eq(registrations.id, registrationId));

    await db.insert(tournamentActions).values({
      tournamentId: reg.tournamentId,
      registrationId,
      adminUsername: session.username,
      type,
      chips,
      money,
    });

    revalidatePath("/tournaments");
    revalidatePath("/admin/dashboard");
    return { success: true, newStack };
  });
}

export interface EliminateResult {
  error?: string;
  success?: boolean;
  place?: number;
  tournamentFinished?: boolean;
}

// Places are assigned strictly in reverse elimination order — the first
// player(s) out get the lowest place (equal to however many were still live
// including them), each subsequent bust gets a better place. Passing more
// than one id handles a simultaneous multi-way bust (e.g. two players
// all-in against each other in the same hand) — poker convention awards
// every player in that hand the *better* of the places they'd otherwise
// span (two players busting out of 5 live are both "tied for 4th", not
// 4th and 5th separately), so the batch place is live-count minus batch
// size plus one, computed once for the whole group. Once one player
// remains, they never need their own "eliminate" click — there's no one
// left to bust them, so they're automatically crowned 1st.
export async function adminEliminatePlayers(registrationIds: number[]): Promise<EliminateResult> {
  const ids = [...new Set(registrationIds)];
  if (ids.length === 0) return { error: "Не выбрано ни одного игрока" };
  const session = await requireAdmin();

  const regs = await db.select().from(registrations).where(inArray(registrations.id, ids));
  if (regs.length !== ids.length) return { error: "Некоторые игроки не найдены" };
  if (regs.some((r) => r.status !== "playing")) return { error: "Не все выбранные игроки сейчас в игре" };
  const tournamentId = regs[0].tournamentId;
  if (regs.some((r) => r.tournamentId !== tournamentId)) {
    return { error: "Нельзя отметить вылет игроков из разных турниров одновременно" };
  }

  return withTournamentLock<EliminateResult>(tournamentId, async () => {
    const live = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "playing")));

    const place = live.length - ids.length + 1;
    const eliminatedAt = new Date().toISOString();

    await db
      .update(registrations)
      .set({ status: "eliminated", place, eliminatedAt })
      .where(inArray(registrations.id, ids));

    for (const registrationId of ids) {
      await db.insert(tournamentActions).values({
        tournamentId,
        registrationId,
        adminUsername: session.username,
        type: "eliminate",
      });
    }

    // Normally the admin never clicks "eliminate" on the very last player (no
    // one is left to bust them), so `remaining === 1` is the common finish —
    // that lone survivor is auto-crowned 1st. But if the last player(s) *are*
    // eliminated directly (e.g. a manual correction), `remaining <= 0` still
    // means the tournament is over, just with no one left to crown.
    const remaining = live.length - ids.length;
    let tournamentFinished = false;
    if (remaining <= 1) {
      if (remaining === 1) {
        const winner = live.find((r) => !ids.includes(r.id));
        if (winner) {
          await db
            .update(registrations)
            .set({ status: "eliminated", place: 1, eliminatedAt: new Date().toISOString() })
            .where(eq(registrations.id, winner.id));
        }
      }
      tournamentFinished = true;
    }

    revalidatePath("/tournaments");
    revalidatePath("/admin/dashboard");
    return { success: true, place, tournamentFinished };
  });
}

export interface FinishTournamentResult {
  error?: string;
  success?: boolean;
  ratingsUpdated?: number;
}

// Rating is only computed once every seat has a final place — a tournament
// that's still 3-handed doesn't have enough information to score anyone
// fairly yet.
// Shared by adminFinishTournament and adminRecalculateRating — reads every
// eliminated+placed registration for the tournament, scores each against
// the field, and records/applies it. Assumes any previous rating effect
// this tournament had has already been undone by the caller.
async function applyRatingForTournament(
  tournamentId: number,
): Promise<{ error?: string; ratingsUpdated?: number }> {
  const finished = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.status, "eliminated"),
        isNotNull(registrations.place),
      ),
    );
  if (finished.length === 0) {
    return { error: "Нет результатов для подсчёта рейтинга" };
  }

  const playerCount = finished.length;
  let ratingsUpdated = 0;

  for (const reg of finished) {
    const phone = normalizePhone(reg.phone);
    let [player] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
    if (!player) {
      const [created] = await db
        .insert(players)
        .values({ phone, name: reg.name, telegramChatId: reg.telegramChatId })
        .returning();
      player = created;
    }

    const { pointsEarned, newRating } = computeRatingChange(player.rating, reg.place!, playerCount);

    await db.insert(ratingHistory).values({
      playerId: player.id,
      tournamentId,
      oldRating: player.rating,
      newRating,
      place: reg.place!,
      pointsEarned,
    });

    await db
      .update(players)
      .set({
        rating: newRating,
        tournamentsPlayed: player.tournamentsPlayed + 1,
        name: reg.name,
        telegramChatId: reg.telegramChatId ?? player.telegramChatId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(players.id, player.id));

    await db.update(registrations).set({ playerId: player.id }).where(eq(registrations.id, reg.id));
    ratingsUpdated++;
  }

  return { ratingsUpdated };
}

export async function adminFinishTournament(tournamentId: number): Promise<FinishTournamentResult> {
  await requireAdmin();

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) return { error: "Турнир не найден" };

  return withTournamentLock<FinishTournamentResult>(tournamentId, async () => {
    const stillPlaying = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "playing")));
    if (stillPlaying.length > 0) {
      return { error: `В турнире ещё ${stillPlaying.length} играющих — сначала доиграйте до конца` };
    }

    // Test tournaments (is_hidden) are for trying out the live-play tools —
    // they must never touch the real players/rating tables, or fake test
    // names would show up in the public rating.
    if (tournament.isHidden) {
      await db.update(tournaments).set({ status: "completed" }).where(eq(tournaments.id, tournamentId));
      revalidatePath("/tournaments");
      revalidatePath("/admin/dashboard");
      return { success: true, ratingsUpdated: 0 };
    }

    const result = await applyRatingForTournament(tournamentId);
    if (result.error) return result;

    await db.update(tournaments).set({ status: "completed" }).where(eq(tournaments.id, tournamentId));

    revalidatePath("/tournaments");
    revalidatePath("/admin/dashboard");
    revalidatePath("/rating");
    return { success: true, ratingsUpdated: result.ratingsUpdated };
  });
}

export interface RecalculateRatingResult {
  error?: string;
  success?: boolean;
  ratingsUpdated?: number;
}

// An admin can already hand-correct a wrong `place` on a completed
// tournament's eliminated rows (in the Заявки dialog) — what was missing
// was a way to then recompute the rating this tournament already applied,
// using the corrected places. Only safe when this was the *last*
// tournament finished for every affected player: if a later tournament
// already built its own rating change on top of this one, undoing this
// one first would invalidate that later math too, so it refuses instead
// of silently corrupting it.
export async function adminRecalculateRating(tournamentId: number): Promise<RecalculateRatingResult> {
  await requireAdmin();

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) return { error: "Турнир не найден" };
  if (tournament.status !== "completed") return { error: "Турнир ещё не завершён" };

  return withTournamentLock<RecalculateRatingResult>(tournamentId, async () => {
    const previousHistory = await db
      .select()
      .from(ratingHistory)
      .where(eq(ratingHistory.tournamentId, tournamentId));
    if (previousHistory.length === 0) {
      return { error: "Для этого турнира ещё не считался рейтинг" };
    }

    for (const entry of previousHistory) {
      const [laterEntry] = await db
        .select({ id: ratingHistory.id })
        .from(ratingHistory)
        .where(and(eq(ratingHistory.playerId, entry.playerId), gt(ratingHistory.id, entry.id)))
        .limit(1);
      if (laterEntry) {
        const [player] = await db
          .select({ name: players.name })
          .from(players)
          .where(eq(players.id, entry.playerId))
          .limit(1);
        return {
          error: `Нельзя пересчитать — у игрока «${player?.name ?? "#" + entry.playerId}» уже есть более поздний турнир с посчитанным рейтингом`,
        };
      }
    }

    for (const entry of previousHistory) {
      const [player] = await db.select().from(players).where(eq(players.id, entry.playerId)).limit(1);
      if (player) {
        await db
          .update(players)
          .set({ rating: entry.oldRating, tournamentsPlayed: Math.max(0, player.tournamentsPlayed - 1) })
          .where(eq(players.id, player.id));
      }
      await db.delete(ratingHistory).where(eq(ratingHistory.id, entry.id));
    }

    const result = await applyRatingForTournament(tournamentId);
    if (result.error) return result;

    revalidatePath("/tournaments");
    revalidatePath("/admin/dashboard");
    revalidatePath("/rating");
    return { success: true, ratingsUpdated: result.ratingsUpdated };
  });
}

export interface RebalanceResult {
  error?: string;
  success?: boolean;
  tableCount?: number;
}

// Consolidates every currently-playing player onto fewer tables as the
// field shrinks (e.g. 45 players on 5 tables of 9 drops to 31 and running
// 5 half-empty tables no longer makes sense). Unlike initial seating —
// which never moves an already-seated player — this is an explicit admin
// action that's meant to move everyone, the same way a live tournament
// "breaks" a table and randomly reseats its players elsewhere.
export async function adminRebalanceTables(tournamentId: number): Promise<RebalanceResult> {
  await requireAdmin();

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament?.tableCount || !tournament?.seatsPerTable) {
    return { error: "Для этого турнира не настроена рассадка по столам" };
  }
  const { tableCount, seatsPerTable } = tournament;

  return withTournamentLock<RebalanceResult>(tournamentId, async () => {
    const playing = await db
      .select()
      .from(registrations)
      .where(and(eq(registrations.tournamentId, tournamentId), eq(registrations.status, "playing")));

    if (playing.length === 0) return { error: "Сейчас никто не играет" };

    const targetTableCount = Math.max(1, Math.min(tableCount, Math.ceil(playing.length / seatsPerTable)));
    const shuffled = shuffle(playing);
    const emptyOccupied: Set<number>[] = Array.from({ length: targetTableCount }, () => new Set<number>());
    const plan = planBalancedSeats(shuffled.length, targetTableCount, seatsPerTable, emptyOccupied);

    for (const [i, reg] of shuffled.entries()) {
      await db.update(registrations).set(plan[i]).where(eq(registrations.id, reg.id));
    }

    revalidatePath("/tournaments");
    revalidatePath("/admin/dashboard");
    return { success: true, tableCount: targetTableCount };
  });
}

export async function adminSetSeat(
  id: number,
  tableNumber: number | null,
  seatNumber: number | null,
) {
  await requireAdmin();
  await db.update(registrations).set({ tableNumber, seatNumber }).where(eq(registrations.id, id));

  if (tableNumber != null && seatNumber != null) {
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
    if (reg?.telegramChatId) {
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, reg.tournamentId)).limit(1);
      if (tournament) {
        sendTelegramMessage(reg.telegramChatId, buildSeatAssignedMessage(tournament, tableNumber, seatNumber)).catch(
          (err) => console.error("[telegram] manual seat notify failed:", err),
        );
      }
    }
  }

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}

export async function adminSetPlace(id: number, place: number | null) {
  await requireAdmin();
  await db.update(registrations).set({ place }).where(eq(registrations.id, id));
  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
}
