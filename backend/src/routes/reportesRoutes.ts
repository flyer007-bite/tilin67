import { Router } from 'express'
import { obtenerDashboard, obtenerReporte } from '../controllers/reportesController'
import { requerirAutenticacion } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

router.get('/dashboard', obtenerDashboard)
router.get('/:tipo', obtenerReporte)

export default router
