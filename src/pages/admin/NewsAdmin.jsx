import { useEffect, useState } from 'react'
import { api } from '../../api.js'

const EMPTY_FORM = { title: '', content: '' }

export default function NewsAdmin() {
  const [news, setNews] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    api.getNews().then(setNews).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  function startEdit(item) {
    setEditingId(item.id)
    setForm({ title: item.title, content: item.content })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (editingId) {
        await api.updateNews(editingId, form)
      } else {
        await api.createNews(form)
      }
      cancelEdit()
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить новость?')) return
    try {
      await api.deleteNews(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-panel">
      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>Заголовок</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>

        <label className="admin-field">
          <span>Текст новости</span>
          <textarea
            rows={6}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        </label>

        {error && <p className="t-status t-status-error">{error}</p>}

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {editingId ? 'Сохранить' : 'Опубликовать'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="admin-list">
        {news?.map((item) => (
          <div key={item.id} className="admin-list-row">
            <div>
              <strong>{item.title}</strong>
              <span className="admin-list-meta">
                {new Date(item.published_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className="admin-list-actions">
              <button type="button" className="btn btn-secondary" onClick={() => startEdit(item)}>
                Изменить
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleDelete(item.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {news?.length === 0 && <p className="t-status">Новостей пока нет.</p>}
      </div>
    </div>
  )
}
