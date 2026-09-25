import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import gastosRoutes from './routes/gastosRoutes'
import ingresosRoutes from './routes/ingresosRoutes'
import notificacionesRoutes from './routes/notificacionesRoutes'
import procesosRoutes from './routes/procesosRoutes'
import proveedoresRoutes from './routes/proveedoresRoutes'
import reportesRoutes from './routes/reportesRoutes'
import seguridadRoutes from './routes/seguridadRoutes'
import tiposComprobanteRoutes from './routes/tiposComprobanteRoutes'
import tiposGastoRoutes from './routes/tiposGastoRoutes'
import { db, testDatabaseConnection } from './config/db'
import { env } from './config/env'
import { ensureDatabaseSchema, validateDatabaseSchema } from './config/schema'

const app = express()
if (env.trustProxy) app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  // La cámara se permite únicamente al propio sitio para capturar comprobantes.
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store')
  next()
})
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && !env.corsOrigins.includes(origin)) {
    res.status(403).json({ message: 'Origen no permitido.' })
    return
  }
  next()
})
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api/ready', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    const missing = await validateDatabaseSchema()
    if (missing.length) {
      res.status(503).json({ status: 'not-ready', reason: 'database-schema-outdated', ...(env.nodeEnv === 'production' ? {} : { missing }) })
      return
    }
    res.json({ status: 'ready' })
  }
  catch { res.status(503).json({ status: 'not-ready' }) }
})

app.use('/api/auth', authRoutes)
app.use('/api/gastos', gastosRoutes)
app.use('/api/ingresos', ingresosRoutes)
app.use('/api/notificaciones', notificacionesRoutes)
app.use('/api/procesos', procesosRoutes)
app.use('/api/proveedores', proveedoresRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/seguridad', seguridadRoutes)
app.use('/api/tipos-comprobante', tiposComprobanteRoutes)
app.use('/api/tipos-gasto', tiposGastoRoutes)
app.use('/api', (_req, res) => res.status(404).json({ message: 'Endpoint no encontrado.' }))
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if ((error as { code?: string })?.code === 'LIMIT_FILE_SIZE') { res.status(400).json({ message: 'La factura no puede superar 12 MB.' }); return }
  console.error('Error no controlado en API:', error)
  res.status(500).json({ message: 'Error interno del servidor.' })
})

const start = async () => {
  try {
    await testDatabaseConnection()
    if (env.autoMigrate) await ensureDatabaseSchema()
    const missing = await validateDatabaseSchema()
    if (missing.length) throw new Error(`Esquema incompleto: ${missing.join(', ')}`)
    const server = app.listen(env.port, () => console.log(`API de Caja Chica escuchando en el puerto ${env.port}`))
    let closing = false
    const shutdown = (signal: string) => {
      if (closing) return
      closing = true
      console.log(`${signal}: cerrando API...`)
      const force = setTimeout(() => process.exit(1), 10_000); force.unref()
      server.close(async () => { try { await db.end() } finally { clearTimeout(force); process.exit(0) } })
    }
    process.once('SIGTERM', () => shutdown('SIGTERM'))
    process.once('SIGINT', () => shutdown('SIGINT'))
  }
  catch (error) {
    console.error('No se pudo iniciar la API:', error)
    process.exitCode = 1
  }
}

void start()
