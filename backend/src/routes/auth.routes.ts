import { Router } from 'express'
import { googleLogin, login, logout, me, organizacionLogin } from '../controllers/auth.controller'
import { requerirAutenticacion } from '../middlewares/auth.middleware'

const router = Router()
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 12

const rateLimitLogin = (req: any, res: any, next: any) => {
  const now = Date.now()
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key)
  const key = String(req.ip || req.socket?.remoteAddress || 'unknown')
  const current = attempts.get(key)
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
    res.status(429).json({ message: 'Demasiados intentos. Intenta de nuevo más tarde.' })
    return
  }
  res.once('finish', () => {
    if (res.statusCode < 400) { attempts.delete(key); return }
    if (![400, 401, 403].includes(res.statusCode)) return
    const previous = attempts.get(key)
    attempts.set(key, !previous || previous.resetAt <= Date.now()
      ? { count: 1, resetAt: Date.now() + WINDOW_MS }
      : { ...previous, count: previous.count + 1 })
  })
  next()
}

router.get('/organizacion', organizacionLogin)
router.post('/login', rateLimitLogin, login)
router.post('/google', rateLimitLogin, googleLogin)
router.get('/me', requerirAutenticacion, me)
router.post('/logout', logout)

export default router
