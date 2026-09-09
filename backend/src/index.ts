import express from 'express'
import cors from 'cors'
import tiposGastoRoutes from './routes/tiposGastoRoutes'
import proveedoresRoutes from './routes/proveedoresRoutes'
import tiposComprobanteRoutes from './routes/tiposComprobanteRoutes'
import ingresosRoutes from './routes/ingresosRoutes'
import gastosRoutes from './routes/gastosRoutes'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.use('/api/tipos-gasto', tiposGastoRoutes)
app.use('/api/proveedores', proveedoresRoutes)
app.use('/api/tipos-comprobante', tiposComprobanteRoutes)
app.use('/api/ingresos', ingresosRoutes)
app.use('/api/gastos', gastosRoutes)

// ÚNICA llamada a listen en todo el proyecto
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`)
})
