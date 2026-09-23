import type { RowDataPacket } from 'mysql2'
import { db } from './db'

const tableExists = async (table: string) => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=? LIMIT 1', [table])
  return rows.length > 0
}

const columnExists = async (table: string, column: string) => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=? LIMIT 1', [table, column])
  return rows.length > 0
}

const indexExists = async (table: string, index: string) => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', [table, index])
  return rows.length > 0
}

const quote = (value: string) => {
  if (!/^[a-z0-9_]+$/i.test(value)) throw new Error('Identificador SQL inválido.')
  return `\`${value}\``
}

const ensureColumn = async (table: string, column: string, definition: string) => {
  if (!await columnExists(table, column))
    await db.query(`ALTER TABLE ${quote(table)} ADD COLUMN ${quote(column)} ${definition}`)
}

const ensureIndex = async (table: string, name: string, columns: string[], unique = false) => {
  if (await indexExists(table, name)) return
  try {
    await db.query(`ALTER TABLE ${quote(table)} ADD ${unique ? 'UNIQUE ' : ''}INDEX ${quote(name)} (${columns.map(quote).join(',')})`)
  }
  catch (error: any) {
    if (!(unique && error?.code === 'ER_DUP_ENTRY')) throw error
    console.warn(`No se creó ${name}: existen duplicados históricos que deben auditarse.`)
  }
}

export const ensureDatabaseSchema = async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS auditoria_eventos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,usuario_id INT NOT NULL,accion VARCHAR(60) NOT NULL,
    entidad VARCHAR(60) NOT NULL,entidad_id INT NULL,fondo_id INT NULL,antes_json JSON NULL,
    despues_json JSON NULL,creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auditoria_entidad(entidad,entidad_id),INDEX idx_auditoria_usuario_fecha(usuario_id,creado_en)
  ) ENGINE=InnoDB`)
  await ensureColumn('usuarios', 'empresa_id', 'VARCHAR(20) NULL AFTER rol_id')
  await ensureColumn('usuarios', 'departamento_id', 'INT NULL AFTER empresa_id')
  // La migración histórica 003 redujo esta tabla. Restauramos los campos
  // necesarios de forma aditiva para no perder ninguna cuenta existente.
  await ensureColumn('usuarios', 'dpi', 'VARCHAR(30) NULL AFTER email')
  await ensureColumn('usuarios', 'telefono', 'VARCHAR(30) NULL AFTER dpi')
  await ensureColumn('usuarios', 'estado', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER telefono')
  await ensureColumn('usuarios', 'ultimo_acceso', 'DATETIME NULL AFTER estado')
  await ensureColumn('usuarios', 'creado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER ultimo_acceso')
  await ensureColumn('usuarios', 'actualizado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en')
  await ensureColumn('roles', 'empresa_id', 'VARCHAR(20) NULL AFTER descripcion')
  await ensureColumn('roles', 'departamento_id', 'INT NULL AFTER empresa_id')
  await ensureColumn('fondos_caja', 'empresa_id', 'VARCHAR(20) NULL AFTER id')
  await ensureColumn('fondos_caja', 'departamento_id', 'INT NULL AFTER empresa_id')
  await ensureColumn('gastos', 'persona_realizo_gasto_nombre', 'VARCHAR(150) NULL')
  await ensureIndex('usuarios', 'uq_usuarios_email', ['email'], true)
  await ensureIndex('usuarios', 'idx_usuarios_organizacion', ['empresa_id', 'departamento_id'])
  await ensureIndex('roles', 'idx_roles_organizacion', ['empresa_id', 'departamento_id'])
  await ensureIndex('fondos_caja', 'idx_fondos_organizacion', ['empresa_id', 'departamento_id'])
  await ensureIndex('movimientos_caja', 'uq_movimientos_referencia', ['referencia_tipo', 'referencia_id'], true)

  // Tipos de comprobante es un catálogo independiente. Las instalaciones
  // anteriores reutilizaban accidentalmente los permisos de tipos de gasto.
  for (const accion of ['ver', 'crear', 'editar', 'eliminar']) {
    await db.query(
      `INSERT INTO permisos (modulo,accion,descripcion)
       SELECT 'tipos_comprobante', ?, CONCAT(UPPER(LEFT(?,1)),SUBSTRING(?,2),' tipos de comprobante')
       WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE modulo='tipos_comprobante' AND accion=?)`,
      [accion, accion, accion, accion],
    )
  }
  await db.query(
    `INSERT IGNORE INTO rol_permisos (rol_id,permiso_id)
     SELECT rp.rol_id,nuevo.id FROM rol_permisos rp
       JOIN permisos anterior ON anterior.id=rp.permiso_id AND anterior.modulo='tipos_gasto'
       JOIN permisos nuevo ON nuevo.modulo='tipos_comprobante' AND nuevo.accion=anterior.accion`,
  )
}

const checks: Record<string, string[]> = {
  empresas: ['id', 'nombre', 'estado'], departamentos: ['id', 'empresa_id', 'nombre', 'estado'],
  usuarios: ['id', 'rol_id', 'empresa_id', 'departamento_id', 'nombre_completo', 'email', 'password', 'dpi', 'telefono', 'estado', 'ultimo_acceso', 'creado_en', 'actualizado_en'],
  roles: ['id', 'nombre', 'estado', 'empresa_id', 'departamento_id'], rol_permisos: ['rol_id', 'permiso_id'],
  permisos: ['id', 'modulo', 'accion'], fondos_caja: ['id', 'empresa_id', 'departamento_id', 'estado'],
  gastos: ['id', 'fondo_id', 'usuario_registro_id', 'estado'], ingresos: ['id', 'fondo_id', 'usuario_id', 'estado'],
  movimientos_caja: ['id', 'fondo_id', 'tipo_movimiento', 'referencia_tipo', 'referencia_id'],
  auditoria_eventos: ['id', 'usuario_id', 'accion', 'entidad', 'creado_en'],
}

export const validateDatabaseSchema = async () => {
  const missing: string[] = []
  for (const [table, columns] of Object.entries(checks)) {
    if (!await tableExists(table)) { missing.push(`tabla:${table}`); continue }
    for (const column of columns) if (!await columnExists(table, column)) missing.push(`${table}.${column}`)
  }
  return missing
}
