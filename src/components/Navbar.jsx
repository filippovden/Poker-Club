import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, LayoutGrid, X } from 'lucide-react'
import LogoMark from './LogoMark.jsx'
import { EASE } from '../lib/motion.js'
import './Navbar.css'

const LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/tournaments', label: 'Турниры' },
  { to: '/news', label: 'Новости' },
  { to: '/about', label: 'О клубе' },
]

export default function Navbar({ animated = true }) {
  const [open, setOpen] = useState(false)

  const Wrapper = animated ? motion.nav : 'nav'
  const wrapperProps = animated
    ? {
        initial: { y: -16, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.8, ease: EASE },
      }
    : {}

  return (
    <Wrapper className="navbar" {...wrapperProps}>
      <div className="nav-left">
        <NavLink to="/" className="brand">
          <LogoMark />
          <span className="brand-name">Lockdown Poker</span>
        </NavLink>

        <button
          type="button"
          className="menu-pill"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="menu-icon">
            {open ? (
              <X size={12} strokeWidth={3} />
            ) : (
              <Plus size={12} strokeWidth={3} />
            )}
          </span>
          <span className="menu-label">{open ? 'Закрыть' : 'Меню'}</span>
        </button>

        <div className="tags-pill">
          <span>Texas Hold'em</span>
          <span>Live-турниры</span>
        </div>
      </div>

      <div className="nav-right">
        <div className="tags-pill">
          <span className="grid-icon">
            <LayoutGrid size={14} strokeWidth={2} color="#fff" />
          </span>
          <span>Честная игра</span>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="menu-dropdown"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className="menu-dropdown-link"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Wrapper>
  )
}
