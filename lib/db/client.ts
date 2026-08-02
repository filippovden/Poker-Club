import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

declare global {
  var __lpSqlite: DatabaseSync | undefined;
}

const DB_PATH = path.join(process.cwd(), "data.sqlite");

const sqlite = globalThis.__lpSqlite ?? new DatabaseSync(DB_PATH);
if (process.env.NODE_ENV !== "production") globalThis.__lpSqlite = sqlite;

sqlite.exec("PRAGMA foreign_keys = ON;");
// Next's build collects page data across several worker processes, each
// opening its own handle to the same file — without a busy timeout, one
// worker's schema-migration write makes every other worker's fail outright
// with SQLITE_ERROR instead of just waiting its turn.
sqlite.exec("PRAGMA busy_timeout = 5000;");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    buy_in INTEGER,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TEXT NOT NULL DEFAULT (current_timestamp)
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    published_at TEXT NOT NULL DEFAULT (current_timestamp)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    cancel_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (current_timestamp)
  );
`);

// tournaments.max_players was added after initial release — backfill the
// column on existing databases instead of requiring a fresh data.sqlite.
const tournamentColumns = sqlite
  .prepare("PRAGMA table_info(tournaments)")
  .all() as { name: string }[];
if (!tournamentColumns.some((c) => c.name === "max_players")) {
  sqlite.exec("ALTER TABLE tournaments ADD COLUMN max_players INTEGER;");
}

// registrations.status was added after initial release (pending/approved/
// rejected application flow) — backfill for existing databases.
const registrationColumns = sqlite
  .prepare("PRAGMA table_info(registrations)")
  .all() as { name: string }[];
if (!registrationColumns.some((c) => c.name === "status")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';");
}

// tournaments.table_count/seats_per_table and registrations.table_number/
// seat_number power the seating grid + admin seat assignment — backfill.
if (!tournamentColumns.some((c) => c.name === "table_count")) {
  sqlite.exec("ALTER TABLE tournaments ADD COLUMN table_count INTEGER;");
}
if (!tournamentColumns.some((c) => c.name === "seats_per_table")) {
  sqlite.exec("ALTER TABLE tournaments ADD COLUMN seats_per_table INTEGER;");
}
if (!registrationColumns.some((c) => c.name === "table_number")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN table_number INTEGER;");
}
if (!registrationColumns.some((c) => c.name === "seat_number")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN seat_number INTEGER;");
}

// registrations.telegram_chat_id + reminded_* power the Telegram bot
// (linking a registration to a chat, and tracking which pre-tournament
// reminders already went out) — backfill for existing databases.
if (!registrationColumns.some((c) => c.name === "telegram_chat_id")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN telegram_chat_id TEXT;");
}
for (const col of ["reminded_72h", "reminded_48h", "reminded_24h", "reminded_2h"]) {
  if (!registrationColumns.some((c) => c.name === col)) {
    sqlite.exec(`ALTER TABLE registrations ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0;`);
  }
}

// registrations.place holds the final standing (1st, 2nd, ...) once a
// tournament is marked completed — backfill for existing databases.
if (!registrationColumns.some((c) => c.name === "place")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN place INTEGER;");
}

// news.category (announcement/results/general) was added after initial
// release — backfill for existing databases.
const newsColumns = sqlite.prepare("PRAGMA table_info(news)").all() as { name: string }[];
if (!newsColumns.some((c) => c.name === "category")) {
  sqlite.exec("ALTER TABLE news ADD COLUMN category TEXT NOT NULL DEFAULT 'general';");
}

// registrations.telegram_username lets the admin chat's participant list
// show a clickable @handle, not just phone/name — backfill for existing
// databases.
if (!registrationColumns.some((c) => c.name === "telegram_username")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN telegram_username TEXT;");
}

// registrations.comment holds the applicant's optional free-text note —
// backfill for existing databases.
if (!registrationColumns.some((c) => c.name === "comment")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN comment TEXT;");
}

// tournaments.starting_stack/rebuy_chips/addon_chips power the live
// rebuy/addon tracking — backfill for existing databases.
for (const col of ["starting_stack", "rebuy_chips", "addon_chips"]) {
  if (!tournamentColumns.some((c) => c.name === col)) {
    sqlite.exec(`ALTER TABLE tournaments ADD COLUMN ${col} INTEGER;`);
  }
}

// registrations.player_id/current_stack/rebuy_count/addon_count/
// total_spent/eliminated_at power live tournament play (stacks, rebuys,
// addons, elimination order) and the cross-tournament rating system —
// backfill for existing databases.
if (!registrationColumns.some((c) => c.name === "player_id")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN player_id INTEGER REFERENCES players(id);");
}
if (!registrationColumns.some((c) => c.name === "current_stack")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN current_stack INTEGER;");
}
if (!registrationColumns.some((c) => c.name === "rebuy_count")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN rebuy_count INTEGER NOT NULL DEFAULT 0;");
}
if (!registrationColumns.some((c) => c.name === "addon_count")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN addon_count INTEGER NOT NULL DEFAULT 0;");
}
if (!registrationColumns.some((c) => c.name === "total_spent")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN total_spent INTEGER NOT NULL DEFAULT 0;");
}
if (!registrationColumns.some((c) => c.name === "eliminated_at")) {
  sqlite.exec("ALTER TABLE registrations ADD COLUMN eliminated_at TEXT;");
}

// players/rating_history/tournament_actions are new tables added for the
// cross-tournament rating system and the full stack-action audit log.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    telegram_chat_id TEXT,
    rating REAL NOT NULL DEFAULT 1000,
    tournaments_played INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (current_timestamp),
    updated_at TEXT NOT NULL DEFAULT (current_timestamp)
  );

  CREATE TABLE IF NOT EXISTS rating_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    old_rating REAL NOT NULL,
    new_rating REAL NOT NULL,
    place INTEGER NOT NULL,
    points_earned REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (current_timestamp)
  );

  CREATE TABLE IF NOT EXISTS tournament_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    admin_username TEXT,
    type TEXT NOT NULL,
    chips INTEGER,
    money INTEGER,
    created_at TEXT NOT NULL DEFAULT (current_timestamp)
  );
`);

export const db = drizzle(
  async (sql, params, method) => {
    const stmt = sqlite.prepare(sql);
    if (method === "run") {
      stmt.run(...params);
      return { rows: [] };
    }
    if (method === "get") {
      const row = stmt.get(...params) as Record<string, unknown> | undefined;
      return { rows: row ? Object.values(row) : [] };
    }
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return { rows: rows.map((row) => Object.values(row)) };
  },
  { schema, casing: "snake_case" },
);
