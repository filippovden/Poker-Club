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
