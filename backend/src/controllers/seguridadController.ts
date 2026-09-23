import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type { PoolConnection } from 'mysql2/promise'
import { db } from '../config/db'
import { registrarAuditoria } from '../utils/auditoria'

const fail = (res: Response, error: unknown) => {
  console.error('Error en seguridad:', error)
  const message = error instanceof Error ? error.message : 'No fue posible completar la operación.'
  res.status(message === 'Registro no disponible.' ? 404 : 400).json({ message })
}

const organizacionObjetivo = (req: Request) => {
  if (!req.auth) throw new Error('Sesión inválida.')
  if (!req.auth.esAdministradorGlobal) {
    if (!req.auth.empresaId || !req.auth.departamentoId) throw new Error('La sesión no tiene organización.')
    return { empresaId: req.auth.empresaId, departamentoId: req.auth.departamentoId }
  }
  const empresaId = req.body?.empresa_id ? String(req.body.empresa_id).trim().slice(0, 20) : null
  const departamentoId = req.body?.departamento_id == null ? null : Number(req.body.departamento_id)
  if ((empresaId == null) !== (departamentoId == null)) throw new Error('Empresa y departamento deben indicarse juntos.')
  return { empresaId, departamentoId }
}

const validarOrganizacionYRol = async (connection: PoolConnection, empresaId: string | null, departamentoId: number | null, rolId: number) => {
  if (empresaId != null && departamentoId != null) {
    const [departamentos] = await connection.query<RowDataPacket[]>(
      `SELECT d.id FROM departamentos d JOIN empresas e ON e.id=d.empresa_id
       WHERE d.id=? AND d.empresa_id=? AND d.estado=1 AND e.estado=1 LIMIT 1`,
      [departamentoId, empresaId],
    )
    if (!departamentos.length) throw new Error('La empresa o el departamento no son válidos.')
  }
  const [roles] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM roles WHERE id=? AND estado=1
       AND ((? IS NULL AND empresa_id IS NULL AND departamento_id IS NULL)
         OR (empresa_id=? AND departamento_id=?)) LIMIT 1`,
    [rolId, empresaId, empresaId, departamentoId],
  )
  if (!roles.length) throw new Error('El rol no pertenece a la organización seleccionada.')
}

const scope = (req: Request, alias: string) => req.auth?.esAdministradorGlobal
  ? { sql: '', params: [] as Array<string | number> }
  : { sql: ` AND ${alias}.empresa_id=? AND ${alias}.departamento_id=?`, params: [String(req.auth?.empresaId), Number(req.auth?.departamentoId)] }

export const usuarios = async (req: Request, res: Response) => {
  try {
    const filtro = scope(req, 'u')
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id,u.nombre_completo,u.email,u.rol_id,u.empresa_id,u.departamento_id,u.estado,
              e.nombre empresa,d.nombre departamento,ro.nombre rol
         FROM usuarios u JOIN roles ro ON ro.id=u.rol_id
         LEFT JOIN empresas e ON e.id=u.empresa_id LEFT JOIN departamentos d ON d.id=u.departamento_id
        WHERE 1=1${filtro.sql} ORDER BY u.nombre_completo`, filtro.params,
    )
    res.json(rows)
  } catch (error) { fail(res, error) }
}

export const crearUsuario = async (req: Request, res: Response) => {
  let connection: PoolConnection | undefined
  try {
    const nombre = String(req.body?.nombre_completo || '').trim().slice(0, 150)
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 150)
    const password = String(req.body?.password || '')
    const rolId = Number(req.body?.rol_id)
    if (!nombre || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || password.length > 72 || !Number.isInteger(rolId))
      throw new Error('Completa nombre, correo, contraseña de 12 a 72 caracteres y rol.')
    const { empresaId, departamentoId } = organizacionObjetivo(req)
    connection = await db.getConnection(); await connection.beginTransaction()
    await validarOrganizacionYRol(connection, empresaId, departamentoId, rolId)
    const hash = await bcrypt.hash(password, 12)
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO usuarios (rol_id,empresa_id,departamento_id,nombre_completo,email,password,estado)
       VALUES (?,?,?,?,?,?,1)`, [rolId, empresaId, departamentoId, nombre, email, hash],
    )
    await registrarAuditoria(connection, { usuarioId: req.auth!.id, accion: 'crear', entidad: 'usuarios', entidadId: result.insertId, despues: { nombre, email, rolId, empresaId, departamentoId } })
    await connection.commit(); res.status(201).json({ id: result.insertId })
  } catch (error) { if (connection) await connection.rollback(); fail(res, error) } finally { connection?.release() }
}

export const actualizarUsuario = async (req: Request, res: Response) => {
  let connection: PoolConnection | undefined
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Registro no disponible.')
    connection = await db.getConnection(); await connection.beginTransaction()
    const filtro = scope(req, 'u')
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM usuarios u WHERE u.id=?${filtro.sql} FOR UPDATE`, [id, ...filtro.params])
    const anterior = rows[0]
    if (!anterior) throw new Error('Registro no disponible.')
    const { empresaId, departamentoId } = organizacionObjetivo(req)
    const nombre = String(req.body?.nombre_completo || anterior.nombre_completo).trim().slice(0, 150)
    const email = String(req.body?.email || anterior.email).trim().toLowerCase().slice(0, 150)
    const rolId = Number(req.body?.rol_id || anterior.rol_id)
    if (!nombre || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(rolId)) throw new Error('Nombre, correo o rol inválidos.')
    if (id === req.auth?.id && (rolId !== Number(anterior.rol_id) || empresaId !== anterior.empresa_id || departamentoId !== Number(anterior.departamento_id)))
      throw new Error('No puedes cambiar tu propio rol u organización.')
    await validarOrganizacionYRol(connection, empresaId, departamentoId, rolId)
    const password = req.body?.password == null ? '' : String(req.body.password)
    if (password && (password.length < 12 || password.length > 72)) throw new Error('La contraseña debe tener entre 12 y 72 caracteres.')
    const params: unknown[] = [nombre, email, rolId, empresaId, departamentoId]
    let passwordSql = ''
    if (password) { passwordSql = ',password=?'; params.push(await bcrypt.hash(password, 12)) }
    params.push(id)
    await connection.query(`UPDATE usuarios SET nombre_completo=?,email=?,rol_id=?,empresa_id=?,departamento_id=?${passwordSql},actualizado_en=NOW() WHERE id=?`, params)
    await registrarAuditoria(connection, { usuarioId: req.auth!.id, accion: 'editar', entidad: 'usuarios', entidadId: id, antes: { nombre: anterior.nombre_completo, email: anterior.email, rolId: anterior.rol_id, empresaId: anterior.empresa_id, departamentoId: anterior.departamento_id }, despues: { nombre, email, rolId, empresaId, departamentoId, passwordActualizada: Boolean(password) } })
    await connection.commit(); res.json({ message: 'Usuario actualizado.' })
  } catch (error) { if (connection) await connection.rollback(); fail(res, error) } finally { connection?.release() }
}

export const permisos = async (_req: Request, res: Response) => {
  try { const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM permisos ORDER BY modulo,accion'); res.json(rows) }
  catch (error) { fail(res, error) }
}

export const crearPermiso = async (req: Request, res: Response) => {
  try {
    const modulo = String(req.body?.modulo || '').trim().toLowerCase().slice(0, 60)
    const accion = String(req.body?.accion || '').trim().toLowerCase().slice(0, 60)
    const descripcion = String(req.body?.descripcion || '').trim().slice(0, 255)
    if (!modulo || !accion) throw new Error('Módulo y acción son obligatorios.')
    const [result] = await db.query<ResultSetHeader>('INSERT INTO permisos (modulo,accion,descripcion) VALUES (?,?,?)', [modulo, accion, descripcion])
    res.status(201).json({ id: result.insertId })
  } catch (error) { fail(res, error) }
}

export const roles = async (req: Request, res: Response) => {
  try {
    const filtro = scope(req, 'r')
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT r.*,e.nombre empresa,d.nombre departamento,COALESCE(JSON_ARRAYAGG(rp.permiso_id),JSON_ARRAY()) permiso_ids
         FROM roles r LEFT JOIN empresas e ON e.id=r.empresa_id LEFT JOIN departamentos d ON d.id=r.departamento_id
         LEFT JOIN rol_permisos rp ON rp.rol_id=r.id WHERE 1=1${filtro.sql}
        GROUP BY r.id ORDER BY r.nombre`, filtro.params,
    )
    res.json(rows)
  } catch (error) { fail(res, error) }
}

export const organizacion = async (req: Request, res: Response) => {
  try {
    if (req.auth?.esAdministradorGlobal) {
      const [empresas] = await db.query<RowDataPacket[]>('SELECT id,nombre,estado FROM empresas ORDER BY id')
      const [departamentos] = await db.query<RowDataPacket[]>('SELECT id,empresa_id,nombre,estado FROM departamentos ORDER BY empresa_id,nombre')
      res.json({ empresas, departamentos }); return
    }
    const [empresas] = await db.query<RowDataPacket[]>('SELECT id,nombre,estado FROM empresas WHERE id=?', [req.auth?.empresaId])
    const [departamentos] = await db.query<RowDataPacket[]>('SELECT id,empresa_id,nombre,estado FROM departamentos WHERE id=? AND empresa_id=?', [req.auth?.departamentoId, req.auth?.empresaId])
    res.json({ empresas, departamentos })
  } catch (error) { fail(res, error) }
}

export const guardarRol = async (req: Request, res: Response) => {
  let connection: PoolConnection | undefined
  try {
    const nombre = String(req.body?.nombre || '').trim().slice(0, 100)
    const descripcion = String(req.body?.descripcion || '').trim().slice(0, 255)
    const permisoIds = [...new Set((Array.isArray(req.body?.permiso_ids) ? req.body.permiso_ids : []).map(Number).filter(Number.isInteger))]
    if (!nombre) throw new Error('El nombre es obligatorio.')
    const { empresaId, departamentoId } = organizacionObjetivo(req)
    connection = await db.getConnection(); await connection.beginTransaction()
    if (empresaId != null && departamentoId != null) {
      const [org] = await connection.query<RowDataPacket[]>('SELECT id FROM departamentos WHERE id=? AND empresa_id=? AND estado=1', [departamentoId, empresaId])
      if (!org.length) throw new Error('La organización no es válida.')
    }
    if (permisoIds.length) {
      const [validos] = await connection.query<RowDataPacket[]>('SELECT id FROM permisos WHERE id IN (?)', [permisoIds])
      if (validos.length !== permisoIds.length) throw new Error('Uno o más permisos no son válidos.')
    }
    let id = Number(req.params.id)
    let anterior: RowDataPacket | undefined
    if (id) {
      const filtro = scope(req, 'r')
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM roles r WHERE r.id=?${filtro.sql} FOR UPDATE`, [id, ...filtro.params])
      anterior = rows[0]
      if (!anterior) throw new Error('Registro no disponible.')
      await connection.query('UPDATE roles SET nombre=?,descripcion=?,estado=?,actualizado_en=NOW() WHERE id=?', [nombre, descripcion, req.body?.estado === false ? 0 : 1, id])
    } else {
      const [result] = await connection.query<ResultSetHeader>('INSERT INTO roles (nombre,descripcion,empresa_id,departamento_id,estado,creado_en,actualizado_en) VALUES (?,?,?,?,?,NOW(),NOW())', [nombre, descripcion, empresaId, departamentoId, req.body?.estado === false ? 0 : 1])
      id = result.insertId
    }
    await connection.query('DELETE FROM rol_permisos WHERE rol_id=?', [id])
    for (const permisoId of permisoIds) await connection.query('INSERT INTO rol_permisos (rol_id,permiso_id) VALUES (?,?)', [id, permisoId])
    await registrarAuditoria(connection, { usuarioId: req.auth!.id, accion: anterior ? 'editar' : 'crear', entidad: 'roles', entidadId: id, antes: anterior ? { nombre: anterior.nombre, descripcion: anterior.descripcion, estado: anterior.estado } : null, despues: { nombre, descripcion, empresaId, departamentoId, permisoIds } })
    await connection.commit(); res.json({ id })
  } catch (error) { if (connection) await connection.rollback(); fail(res, error) } finally { connection?.release() }
}
