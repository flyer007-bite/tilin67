import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Response } from 'express'
import multer from 'multer'
import type { RowDataPacket } from 'mysql2'
import { db } from '../config/db'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware'

const documentosDir = path.resolve(process.cwd(), 'uploads', 'facturas')
fs.mkdirSync(documentosDir, { recursive: true })
const extensiones: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'image/heif': '.heif' }

export const cargarDocumento = multer({
  storage: multer.diskStorage({ destination: documentosDir, filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${extensiones[file.mimetype] || ''}`) }),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(extensiones[file.mimetype])),
}).single('factura')

export const guardarDocumentoGasto = (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: 'Selecciona una imagen válida de hasta 12 MB.' }); return }
  res.status(201).json({ url: `/api/gastos/documentos/${req.file.filename}` })
}

export const obtenerDocumentoGasto = async (req: AuthenticatedRequest, res: Response) => {
  const nombre = path.basename(String(req.params.nombre || ''))
  if (!/^[a-f0-9-]+\.(jpg|png|webp|heic|heif)$/i.test(nombre)) { res.status(404).json({ message: 'Documento no encontrado.' }); return }
  const url = `/api/gastos/documentos/${nombre}`
  const scope = req.auth?.esAdministradorGlobal ? '' : ' AND f.empresa_id=? AND f.departamento_id=?'
  const params = req.auth?.esAdministradorGlobal ? [url] : [url, req.auth?.empresaId, req.auth?.departamentoId]
  const [rows] = await db.query<RowDataPacket[]>(`SELECT g.id FROM gastos g JOIN fondos_caja f ON f.id=g.fondo_id WHERE g.documento_url=?${scope} LIMIT 1`, params)
  if (!rows.length) { res.status(404).json({ message: 'Documento no encontrado.' }); return }
  res.sendFile(path.join(documentosDir, nombre), error => { if (error && !res.headersSent) res.status(404).json({ message: 'Documento no encontrado.' }) })
}

export const obtenerAuditoriaGasto = async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ message: 'Gasto inválido.' }); return }
  const scope = req.auth?.esAdministradorGlobal ? '' : ' AND f.empresa_id=? AND f.departamento_id=?'
  const params = req.auth?.esAdministradorGlobal ? [id] : [id, req.auth?.empresaId, req.auth?.departamentoId]
  const [access] = await db.query<RowDataPacket[]>(`SELECT g.id FROM gastos g JOIN fondos_caja f ON f.id=g.fondo_id WHERE g.id=?${scope} LIMIT 1`, params)
  if (!access.length) { res.status(404).json({ message: 'Gasto no encontrado.' }); return }
  const [rows] = await db.query<RowDataPacket[]>(`SELECT a.id,a.accion,a.creado_en,u.nombre_completo usuario FROM auditoria_eventos a LEFT JOIN usuarios u ON u.id=a.usuario_id WHERE a.entidad='gasto' AND a.entidad_id=? ORDER BY a.creado_en DESC,a.id DESC`, [id])
  res.json(rows)
}
