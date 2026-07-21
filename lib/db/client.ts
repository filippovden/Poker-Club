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
