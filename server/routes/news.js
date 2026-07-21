import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { slugify } from '../slugify.js'

export const newsRouter = Router()

function uniqueSlug(title, ignoreId = null) {
  const base = slugify(title)
  let slug = base
  let suffix = 2

  while (true) {
    const existing = db
      .prepare('SELECT id FROM news WHERE slug = ?')
      .get(slug)
    if (!existing || existing.id === ignoreId) return slug
    slug = `${base}-${suffix}`
    suffix += 1
  }
}

newsRouter.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM news ORDER BY published_at DESC')
    .all()
  res.json(rows)
})

newsRouter.get('/:slug', (req, res) => {
  const article = db
    .prepare('SELECT * FROM news WHERE slug = ?')
    .get(req.params.slug)

  if (!article) {
    return res.status(404).json({ error: 'Новость не найдена' })
  }

  res.json(article)
})

newsRouter.post('/', requireAuth, (req, res) => {
  const { title, content } = req.body || {}

  if (!title || !content) {
    return res.status(400).json({ error: 'Заголовок и текст обязательны' })
  }

  const slug = uniqueSlug(title)

  const result = db
    .prepare(
      `INSERT INTO news (title, slug, content, published_at)
       VALUES (?, ?, ?, datetime('now'))`,
    )
    .run(title, slug, content)

  const created = db.prepare('SELECT * FROM news WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(created)
})

newsRouter.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id)

  if (!existing) {
    return res.status(404).json({ error: 'Новость не найдена' })
  }

  const { title, content } = req.body || {}
  const nextTitle = title ?? existing.title
  const slug =
    title && title !== existing.title
      ? uniqueSlug(title, existing.id)
      : existing.slug

  db.prepare('UPDATE news SET title = ?, slug = ?, content = ? WHERE id = ?').run(
    nextTitle,
    slug,
    content ?? existing.content,
    req.params.id,
  )

  const updated = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id)
  res.json(updated)
})

newsRouter.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Новость не найдена' })
  }

  res.status(204).end()
})
