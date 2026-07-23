import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tournaments = sqliteTable("tournaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  format: text("format", { enum: ["NLH", "PLO", "MTT"] }).notNull(),
  startsAt: text("starts_at").notNull(),
  buyIn: integer("buy_in"),
  description: text("description"),
  maxPlayers: integer("max_players"),
  tableCount: integer("table_count"),
  seatsPerTable: integer("seats_per_table"),
  status: text("status", { enum: ["upcoming", "live", "completed"] })
    .notNull()
    .default("upcoming"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;

export const registrations = sqliteTable("registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  cancelToken: text("cancel_token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  tableNumber: integer("table_number"),
  seatNumber: integer("seat_number"),
  // Final standing once the tournament is marked completed (1 = winner).
  // Only meaningful for approved registrations.
  place: integer("place"),
  telegramChatId: text("telegram_chat_id"),
  reminded72h: integer("reminded_72h", { mode: "boolean" }).notNull().default(false),
  reminded48h: integer("reminded_48h", { mode: "boolean" }).notNull().default(false),
  reminded24h: integer("reminded_24h", { mode: "boolean" }).notNull().default(false),
  reminded2h: integer("reminded_2h", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;

export const news = sqliteTable("news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  publishedAt: text("published_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type NewsArticle = typeof news.$inferSelect;
export type NewNewsArticle = typeof news.$inferInsert;

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export type Admin = typeof admins.$inferSelect;
