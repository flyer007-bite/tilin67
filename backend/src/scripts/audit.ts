import type { RowDataPacket } from 'mysql2'
import { db } from '../config/db'

const checks: Array<[string, string]> = [
  ['GASTO_APROBADO_SIN_MOVIMIENTO', `SELECT g.id FROM gastos g LEFT JOIN movimientos_caja m ON m.referencia_tipo='gastos' AND m.referencia_id=g.id WHERE g.estado='aprobado' GROUP BY g.id HAVING COUNT(m.id)<>1`],
  ['GASTO_NO_APROBADO_CON_MOVIMIENTO', `SELECT g.id FROM gastos g JOIN movimientos_caja m ON m.referencia_tipo='gastos' AND m.referencia_id=g.id WHERE g.estado<>'aprobado'`],
  ['MOVIMIENTO_REFERENCIA_DUPLICADA', `SELECT referencia_tipo,referencia_id,COUNT(*) total FROM movimientos_caja GROUP BY referencia_tipo,referencia_id HAVING COUNT(*)>1`],
  ['INGRESO_ACTIVO_SIN_MOVIMIENTO', `SELECT i.id FROM ingresos i LEFT JOIN movimientos_caja m ON m.referencia_tipo='ingresos' AND m.referencia_id=i.id WHERE i.estado='activo' GROUP BY i.id HAVING COUNT(m.id)<>1`],
  ['FONDO_CERRADO_CON_GASTOS_PENDIENTES', `SELECT f.id FROM fondos_caja f JOIN gastos g ON g.fondo_id=f.id AND g.estado='pendiente' WHERE f.estado<>'activo' GROUP BY f.id`],
  ['USUARIO_DEPARTAMENTO_OTRA_EMPRESA', `SELECT u.id FROM usuarios u JOIN departamentos d ON d.id=u.departamento_id WHERE u.empresa_id<>d.empresa_id`],
  ['ROL_DEPARTAMENTO_OTRA_EMPRESA', `SELECT r.id FROM roles r JOIN departamentos d ON d.id=r.departamento_id WHERE r.empresa_id<>d.empresa_id`],
  ['FONDO_DEPARTAMENTO_OTRA_EMPRESA', `SELECT f.id FROM fondos_caja f JOIN departamentos d ON d.id=f.departamento_id WHERE f.empresa_id<>d.empresa_id`],
  ['FONDO_SIN_ORGANIZACION', `SELECT id FROM fondos_caja WHERE empresa_id IS NULL OR departamento_id IS NULL`],
]

const main = async () => {
  let findings = 0
  for (const [name, sql] of checks) {
    const [rows] = await db.query<RowDataPacket[]>(sql)
    findings += rows.length
    console.log(`${name}: ${rows.length}`)
  }
  if (findings) process.exitCode = 2
}

main().catch(error => { console.error('No se pudo completar la auditoría:', error); process.exitCode = 1 }).finally(() => db.end())
