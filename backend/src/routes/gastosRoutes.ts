
import { Router } from 'express'

import {
  crearGasto,
  obtenerGastos,
  obtenerUsuariosGasto,
  obtenerCatalogosGasto,
  cambiarEstadoGasto,
  eliminarGasto,
} from '../controllers/gastosController'
import { requerirAutenticacion, requerirPermiso } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

router.get('/', requerirPermiso('gastos', 'ver'), obtenerGastos)
router.get('/catalogos', requerirPermiso('gastos', 'ver'), obtenerCatalogosGasto)
router.get('/usuarios', requerirPermiso('gastos', 'ver'), obtenerUsuariosGasto)

router.post('/', requerirPermiso('gastos', 'crear'), crearGasto)

router.patch('/:id/estado', requerirPermiso('gastos', 'aprobar'), cambiarEstadoGasto)

router.delete('/:id', requerirPermiso('gastos', 'eliminar'), eliminarGasto)

export default router
