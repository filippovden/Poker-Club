import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

export const tournamentsRouter = Router()

tournamentsRouter.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM tournaments ORDER BY starts_at ASC')
    .all()
  res.json(rows)
})

tournamentsRouter.post('/', requireAuth, (req, res) => {
  const { title, format, starts_at, buy_in, description, status } =
    req.body || {}

  if (!title || !format || !starts_at) {
    return res
      .status(400)
      .json({ error: 'Название, формат и дата обязательны' })
  }

  const result = db
    .prepare(
      `INSERT INTO tournaments (title, format, starts_at, buy_in, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      format,
      starts_at,
      buy_in ?? null,
      description ?? null,
      status || 'upcoming',
    )

  const created = db
    .prepare('SELECT * FROM tournaments WHERE id = ?')
    .get(result.lastInsertRowid)

  res.status(201).json(created)
})

tournamentsRouter.put('/:id', requireAuth, (req, res) => {
  const existing = db
    .prepare('SELECT * FROM tournaments WHERE id = ?')
    .get(req.params.id)

  if (!existing) {
    return res.status(404).json({ error: 'Турнир не найден' })
  }

  const { title, format, starts_at, buy_in, description, status } =
    req.body || {}

  db.prepare(
    `UPDATE tournaments
     SET title = ?, format = ?, starts_at = ?, buy_in = ?, description = ?, status = ?
     WHERE id = ?`,
  ).run(
    title ?? existing.title,
    format ?? existing.format,
    starts_at ?? existing.starts_at,
    buy_in ?? null,
    description ?? existing.description,
    status ?? existing.status,
    req.params.id,
  )

  const updated = db
    .prepare('SELECT * FROM tournaments WHERE id = ?')
    .get(req.params.id)

  res.json(updated)
})

tournamentsRouter.delete('/:id', requireAuth, (req, res) => {
  const result = db
    .prepare('DELETE FROM tournaments WHERE id = ?')
    .run(req.params.id)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Турнир не найден' })
  }

  res.status(204).end()
})
