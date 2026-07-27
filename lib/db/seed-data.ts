import bcrypt from "bcryptjs";
import { db } from "./client";
import { admins, tournaments, news } from "./schema";

export async function seedAdmin() {
  const existing = await db.select().from(admins).limit(1);
  if (existing.length > 0) return;

  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "[seed] ADMIN_PASSWORD не задан в production. Укажите ADMIN_USERNAME и ADMIN_PASSWORD " +
        "в переменных окружения перед запуском — сайт не будет использовать пароль по умолчанию.",
    );
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(admins).values({ username, passwordHash });

  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      `\n[seed] Создан админ по умолчанию — логин: "${username}", пароль: "${password}".` +
        `\n[seed] Задайте ADMIN_USERNAME/ADMIN_PASSWORD в .env, чтобы сменить их.\n`,
    );
  }
}

// Pins the seed tournaments' clock time to a normal club evening (19:00
// Moscow, fixed UTC+3 — Russia has had no DST since 2014) instead of
// whatever second the server happened to first boot at, which otherwise
// produced a nonsensical displayed time like "10:57".
function moscowEvening(daysFromNow: number) {
  const d = new Date(Date.now() + daysFromNow * 24 * 3600 * 1000);
  d.setUTCHours(16, 0, 0, 0);
  return d.toISOString();
}

export async function seedSampleData() {
  const existingTournaments = await db.select().from(tournaments).limit(1);

  if (existingTournaments.length === 0) {
    const inOneWeek = moscowEvening(7);
    const inTwoWeeks = moscowEvening(14);
    const lastWeek = moscowEvening(-7);

    await db.insert(tournaments).values([
      {
        title: "Weekly NLH Freezeout",
        format: "NLH",
        startsAt: inOneWeek,
        buyIn: 2000,
        description: "Классический фризаут, структура 20 минут на уровень.",
        status: "upcoming",
      },
      {
        title: "PLO Deepstack",
        format: "PLO",
        startsAt: inTwoWeeks,
        buyIn: 3000,
        description: "Глубокие стеки, время подумать над решениями.",
        status: "upcoming",
      },
      {
        title: "Sunday MTT",
        format: "MTT",
        startsAt: lastWeek,
        buyIn: 1500,
        description: "Многостоловый турнир с гарантией.",
        status: "completed",
      },
    ]);
  }

  const existingNews = await db.select().from(news).limit(1);

  if (existingNews.length === 0) {
    await db.insert(news).values({
      title: "Добро пожаловать в Royal63",
      slug: "dobro-pozhalovat-v-royal63",
      excerpt: "Мы запустили новый сайт клуба.",
      content:
        "Мы запустили новый сайт клуба.\nСледите за расписанием турниров и новостями здесь.",
    });
  }
}
