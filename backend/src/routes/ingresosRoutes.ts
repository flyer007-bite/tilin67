
import { Router } from 'express'

import {
  crearIngreso,
  obtenerIngresos,
  eliminarIngreso,
} from '../controllers/ingresosController'

const router = Router()

// Obtener todos los ingresos
router.get('/', obtenerIngresos)

// Crear un ingreso
router.post('/', crearIngreso)

// Eliminar un ingreso
router.delete('/:id', eliminarIngreso)

export default router
