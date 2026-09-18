import { Router } from 'express'
import { obtenerNotificaciones } from '../controllers/notificacionesController'
import { requerirAutenticacion } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)
router.get('/', obtenerNotificaciones)

export default router
