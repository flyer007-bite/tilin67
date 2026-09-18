import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export type TokenPayload = {
  id: number
  rol: string
  rol_id?: number
  empresa_id?: string
  departamento_id?: number
}
export type AuthenticatedRequest = Request & { user?: TokenPayload }

const nombreRol = (rol: unknown) => String(rol || '').trim().toLowerCase()
export const esAdministrador = (rol: unknown) => {
  const nombre = nombreRol(rol)
  return ['admin', 'administrador'].includes(nombre) || nombre.endsWith(' - administrador')
}
export const esOperador = (rol: unknown) => {
  const nombre = nombreRol(rol)
  return nombre === 'operador caja chica' || nombre.endsWith(' - usuario')
}
export const esConsultor = (rol: unknown) => nombreRol(rol).endsWith(' - consultor')

export const requerirAutenticacion = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ message: 'Se requiere iniciar sesión.' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload
    if (!Number.isInteger(payload.id) || !payload.rol) throw new Error('Token inválido')
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Sesión inválida o vencida.' })
  }
}

// Impide que el rol limitado ejecute acciones de eliminación o aprobación.
export const bloquearOperador = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  requerirAutenticacion(req, res, () => {
    if (esOperador(req.user?.rol)) {
      res.status(403).json({ message: 'Tu usuario solo puede registrar y consultar datos.' })
      return
    }
    next()
  })
}

// Los consultores pueden consultar información, pero no crear, modificar ni eliminar.
export const bloquearConsultor = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  requerirAutenticacion(req, res, () => {
    if (esConsultor(req.user?.rol)) {
      res.status(403).json({ message: 'El rol Consultor solo tiene acceso de consulta.' })
      return
    }
    next()
  })
}

export const requerirAdministrador = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ message: 'Se requiere autenticación.' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload
    if (!esAdministrador(payload.rol)) {
      res.status(403).json({ message: 'Solo el administrador puede eliminar este catálogo.' })
      return
    }
    next()
  } catch {
    res.status(401).json({ message: 'Sesión inválida o vencida.' })
  }
}
