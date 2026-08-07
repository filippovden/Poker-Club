"use server";

import { randomUUID } from "node:crypto";
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
  // Valid phone+name, but no application on file for this tournament — the
  // caller offers to register this person on the spot rather than treating
  // it as an error, since walk-ins who never applied online are expected.
  notFound?: boolean;
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
    return { tournamentTitle: tournament.title, notFound: true };
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

export interface RegisterAndConfirmResult {
  error?: string;
  success?: boolean;
  checkedInAt?: string;
}

// A guest who showed up without ever applying online — walks straight in
// as an approved, already-checked-in registration instead of forcing them
// (or staff) through the normal apply-then-approve flow at the door.
// Requires the same consent tick as the public registration form, since
// this is the first time we're storing this person's personal data.
export async function checkinRegisterAndConfirmAction(
  token: string,
  phone: string,
  name: string,
  consent: boolean,
): Promise<RegisterAndConfirmResult> {
  const tournament = await getTournamentByToken(token);
  if (!tournament) return { error: "Турнир не найден" };
  if (tournament.status === "completed") {
    return { error: "Регистрация на этот турнир уже закрыта" };
  }
  if (!consent) {
    return { error: "Нужно согласие на обработку персональных данных" };
  }

  const trimmedName = name.trim();
  const normalizedPhone = normalizePhone(phone);
  if (trimmedName.length < 2) return { error: "Введите имя" };
  if (normalizedPhone.length < 10) return { error: "Введите телефон" };

  const checkedInAt = new Date().toISOString();

  // A typo in the name on the first lookup (e.g. "Ваня" vs "Иван") would
  // otherwise create a duplicate registration for someone who actually
  // already applied — re-check by phone alone, ignoring name, before
  // creating a new row.
  const candidates = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.status, ["approved", "playing"]),
      ),
    );
  const phoneMatch = candidates.find((r) => normalizePhone(r.phone) === normalizedPhone) ?? null;

  if (phoneMatch) {
    if (!phoneMatch.checkedIn) {
      await db
        .update(registrations)
        .set({ checkedIn: true, checkedInAt })
        .where(eq(registrations.id, phoneMatch.id));
    }
    revalidatePath("/admin/dashboard");
    return { success: true, checkedInAt: phoneMatch.checkedInAt ?? checkedInAt };
  }

  await db.insert(registrations).values({
    tournamentId: tournament.id,
    name: trimmedName,
    phone: phone.trim(),
    cancelToken: randomUUID(),
    status: "approved",
    checkedIn: true,
    checkedInAt,
  });

  revalidatePath("/tournaments");
  revalidatePath("/admin/dashboard");
  return { success: true, checkedInAt };
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
