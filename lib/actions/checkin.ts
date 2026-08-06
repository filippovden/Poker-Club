"use server";

import QRCode from "qrcode";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";
import { getSession } from "@/lib/auth/session";
import { SITE_CONTENT } from "@/lib/content";

async function getTournamentByToken(token: string) {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.checkinToken, token)).limit(1);
  return t ?? null;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
}

export interface CheckinQrResult {
  error?: string;
  url?: string;
  dataUrl?: string;
}

// Rendered server-side (not with a client QR library) so the tournament's
// secret check-in token never has to be handed to browser JS just to draw
// a code — the admin dashboard only ever sees the finished image.
export async function generateCheckinQrAction(tournamentId: number): Promise<CheckinQrResult> {
  await requireAdmin();
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament?.checkinToken) return { error: "Для этого турнира ещё нет QR-кода" };

  const url = `https://${SITE_CONTENT.domain}/checkin/${tournament.checkinToken}`;
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 360 });
  return { url, dataUrl };
}

export interface CheckinMatch {
  registrationId: number;
  name: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  tableNumber: number | null;
  seatNumber: number | null;
}

export interface CheckinFindResult {
  error?: string;
  tournamentTitle?: string;
  matches?: CheckinMatch[];
}

// Self-identification step: the QR only carries the tournament (not the
// person), so whoever scans it types the phone+name they applied with —
// same convention as the public /registration/status lookup. Only
// approved/playing registrations are eligible (a rejected or already
// -eliminated application has nothing to check in for).
export async function checkinFindRegistrationAction(
  token: string,
  phone: string,
  name: string,
): Promise<CheckinFindResult> {
  const tournament = await getTournamentByToken(token);
  if (!tournament) return { error: "Турнир не найден" };

  const normalizedPhone = normalizePhone(phone);
  const normalizedName = name.trim().toLowerCase();
  if (normalizedPhone.length < 10 || !normalizedName) {
    return { error: "Введите телефон и имя, указанные при регистрации" };
  }

  const rows = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.status, ["approved", "playing"]),
      ),
    );

  const matches = rows.filter(
    (r) => normalizePhone(r.phone) === normalizedPhone && r.name.trim().toLowerCase() === normalizedName,
  );

  if (matches.length === 0) {
    return {
      error:
        "Заявка не найдена — проверьте телефон и имя (как указывали при регистрации), либо обратитесь к организатору",
    };
  }

  return {
    tournamentTitle: tournament.title,
    matches: matches.map((r) => ({
      registrationId: r.id,
      name: r.name,
      checkedIn: r.checkedIn,
      checkedInAt: r.checkedInAt,
      tableNumber: r.tableNumber,
      seatNumber: r.seatNumber,
    })),
  };
}

export interface CheckinConfirmResult {
  error?: string;
  success?: boolean;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string | null;
}

export async function confirmCheckinAction(
  token: string,
  registrationId: number,
): Promise<CheckinConfirmResult> {
  const tournament = await getTournamentByToken(token);
  if (!tournament) return { error: "Турнир не найден" };

  const [reg] = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  if (!reg || reg.tournamentId !== tournament.id) return { error: "Заявка не найдена" };
  if (reg.status !== "approved" && reg.status !== "playing") {
    return { error: "Эта заявка сейчас недоступна для отметки" };
  }

  if (reg.checkedIn) {
    return { success: true, alreadyCheckedIn: true, checkedInAt: reg.checkedInAt };
  }

  const checkedInAt = new Date().toISOString();
  await db
    .update(registrations)
    .set({ checkedIn: true, checkedInAt })
    .where(eq(registrations.id, registrationId));

  revalidatePath("/admin/dashboard");
  return { success: true, checkedInAt };
}
