
import { Router } from 'express'

import {
  crearIngreso,
  obtenerIngresos,
  eliminarIngreso,
  obtenerFondosActivos,
} from '../controllers/ingresosController'
import { requerirAutenticacion, requerirPermiso } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

// Obtener todos los ingresos
router.get('/', requerirPermiso('ingresos', 'ver'), obtenerIngresos)
router.get('/fondos-activos', requerirPermiso('ingresos', 'ver'), obtenerFondosActivos)

// Crear un ingreso
router.post('/', requerirPermiso('ingresos', 'crear'), crearIngreso)

// Eliminar un ingreso
router.delete('/:id', requerirPermiso('ingresos', 'eliminar'), eliminarIngreso)

export default router
