
import { Router } from 'express'

import {
  crearGasto,
  obtenerGastos,
  obtenerUsuariosGasto,
  cambiarEstadoGasto,
  eliminarGasto,
} from '../controllers/gastosController'
import { bloquearConsultor, bloquearOperador, requerirAutenticacion } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

router.get('/', obtenerGastos)
router.get('/usuarios', obtenerUsuariosGasto)

router.post('/', bloquearConsultor, crearGasto)

router.patch('/:id/estado', bloquearOperador, cambiarEstadoGasto)

router.delete('/:id', bloquearOperador, eliminarGasto)

export default router
