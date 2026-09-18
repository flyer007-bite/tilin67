import { Router } from 'express'
import { detalle, fondos, guardarArqueo, guardarCierre, guardarLiquidacion, historial, obtenerResumen } from '../controllers/procesosController'
import { bloquearConsultor, requerirAutenticacion } from '../middlewares/auth.middleware'
const router = Router()
router.use(requerirAutenticacion)
router.get('/fondos', fondos)
router.get('/resumen/:id', obtenerResumen)
router.get('/historial/:tipo', historial)
router.get('/:tipo/:id', detalle)
router.post('/arqueo', bloquearConsultor, guardarArqueo)
router.post('/cierre', bloquearConsultor, guardarCierre)
router.post('/liquidacion', bloquearConsultor, guardarLiquidacion)
export default router
