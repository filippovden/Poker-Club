import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
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
  // Chip counts for the buy-in / rebuy / addon — nullable since not every
  // tournament format tracks stacks (e.g. a plain cash-game-style meetup).
  startingStack: integer("starting_stack"),
  rebuyChips: integer("rebuy_chips"),
  addonChips: integer("addon_chips"),
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
  // Links to a persistent players row (matched by phone) once the rating
  // system needs to track this person across tournaments — nullable
  // because it's only populated when the tournament actually runs.
  playerId: integer("player_id").references(() => players.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  comment: text("comment"),
  cancelToken: text("cancel_token").notNull().unique(),
  // Application lifecycle: pending -> approved -> rejected, then once the
  // tournament actually starts, approved+seated rows move to playing and
  // finally eliminated (busted, or the last one standing at the end).
  status: text("status").notNull().default("pending"),
  tableNumber: integer("table_number"),
  seatNumber: integer("seat_number"),
  currentStack: integer("current_stack"),
  rebuyCount: integer("rebuy_count").notNull().default(0),
  addonCount: integer("addon_count").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  eliminatedAt: text("eliminated_at"),
  // Final standing once the tournament is marked completed (1 = winner).
  // Only meaningful for approved registrations.
  place: integer("place"),
  telegramChatId: text("telegram_chat_id"),
  telegramUsername: text("telegram_username"),
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

// A persistent player identity across tournaments, matched by phone number
// (the one piece of contact info every registration always has). Created
// lazily the first time a tournament actually finishes and rating needs
// somewhere to live — a one-off application never needs one.
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  telegramChatId: text("telegram_chat_id"),
  rating: real("rating").notNull().default(1000),
  tournamentsPlayed: integer("tournaments_played").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export const ratingHistory = sqliteTable("rating_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  oldRating: real("old_rating").notNull(),
  newRating: real("new_rating").notNull(),
  place: integer("place").notNull(),
  pointsEarned: real("points_earned").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type RatingHistoryRow = typeof ratingHistory.$inferSelect;

// Full audit log of every stack-affecting or seating action taken during a
// live tournament — separate from the registrations row itself (which only
// holds current totals) so organizers can see exactly what happened and when.
export const tournamentActions = sqliteTable("tournament_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => registrations.id, { onDelete: "cascade" }),
  // Free-text admin username rather than an admin id — the site only has a
  // single shared admin login (lib/db/schema.ts's own `admins` table), not
  // per-staff accounts, so there's no stable id to reference.
  adminUsername: text("admin_username"),
  type: text("type", { enum: ["rebuy", "addon", "eliminate", "manual_seat_change"] }).notNull(),
  chips: integer("chips"),
  money: integer("money"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type TournamentAction = typeof tournamentActions.$inferSelect;

export const news = sqliteTable("news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  category: text("category", { enum: ["announcement", "results", "general"] })
    .notNull()
    .default("general"),
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
