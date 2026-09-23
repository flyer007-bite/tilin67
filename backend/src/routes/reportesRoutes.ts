import { Router } from 'express'
import { obtenerDashboard, obtenerReporte } from '../controllers/reportesController'
import { requerirAutenticacion, requerirPermiso } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

router.get('/dashboard', requerirPermiso('dashboard', 'ver'), obtenerDashboard)
router.get('/:tipo', requerirPermiso('reportes', 'ver'), obtenerReporte)

export default router
