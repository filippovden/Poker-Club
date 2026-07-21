import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { api } from '../api.js'
import './News.css'

function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function excerpt(content, length = 160) {
  const plain = content.replace(/\s+/g, ' ').trim()
  return plain.length > length ? `${plain.slice(0, length)}…` : plain
}

export default function News() {
  const [news, setNews] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getNews().then(setNews).catch((err) => setError(err.message))
  }, [])

  return (
    <PageLayout>
      <div className="page">
        <div className="page-inner">
          <div className="page-eyebrow">
            <span className="dot" />
            <span>Новости клуба</span>
          </div>
          <h1 className="page-title">Новости</h1>
          <p className="page-lede">
            Анонсы турниров, отчёты о прошедших событиях и новости клуба.
          </p>

          {error && <p className="t-status t-status-error">{error}</p>}
          {!error && !news && <p className="t-status">Загрузка новостей…</p>}
          {news && news.length === 0 && (
            <p className="t-status">Пока нет новостей — загляните позже.</p>
          )}

          <div className="n-list">
            {news?.map((item) => (
              <Link key={item.id} to={`/news/${item.slug}`} className="n-item">
                <span className="n-item-date">
                  {formatDate(item.published_at)}
                </span>
                <h2 className="n-item-title">{item.title}</h2>
                <p className="n-item-excerpt">{excerpt(item.content)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
