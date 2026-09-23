import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { detalle, fondos, guardarArqueo, guardarCierre, guardarLiquidacion, historial, obtenerResumen } from '../controllers/procesosController'
import { requerirAlgunoPermisos, requerirAutenticacion, requerirPermiso, usuarioTienePermiso } from '../middlewares/auth.middleware'

const router = Router()
const verProcesos = requerirAlgunoPermisos([{ subject: 'arqueos' },{ subject: 'cierres' },{ subject: 'liquidaciones' }])
const subjects: Record<string, string> = { arqueo: 'arqueos', cierre: 'cierres', liquidacion: 'liquidaciones' }
const lecturaTipo = (req: Request, res: Response, next: NextFunction) => {
  const subject = subjects[String(req.params.tipo || '').toLowerCase()]
  if (!subject) { res.status(400).json({ message: 'Tipo de proceso no válido.' }); return }
  if (!usuarioTienePermiso(req, subject, 'ver')) { res.status(403).json({ message: 'No tienes permiso para consultar este proceso.' }); return }
  next()
}

router.use(requerirAutenticacion)
router.get('/fondos', verProcesos, fondos)
router.get('/resumen/:id', verProcesos, obtenerResumen)
router.get('/historial/:tipo', lecturaTipo, historial)
router.get('/:tipo/:id', lecturaTipo, detalle)
router.post('/arqueo', requerirPermiso('arqueos', 'crear'), guardarArqueo)
router.post('/cierre', requerirPermiso('cierres', 'crear'), guardarCierre)
router.post('/liquidacion', requerirPermiso('liquidaciones', 'crear'), guardarLiquidacion)
export default router
