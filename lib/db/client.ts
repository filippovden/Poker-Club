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

// Next's build collects page data across several worker processes that
// each open their own handle to this same file — a worker can lose the
// race between checking PRAGMA table_info and running its ALTER TABLE to
// another worker doing the same migration, which fails outright with
// "duplicate column name" rather than just meaning the column is already
// there. That's a success case here, not a real error, so it's swallowed.
function addColumnIfMissing(table: string, column: string, ddl: string) {
  const existing = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (existing.some((c) => c.name === column)) return;
  try {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
  } catch (err) {
    if (!(err instanceof Error) || !/duplicate column/i.test(err.message)) throw err;
  }
}

// tournaments.max_players was added after initial release — backfill the
// column on existing databases instead of requiring a fresh data.sqlite.
addColumnIfMissing("tournaments", "max_players", "INTEGER");

// registrations.status was added after initial release (pending/approved/
// rejected application flow) — backfill for existing databases.
addColumnIfMissing("registrations", "status", "TEXT NOT NULL DEFAULT 'pending'");

// tournaments.table_count/seats_per_table and registrations.table_number/
// seat_number power the seating grid + admin seat assignment — backfill.
addColumnIfMissing("tournaments", "table_count", "INTEGER");
addColumnIfMissing("tournaments", "seats_per_table", "INTEGER");
addColumnIfMissing("registrations", "table_number", "INTEGER");
addColumnIfMissing("registrations", "seat_number", "INTEGER");

// registrations.telegram_chat_id + reminded_* power the Telegram bot
// (linking a registration to a chat, and tracking which pre-tournament
// reminders already went out) — backfill for existing databases.
addColumnIfMissing("registrations", "telegram_chat_id", "TEXT");
for (const col of ["reminded_72h", "reminded_48h", "reminded_24h", "reminded_2h"]) {
  addColumnIfMissing("registrations", col, "INTEGER NOT NULL DEFAULT 0");
}

// registrations.place holds the final standing (1st, 2nd, ...) once a
// tournament is marked completed — backfill for existing databases.
addColumnIfMissing("registrations", "place", "INTEGER");

// news.category (announcement/results/general) was added after initial
// release — backfill for existing databases.
addColumnIfMissing("news", "category", "TEXT NOT NULL DEFAULT 'general'");

// registrations.telegram_username lets the admin chat's participant list
// show a clickable @handle, not just phone/name — backfill for existing
// databases.
addColumnIfMissing("registrations", "telegram_username", "TEXT");

// registrations.comment holds the applicant's optional free-text note —
// backfill for existing databases.
addColumnIfMissing("registrations", "comment", "TEXT");

// tournaments.starting_stack/rebuy_chips/addon_chips power the live
// rebuy/addon tracking — backfill for existing databases.
for (const col of ["starting_stack", "rebuy_chips", "addon_chips"]) {
  addColumnIfMissing("tournaments", col, "INTEGER");
}

// tournaments.is_hidden marks admin-only test tournaments, kept out of
// every public listing/broadcast — backfill for existing databases.
addColumnIfMissing("tournaments", "is_hidden", "INTEGER NOT NULL DEFAULT 0");

// registrations.player_id/current_stack/rebuy_count/addon_count/
// total_spent/eliminated_at power live tournament play (stacks, rebuys,
// addons, elimination order) and the cross-tournament rating system —
// backfill for existing databases.
addColumnIfMissing("registrations", "player_id", "INTEGER REFERENCES players(id)");
addColumnIfMissing("registrations", "current_stack", "INTEGER");
addColumnIfMissing("registrations", "rebuy_count", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("registrations", "addon_count", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("registrations", "total_spent", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("registrations", "eliminated_at", "TEXT");

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
