import { motion } from 'motion/react'
import { Plus, LayoutGrid } from 'lucide-react'
import './Hero.css'

const EASE = [0.16, 1, 0.3, 1]
const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4'

function LogoMark() {
  return (
    <svg
      className="logo-mark"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="10"
        width="20"
        height="8"
        rx="4"
        fill="#000"
        transform="rotate(-35 14 14)"
      />
      <rect
        x="4"
        y="10"
        width="20"
        height="8"
        rx="4"
        fill="#000"
        opacity="0.45"
        transform="rotate(-35 14 14) translate(0 10)"
      />
    </svg>
  )
}

export default function Hero() {
  return (
    <section className="hero">
      <motion.nav
        className="navbar"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="nav-left">
          <div className="brand">
            <LogoMark />
            <span className="brand-name">Lockdown Poker</span>
          </div>

          <button type="button" className="menu-pill">
            <span className="menu-icon">
              <Plus size={12} strokeWidth={3} />
            </span>
            <span className="menu-label">Меню</span>
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
      </motion.nav>

      <motion.div
        className="video-wrapper"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: EASE }}
      >
        <video
          className="hero-video"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />
      </motion.div>

      <motion.div
        className="footer-content"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: EASE }}
      >
        <div className="footer-left">
          <motion.div
            className="subtitle"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
          >
            <span className="dot" />
            <span>Живые турниры каждую неделю</span>
          </motion.div>

          <motion.h1
            className="headline"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
          >
            Турниры без
            <br />
            границ. Каждую неделю.
          </motion.h1>

          <motion.div
            className="buttons"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0, ease: EASE }}
          >
            <button type="button" className="btn btn-primary">
              Турниры
            </button>
            <button type="button" className="btn btn-secondary">
              О клубе
            </button>
          </motion.div>
        </div>

        <div className="footer-right">
          <span className="tag">NLH</span>
          <span className="tag">PLO</span>
          <span className="tag">MTT</span>
        </div>
      </motion.div>
    </section>
  )
}
