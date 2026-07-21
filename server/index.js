import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import './db.js'
import { authRouter } from './routes/auth.js'
import { tournamentsRouter } from './routes/tournaments.js'
import { newsRouter } from './routes/news.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/news', newsRouter)

app.get('/api/health', (req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
