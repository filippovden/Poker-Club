import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

export default function NewsDetail() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setArticle(null)
    setError(null)
    api
      .getNewsArticle(slug)
      .then(setArticle)
      .catch((err) => setError(err.message))
  }, [slug])

  return (
    <PageLayout>
      <div className="page">
        <div className="page-inner n-article">
          <Link to="/news" className="n-back">
            ← Все новости
          </Link>

          {error && <p className="t-status t-status-error">{error}</p>}
          {!error && !article && <p className="t-status">Загрузка…</p>}

          {article && (
            <>
              <span className="n-article-date">
                {formatDate(article.published_at)}
              </span>
              <h1 className="page-title">{article.title}</h1>
              <div className="n-article-body">
                {article.content
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
