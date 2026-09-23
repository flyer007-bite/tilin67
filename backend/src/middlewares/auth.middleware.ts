import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { RowDataPacket } from 'mysql2'
import { db } from '../config/db'
import { env } from '../config/env'

type TokenPayload = { id: number; rol_id: number; iat?: number; exp?: number }
export type AuthenticatedRequest = Request

const cookie = (req: Request, name: string) => {
  for (const item of (req.headers.cookie || '').split(';')) {
    const [key, ...value] = item.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return ''
}

const permisosDelRol = async (rolId: number) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT LOWER(p.accion) action, LOWER(p.modulo) subject
       FROM rol_permisos rp JOIN permisos p ON p.id=rp.permiso_id
      WHERE rp.rol_id=?`, [rolId],
  )
  return rows.map(row => ({ action: String(row.action), subject: String(row.subject) }))
}

export const requerirAutenticacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = cookie(req, 'caja_chica_session')
  if (!token) {
    res.status(401).json({ message: 'Se requiere autenticación.' })
    return
  }
  let payload: TokenPayload
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload
    if (!Number.isInteger(payload.id) || !Number.isInteger(payload.rol_id)) throw new Error('Token incompleto')
  }
  catch {
    res.status(401).json({ message: 'Sesión inválida o vencida.' })
    return
  }
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id,u.email,u.estado,u.rol_id,u.empresa_id,u.departamento_id,
              r.nombre rol,COALESCE(r.estado,1) rol_estado,r.empresa_id rol_empresa_id,
              r.departamento_id rol_departamento_id,e.estado empresa_estado,
              d.estado departamento_estado,d.empresa_id departamento_empresa_id
         FROM usuarios u JOIN roles r ON r.id=u.rol_id
         LEFT JOIN empresas e ON e.id=u.empresa_id
         LEFT JOIN departamentos d ON d.id=u.departamento_id
        WHERE u.id=? LIMIT 1`, [payload.id],
    )
    const user = rows[0]
    const globalAdmin = user && user.empresa_id == null && user.departamento_id == null
    const organizationValid = globalAdmin || (
      Number(user?.empresa_estado) === 1 && Number(user?.departamento_estado) === 1
      && String(user?.departamento_empresa_id) === String(user?.empresa_id)
      && String(user?.rol_empresa_id) === String(user?.empresa_id)
      && Number(user?.rol_departamento_id) === Number(user?.departamento_id)
    )
    if (!user || Number(user.estado) !== 1 || Number(user.rol_estado) !== 1 || !organizationValid) {
      res.status(401).json({ message: 'La sesión ya no es válida.' })
      return
    }
    req.auth = {
      id: Number(user.id), email: String(user.email), rolId: Number(user.rol_id), rol: String(user.rol),
      empresaId: user.empresa_id == null ? null : String(user.empresa_id),
      departamentoId: user.departamento_id == null ? null : Number(user.departamento_id),
      esAdministradorGlobal: Boolean(globalAdmin), permisos: await permisosDelRol(Number(user.rol_id)),
    }
    next()
  }
  catch (error) {
    console.error('Error revalidando la sesión:', error)
    res.status(503).json({ message: 'El servicio de autenticación no está disponible temporalmente.' })
  }
}

export const usuarioTienePermiso = (req: Request, subject: string, action = 'ver') => {
  if (!req.auth) return false
  if (req.auth.esAdministradorGlobal) return true
  const wantedSubject = subject.toLowerCase()
  const wantedAction = action.toLowerCase()
  return req.auth.permisos.some(rule =>
    (rule.subject === wantedSubject || rule.subject === 'all')
    && (rule.action === wantedAction || rule.action === 'manage'),
  )
}

export const requerirPermiso = (subject: string, action = 'ver') =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: 'Se requiere autenticación.' })
      return
    }
    if (!usuarioTienePermiso(req, subject, action)) {
      res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' })
      return
    }
    next()
  }

export const requerirAlgunoPermisos = (items: Array<{ subject: string; action?: string }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || !items.some(item => usuarioTienePermiso(req, item.subject, item.action))) {
      res.status(req.auth ? 403 : 401).json({ message: req.auth ? 'No tienes permiso para realizar esta acción.' : 'Se requiere autenticación.' })
      return
    }
    next()
  }

export const requerirAdministrador = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.auth?.esAdministradorGlobal) {
    res.status(req.auth ? 403 : 401).json({ message: req.auth ? 'Esta operación requiere un administrador global.' : 'Se requiere autenticación.' })
    return
  }
  next()
}

export const bloquearOperador = requerirPermiso('gastos', 'aprobar')
export const bloquearConsultor = (_req: Request, _res: Response, next: NextFunction) => next()
