
import { Router } from 'express'

import {
  crearIngreso,
  obtenerIngresos,
  eliminarIngreso,
} from '../controllers/ingresosController'
import { bloquearConsultor, bloquearOperador, requerirAutenticacion } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

// Obtener todos los ingresos
router.get('/', obtenerIngresos)

// Crear un ingreso
router.post('/', bloquearConsultor, crearIngreso)

// Eliminar un ingreso
router.delete('/:id', bloquearOperador, eliminarIngreso)

export default router
