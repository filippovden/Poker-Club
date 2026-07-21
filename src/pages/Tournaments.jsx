import { useEffect, useState } from 'react'
import PageLayout from '../components/PageLayout.jsx'
import { api } from '../api.js'
import './Tournaments.css'

const FORMAT_LABELS = {
  NLH: "No-Limit Hold'em",
  PLO: 'Pot-Limit Omaha',
  MTT: 'Многостоловый турнир',
}

function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TournamentCard({ tournament }) {
  return (
    <div className="t-card">
      <div className="t-card-top">
        <span className="tag">{tournament.format}</span>
        <span className="t-card-date">{formatDate(tournament.starts_at)}</span>
      </div>
      <h3 className="t-card-title">{tournament.title}</h3>
      {tournament.description && (
        <p className="t-card-desc">{tournament.description}</p>
      )}
      <div className="t-card-bottom">
        <span className="t-card-buyin">
          Бай-ин: {tournament.buy_in ? `${tournament.buy_in} ₽` : 'Freeroll'}
        </span>
        <span className="t-card-format-label">
          {FORMAT_LABELS[tournament.format] || tournament.format}
        </span>
      </div>
    </div>
  )
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .getTournaments()
      .then(setTournaments)
      .catch((err) => setError(err.message))
  }, [])

  const upcoming = tournaments?.filter((t) => t.status === 'upcoming') ?? []
  const past = tournaments?.filter((t) => t.status === 'completed') ?? []

  return (
    <PageLayout>
      <div className="page">
        <div className="page-inner">
          <div className="page-eyebrow">
            <span className="dot" />
            <span>Расписание</span>
          </div>
          <h1 className="page-title">Турниры</h1>
          <p className="page-lede">
            Живые турниры по No-Limit Hold'em и Pot-Limit Omaha каждую
            неделю. Следите за расписанием и записывайтесь заранее.
          </p>

          {error && <p className="t-status t-status-error">{error}</p>}
          {!error && !tournaments && (
            <p className="t-status">Загрузка турниров…</p>
          )}

          {tournaments && (
            <>
              <section className="t-section">
                <h2 className="t-section-title">Ближайшие турниры</h2>
                {upcoming.length === 0 ? (
                  <p className="t-status">
                    Новые турниры скоро появятся — следите за обновлениями.
                  </p>
                ) : (
                  <div className="t-grid">
                    {upcoming.map((t) => (
                      <TournamentCard key={t.id} tournament={t} />
                    ))}
                  </div>
                )}
              </section>

              {past.length > 0 && (
                <section className="t-section">
                  <h2 className="t-section-title">Прошедшие турниры</h2>
                  <div className="t-grid t-grid-past">
                    {past.map((t) => (
                      <TournamentCard key={t.id} tournament={t} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
