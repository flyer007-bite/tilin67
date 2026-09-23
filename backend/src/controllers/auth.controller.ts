import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { RowDataPacket } from 'mysql2'
import { db } from '../config/db'
import { env } from '../config/env'

const SESSION_MS = 8 * 60 * 60 * 1000
const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: env.cookieSecure, path: '/' })
const emailNormalizado = (value: unknown) => String(value || '').trim().toLowerCase().slice(0, 150)

const cargarUsuario = async (email: string, empresaId: string, departamentoId: number) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.id,u.nombre_completo,u.email,u.password,u.estado,u.rol_id,u.empresa_id,u.departamento_id,
            r.nombre rol,COALESCE(r.estado,1) rol_estado,e.nombre empresa,e.estado empresa_estado,
            d.nombre departamento,d.estado departamento_estado,d.empresa_id departamento_empresa_id
       FROM usuarios u JOIN roles r ON r.id=u.rol_id
       JOIN empresas e ON e.id=u.empresa_id
       JOIN departamentos d ON d.id=u.departamento_id
      WHERE LOWER(u.email)=? AND u.empresa_id=? AND u.departamento_id=? LIMIT 1`,
    [email, empresaId, departamentoId],
  )
  return rows[0]
}

const cargarPermisos = async (rolId: number) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT LOWER(p.modulo) subject,LOWER(p.accion) action
       FROM rol_permisos rp JOIN permisos p ON p.id=rp.permiso_id WHERE rp.rol_id=?`, [rolId],
  )
  return rows.map(row => ({ action: String(row.action), subject: String(row.subject) }))
}

const sesion = async (res: Response, user: RowDataPacket, rememberMe: boolean) => {
  const rules = await cargarPermisos(Number(user.rol_id))
  const token = jwt.sign({ id: Number(user.id), rol_id: Number(user.rol_id) }, env.jwtSecret, { expiresIn: '8h' })
  res.cookie('caja_chica_session', token, { ...cookieOptions(), ...(rememberMe ? { maxAge: SESSION_MS } : {}) })
  await db.query('UPDATE usuarios SET ultimo_acceso=NOW() WHERE id=?', [user.id])
  const userData = {
    id: Number(user.id), fullName: String(user.nombre_completo), username: String(user.email).split('@')[0],
    email: String(user.email), role: String(user.rol).toLowerCase(), empresaId: String(user.empresa_id),
    empresa: String(user.empresa), departamentoId: Number(user.departamento_id),
    departamento: String(user.departamento), abilityRules: rules,
  }
  return { userData, userAbilityRules: rules }
}

const organizacionSolicitada = (body: any) => ({
  empresaId: String(body?.empresa_id || '').trim().slice(0, 20),
  departamentoId: Number(body?.departamento_id),
})

const usuarioActivoEnOrganizacion = (user: RowDataPacket | undefined) => Boolean(user
  && Number(user.estado) === 1 && Number(user.rol_estado) === 1
  && Number(user.empresa_estado) === 1 && Number(user.departamento_estado) === 1
  && String(user.departamento_empresa_id) === String(user.empresa_id))

export const login = async (req: Request, res: Response): Promise<void> => {
  const email = emailNormalizado(req.body?.email)
  const password = String(req.body?.password || '')
  const { empresaId, departamentoId } = organizacionSolicitada(req.body)
  if (!email || !password || password.length > 72 || !empresaId || !Number.isInteger(departamentoId)) {
    res.status(400).json({ message: 'Selecciona empresa, departamento, correo y contraseña.' })
    return
  }
  try {
    const user = await cargarUsuario(email, empresaId, departamentoId)
    if (!usuarioActivoEnOrganizacion(user) || !await bcrypt.compare(password, String(user.password || ''))) {
      res.status(401).json({ message: 'Credenciales inválidas.' })
      return
    }
    res.json(await sesion(res, user, req.body?.rememberMe === true))
  }
  catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ message: 'No fue posible iniciar sesión.' })
  }
}

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const credential = String(req.body?.credential || '')
  const { empresaId, departamentoId } = organizacionSolicitada(req.body)
  if (!env.googleClientId) {
    res.status(503).json({ message: 'El inicio de sesión con Google no está habilitado.' })
    return
  }
  if (!credential || credential.length > 5000 || !empresaId || !Number.isInteger(departamentoId)) {
    res.status(400).json({ message: 'Selecciona una organización y una cuenta de Google válida.' })
    return
  }
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('Google rechazó la credencial')
    const profile = await response.json() as Record<string, string>
    const valid = profile.aud === env.googleClientId && profile.email_verified === 'true'
      && ['accounts.google.com', 'https://accounts.google.com'].includes(profile.iss)
      && Number(profile.exp || 0) > Math.floor(Date.now() / 1000)
    const user = valid ? await cargarUsuario(emailNormalizado(profile.email), empresaId, departamentoId) : undefined
    if (!valid || !usuarioActivoEnOrganizacion(user)) {
      res.status(401).json({ message: 'Credenciales inválidas.' })
      return
    }
    res.json(await sesion(res, user!, req.body?.rememberMe === true))
  }
  catch (error) {
    console.error('Error validando Google Sign-In:', error)
    res.status(502).json({ message: 'No fue posible validar Google en este momento.' })
  }
}

export const organizacionLogin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [empresas] = await db.query<RowDataPacket[]>('SELECT id,nombre FROM empresas WHERE estado=1 ORDER BY nombre')
    const [departamentos] = await db.query<RowDataPacket[]>('SELECT id,empresa_id,nombre FROM departamentos WHERE estado=1 AND empresa_id IN (SELECT id FROM empresas WHERE estado=1) ORDER BY empresa_id,nombre')
    res.json({ empresas, departamentos })
  }
  catch {
    res.status(503).json({ message: 'No se pudo cargar la organización.' })
  }
}

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) { res.status(401).json({ message: 'Se requiere autenticación.' }); return }
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id,u.nombre_completo,u.email,u.empresa_id,u.departamento_id,r.nombre rol,
              e.nombre empresa,d.nombre departamento
         FROM usuarios u JOIN roles r ON r.id=u.rol_id
         LEFT JOIN empresas e ON e.id=u.empresa_id LEFT JOIN departamentos d ON d.id=u.departamento_id
        WHERE u.id=? LIMIT 1`, [req.auth.id],
    )
    const user = rows[0]
    if (!user) { res.status(401).json({ message: 'La sesión ya no es válida.' }); return }
    const rules = req.auth.permisos
    res.json({
      userData: { id: Number(user.id), fullName: String(user.nombre_completo), username: String(user.email).split('@')[0],
        email: String(user.email), role: String(user.rol).toLowerCase(), empresaId: user.empresa_id,
        empresa: user.empresa, departamentoId: user.departamento_id, departamento: user.departamento, abilityRules: rules },
      userAbilityRules: rules,
    })
  }
  catch (error) {
    console.error('Error consultando la sesión:', error)
    res.status(503).json({ message: 'No fue posible consultar la sesión.' })
  }
}

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie('caja_chica_session', cookieOptions())
  res.status(204).end()
}
