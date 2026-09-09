
import { Router } from 'express'

import {
  crearGasto,
  obtenerGastos,
  eliminarGasto,
} from '../controllers/gastosController'

const router = Router()

router.get('/', obtenerGastos)

router.post('/', crearGasto)

router.delete('/:id', eliminarGasto)

export default router

