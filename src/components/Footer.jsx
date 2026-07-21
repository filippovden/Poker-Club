import { Link } from 'react-router-dom'
import LogoMark from './LogoMark.jsx'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <LogoMark />
          <span>Lockdown Poker</span>
        </div>

        <nav className="site-footer-links">
          <Link to="/tournaments">Турниры</Link>
          <Link to="/news">Новости</Link>
          <Link to="/about">О клубе</Link>
          <a href="mailto:info@lockdownpoker.club">info@lockdownpoker.club</a>
        </nav>

        <div className="site-footer-meta">
          <span>© {year} Lockdown Poker</span>
          <Link to="/admin/login" className="site-footer-admin">
            Панель организатора
          </Link>
        </div>
      </div>
    </footer>
  )
}
