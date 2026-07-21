import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const db = new DatabaseSync(path.join(__dirname, 'data.sqlite'))

db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    buy_in INTEGER,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    published_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
`)

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admins LIMIT 1').get()
  if (existing) return

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const hash = bcrypt.hashSync(password, 10)

  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
    username,
    hash,
  )

  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      `\n[seed] Создан админ по умолчанию — логин: "${username}", пароль: "${password}".` +
        '\n[seed] Задайте ADMIN_USERNAME/ADMIN_PASSWORD в .env, чтобы сменить их.\n',
    )
  }
}

function seedSampleData() {
  const tournamentCount = db
    .prepare('SELECT COUNT(*) AS count FROM tournaments')
    .get().count

  if (tournamentCount === 0) {
    const inOneWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()
    const lastWeek = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    const insert = db.prepare(`
      INSERT INTO tournaments (title, format, starts_at, buy_in, description, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insert.run(
      'Weekly NLH Freezeout',
      'NLH',
      inOneWeek,
      2000,
      'Классический фризаут, структура 20 минут на уровень.',
      'upcoming',
    )
    insert.run(
      'PLO Deepstack',
      'PLO',
      inTwoWeeks,
      3000,
      'Глубокие стеки, время подумать над решениями.',
      'upcoming',
    )
    insert.run(
      'Sunday MTT',
      'MTT',
      lastWeek,
      1500,
      'Многостоловый турнир с гарантией.',
      'completed',
    )
  }

  const newsCount = db.prepare('SELECT COUNT(*) AS count FROM news').get().count

  if (newsCount === 0) {
    db.prepare(`
      INSERT INTO news (title, slug, content, published_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(
      'Добро пожаловать в Lockdown Poker',
      'dobro-pozhalovat-v-lockdown-poker',
      'Мы запустили новый сайт клуба.\nСледите за расписанием турниров и новостями здесь.',
    )
  }
}

seedAdmin()
seedSampleData()
