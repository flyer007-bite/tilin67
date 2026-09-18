import { Router } from 'express'
import { actualizarUsuario, crearPermiso, crearUsuario, guardarRol, organizacion, permisos, roles, usuarios } from '../controllers/seguridadController'
import { requerirAdministrador } from '../middlewares/auth.middleware'
const router=Router();router.use(requerirAdministrador);router.get('/usuarios',usuarios);router.post('/usuarios',crearUsuario);router.patch('/usuarios/:id',actualizarUsuario);router.get('/roles',roles);router.post('/roles',guardarRol);router.patch('/roles/:id',guardarRol);router.get('/organizacion',organizacion);router.get('/permisos',permisos);router.post('/permisos',crearPermiso);export default router
