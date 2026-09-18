import express from 'express'
import cors from 'cors'
import tiposGastoRoutes from './routes/tiposGastoRoutes'
import proveedoresRoutes from './routes/proveedoresRoutes'
import tiposComprobanteRoutes from './routes/tiposComprobanteRoutes'
import ingresosRoutes from './routes/ingresosRoutes'
import gastosRoutes from './routes/gastosRoutes'
import authRoutes from './routes/auth.routes'
import reportesRoutes from './routes/reportesRoutes'
import notificacionesRoutes from './routes/notificacionesRoutes'
import procesosRoutes from './routes/procesosRoutes'
import seguridadRoutes from './routes/seguridadRoutes'

const app = express()
const PORT = process.env.PORT || 4000
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())

app.use(cors({
  origin(origin, callback) {
    // Las herramientas locales no envían Origin. Los navegadores sí deben
    // provenir del frontend declarado en FRONTEND_ORIGIN.
    return callback(null, !origin || allowedOrigins.includes(origin))
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}))
app.use(express.json())

app.use('/api/tipos-gasto', tiposGastoRoutes)
app.use('/api/proveedores', proveedoresRoutes)
app.use('/api/tipos-comprobante', tiposComprobanteRoutes)
app.use('/api/ingresos', ingresosRoutes)
app.use('/api/gastos', gastosRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/notificaciones', notificacionesRoutes)
app.use('/api/procesos', procesosRoutes)
app.use('/api/seguridad', seguridadRoutes)

// ÚNICA llamada a listen en todo el proyecto
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`)
})
