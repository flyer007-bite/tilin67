import type { PoolConnection } from 'mysql2/promise'

type AuditInput = { usuarioId: number; accion: string; entidad: string; entidadId?: number | null; fondoId?: number | null; antes?: unknown; despues?: unknown }

export const registrarAuditoria = async (connection: PoolConnection, input: AuditInput) => {
  await connection.query(
    `INSERT INTO auditoria_eventos (usuario_id,accion,entidad,entidad_id,fondo_id,antes_json,despues_json,creado_en)
     VALUES (?,?,?,?,?,?,?,NOW())`,
    [input.usuarioId,input.accion.slice(0,60),input.entidad.slice(0,60),input.entidadId ?? null,input.fondoId ?? null,
      input.antes == null ? null : JSON.stringify(input.antes),input.despues == null ? null : JSON.stringify(input.despues)],
  )
}
