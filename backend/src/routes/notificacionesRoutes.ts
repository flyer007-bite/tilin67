import { Router } from 'express'
import { obtenerNotificaciones } from '../controllers/notificacionesController'
import { requerirAutenticacion, requerirPermiso } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)
router.get('/', requerirPermiso('notificaciones', 'ver'), obtenerNotificaciones)

export default router
