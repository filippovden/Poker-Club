import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar.jsx'
import { getToken, setToken } from '../../api.js'
import TournamentsAdmin from './TournamentsAdmin.jsx'
import NewsAdmin from './NewsAdmin.jsx'
import './admin.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('tournaments')

  useEffect(() => {
    if (!getToken()) navigate('/admin/login', { replace: true })
  }, [navigate])

  function logout() {
    setToken(null)
    navigate('/admin/login', { replace: true })
  }

  return (
    <>
      <Navbar animated={false} />
      <div className="page">
        <div className="page-inner">
          <div className="admin-header">
            <h1 className="page-title">Панель организатора</h1>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Выйти
            </button>
          </div>

          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab ${tab === 'tournaments' ? 'active' : ''}`}
              onClick={() => setTab('tournaments')}
            >
              Турниры
            </button>
            <button
              type="button"
              className={`admin-tab ${tab === 'news' ? 'active' : ''}`}
              onClick={() => setTab('news')}
            >
              Новости
            </button>
          </div>

          {tab === 'tournaments' ? <TournamentsAdmin /> : <NewsAdmin />}
        </div>
      </div>
    </>
  )
}
