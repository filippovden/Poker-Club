import { useEffect, useState } from 'react'
import { api } from '../../api.js'

const EMPTY_FORM = {
  title: '',
  format: 'NLH',
  starts_at: '',
  buy_in: '',
  description: '',
  status: 'upcoming',
}

export default function TournamentsAdmin() {
  const [tournaments, setTournaments] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    api.getTournaments().then(setTournaments).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  function startEdit(t) {
    setEditingId(t.id)
    setForm({
      title: t.title,
      format: t.format,
      starts_at: t.starts_at.slice(0, 16),
      buy_in: t.buy_in ?? '',
      description: t.description ?? '',
      status: t.status,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = {
      ...form,
      buy_in: form.buy_in === '' ? null : Number(form.buy_in),
      starts_at: new Date(form.starts_at).toISOString(),
    }
    try {
      if (editingId) {
        await api.updateTournament(editingId, payload)
      } else {
        await api.createTournament(payload)
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
    if (!confirm('Удалить турнир?')) return
    try {
      await api.deleteTournament(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-panel">
      <form className="admin-form admin-form-grid" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>Название</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>

        <label className="admin-field">
          <span>Формат</span>
          <select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
          >
            <option value="NLH">NLH</option>
            <option value="PLO">PLO</option>
            <option value="MTT">MTT</option>
          </select>
        </label>

        <label className="admin-field">
          <span>Дата и время</span>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            required
          />
        </label>

        <label className="admin-field">
          <span>Бай-ин (₽, пусто = фриролл)</span>
          <input
            type="number"
            min="0"
            value={form.buy_in}
            onChange={(e) => setForm({ ...form, buy_in: e.target.value })}
          />
        </label>

        <label className="admin-field">
          <span>Статус</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="upcoming">Предстоящий</option>
            <option value="completed">Завершён</option>
          </select>
        </label>

        <label className="admin-field admin-field-wide">
          <span>Описание</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        {error && <p className="t-status t-status-error admin-field-wide">{error}</p>}

        <div className="admin-form-actions admin-field-wide">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {editingId ? 'Сохранить' : 'Добавить турнир'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="admin-list">
        {tournaments?.map((t) => (
          <div key={t.id} className="admin-list-row">
            <div>
              <strong>{t.title}</strong>
              <span className="admin-list-meta">
                {t.format} · {new Date(t.starts_at).toLocaleString('ru-RU')} ·{' '}
                {t.status === 'upcoming' ? 'Предстоящий' : 'Завершён'}
              </span>
            </div>
            <div className="admin-list-actions">
              <button type="button" className="btn btn-secondary" onClick={() => startEdit(t)}>
                Изменить
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleDelete(t.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {tournaments?.length === 0 && <p className="t-status">Турниров пока нет.</p>}
      </div>
    </div>
  )
}
