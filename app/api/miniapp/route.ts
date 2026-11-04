import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { players, ratingHistory, registrations, tournaments } from "@/lib/db/schema";
import { createRegistration } from "@/lib/registrations/create";
import { verifyMiniAppInitData } from "@/lib/telegram/miniapp-auth";

function userFrom(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("tma ") ? verifyMiniAppInitData(auth.slice(4)) : null;
}

const unauthorized = () => Response.json({ error: "Откройте приложение из Telegram заново." }, { status: 401 });

export async function GET(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  const chatId = String(user.id);
  const [own, [player]] = await Promise.all([
    db.select().from(registrations).where(eq(registrations.telegramChatId, chatId)).orderBy(desc(registrations.createdAt)),
    db.select({ id: players.id, name: players.name, rating: players.rating, tournamentsPlayed: players.tournamentsPlayed })
      .from(players).where(eq(players.telegramChatId, chatId)).limit(1),
  ]);
  const ids = [...new Set(own.map((r) => r.tournamentId))];
  const history = player ? await db.select().from(ratingHistory)
    .where(eq(ratingHistory.playerId, player.id)).orderBy(desc(ratingHistory.createdAt)).limit(8) : [];
  const relatedIds = [...new Set([...ids, ...history.map((row) => row.tournamentId)])];
  const related = relatedIds.length ? await db.select().from(tournaments).where(inArray(tournaments.id, relatedIds)) : [];
  const names = new Map(related.map((t) => [t.id, t]));
  return Response.json({
    user,
    profile: player ?? null,
    suggestedName: own[0]?.name ?? player?.name ?? "",
    suggestedPhone: own[0]?.phone ?? "",
    results: history.map((row) => ({
      tournamentId: row.tournamentId, title: names.get(row.tournamentId)?.title ?? "Турнир",
      place: row.place, points: row.pointsEarned,
    })),
    registrations: own.filter((r) => names.has(r.tournamentId)).map((r) => {
      const tournament = names.get(r.tournamentId)!;
      return {
        id: r.id, tournamentId: r.tournamentId, title: tournament.title,
        startsAt: tournament.startsAt, status: r.status,
        tableNumber: r.tableNumber, seatNumber: r.seatNumber, place: r.place,
        checkedIn: r.checkedIn,
        canCancel: ["pending", "approved", "rejected"].includes(r.status) && tournament.status === "upcoming",
      };
    }),
  });
}

export async function POST(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Некорректная заявка" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Некорректная заявка" }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (data.consent !== true || data.ageConfirmed !== true) {
    return Response.json({ error: "Подтвердите согласие и возраст 18+" }, { status: 400 });
  }
  if (!Number.isSafeInteger(data.tournamentId) || typeof data.name !== "string" || typeof data.phone !== "string") {
    return Response.json({ error: "Проверьте данные заявки" }, { status: 400 });
  }
  const result = await createRegistration({
    tournamentId: Number(data.tournamentId), name: data.name, phone: data.phone,
    telegramChatId: String(user.id), telegramUsername: user.username,
  });
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const id = Number((body as { id?: unknown } | null)?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  const [registration] = await db.select().from(registrations).where(and(
    eq(registrations.id, id), eq(registrations.telegramChatId, String(user.id)),
  )).limit(1);
  if (!registration) return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, registration.tournamentId)).limit(1);
  if (!tournament || tournament.status !== "upcoming" || !["pending", "approved", "rejected"].includes(registration.status)) {
    return Response.json({ error: "Турнир уже начался — обратитесь к организатору" }, { status: 400 });
  }
  await db.delete(registrations).where(and(
    eq(registrations.id, id), eq(registrations.telegramChatId, String(user.id)),
    inArray(registrations.status, ["pending", "approved", "rejected"]),
  ));
  return Response.json({ success: true });
}

export async function PATCH(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Некорректный QR" }, { status: 400 }); }
  const token = (body as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || !/^[a-f\d-]{36}$/i.test(token)) {
    return Response.json({ error: "Это не QR клуба Royal63" }, { status: 400 });
  }
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.checkinToken, token)).limit(1);
  if (!tournament || tournament.status === "completed") return Response.json({ error: "QR турнира недоступен" }, { status: 404 });
  const [registration] = await db.select().from(registrations).where(and(
    eq(registrations.tournamentId, tournament.id), eq(registrations.telegramChatId, String(user.id)),
    inArray(registrations.status, ["approved", "playing"]),
  )).limit(1);
  if (!registration) return Response.json({ error: "Подтверждённая заявка на этот турнир не найдена" }, { status: 404 });
  if (!registration.checkedIn) {
    await db.update(registrations).set({ checkedIn: true, checkedInAt: new Date().toISOString() })
      .where(eq(registrations.id, registration.id));
  }
  return Response.json({ success: true });
}
