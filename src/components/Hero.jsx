import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import { EASE } from '../lib/motion.js'
import './Hero.css'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4'

export default function Hero() {
  return (
    <section className="hero">
      <Navbar />

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
            <Link to="/tournaments" className="btn btn-primary">
              Турниры
            </Link>
            <Link to="/about" className="btn btn-secondary">
              О клубе
            </Link>
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
