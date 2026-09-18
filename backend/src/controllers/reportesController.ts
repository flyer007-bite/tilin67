import { Request, Response } from 'express'
import { RowDataPacket } from 'mysql2'
import { db } from '../config/db'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware'

const responderError = (res: Response, error: unknown) => {
  console.error('Error al generar reporte:', error)
  res.status(500).json({ message: 'No fue posible generar el reporte.' })
}

export const obtenerDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const anio = Number(req.query.anio) || new Date().getFullYear()
  const mes = Number(req.query.mes) || 0
  const empresaId = req.user?.empresa_id
  const departamentoId = Number(req.user?.departamento_id)

  if (!empresaId || !Number.isInteger(departamentoId) || departamentoId <= 0) {
    res.status(403).json({ message: 'La sesión no tiene una empresa y departamento válidos.' })
    return
  }

  // Los movimientos se separan por la organización del usuario que los registró.
  // Así una sesión no puede mezclar datos de otra empresa o departamento.
  const filtroIngresos = [
    `estado = 'activo'`,
    'YEAR(fecha) = ?',
    'usuario_id IN (SELECT id FROM usuarios WHERE empresa_id = ? AND departamento_id = ?)',
  ]
  const filtroGastos = [
    `estado <> 'anulado'`,
    'YEAR(fecha_comprobante) = ?',
    'usuario_registro_id IN (SELECT id FROM usuarios WHERE empresa_id = ? AND departamento_id = ?)',
  ]
  const paramsIngresos: Array<number | string> = [anio, empresaId, departamentoId]
  const paramsGastos: Array<number | string> = [anio, empresaId, departamentoId]

  if (mes >= 1 && mes <= 12) {
    filtroIngresos.push('MONTH(fecha) = ?')
    filtroGastos.push('MONTH(fecha_comprobante) = ?')
    paramsIngresos.push(mes)
    paramsGastos.push(mes)
  }

  const agrupacion = mes ? "DATE_FORMAT(fecha, '%d')" : "DATE_FORMAT(fecha, '%Y-%m')"
  const agrupacionGasto = mes ? "DATE_FORMAT(fecha_comprobante, '%d')" : "DATE_FORMAT(fecha_comprobante, '%Y-%m')"

  try {
    const [totalesRows] = await db.query<RowDataPacket[]>(`
      SELECT
        (SELECT COALESCE(SUM(monto), 0) FROM ingresos WHERE ${filtroIngresos.join(' AND ')}) AS ingresos,
        (SELECT COALESCE(SUM(monto), 0) FROM gastos WHERE ${filtroGastos.join(' AND ')}) AS egresos,
        (SELECT COUNT(*) FROM ingresos WHERE ${filtroIngresos.join(' AND ')}) AS cantidad_ingresos,
        (SELECT COUNT(*) FROM gastos WHERE ${filtroGastos.join(' AND ')}) AS cantidad_egresos
    `, [...paramsIngresos, ...paramsGastos, ...paramsIngresos, ...paramsGastos])
    const [mensual] = await db.query<RowDataPacket[]>(`
      SELECT periodo, SUM(ingresos) AS ingresos, SUM(egresos) AS egresos
      FROM (
        SELECT ${agrupacion} AS periodo, monto AS ingresos, 0 AS egresos FROM ingresos WHERE ${filtroIngresos.join(' AND ')}
        UNION ALL
        SELECT ${agrupacionGasto} AS periodo, 0 AS ingresos, monto AS egresos FROM gastos WHERE ${filtroGastos.join(' AND ')}
      ) movimientos
      GROUP BY periodo ORDER BY periodo
    `, [...paramsIngresos, ...paramsGastos])
    const [movimientos] = await db.query<RowDataPacket[]>(`
      SELECT * FROM (
        SELECT 'Ingreso' AS tipo, fecha, descripcion, monto, estado, NULL AS persona_realizo_gasto FROM ingresos WHERE ${filtroIngresos.join(' AND ')}
        UNION ALL
        SELECT 'Egreso' AS tipo, fecha_comprobante AS fecha, motivo_gasto AS descripcion, monto, estado, persona_realizo_gasto_nombre AS persona_realizo_gasto FROM gastos WHERE ${filtroGastos.join(' AND ')}
      ) movimientos ORDER BY fecha DESC LIMIT 8
    `, [...paramsIngresos, ...paramsGastos])
    const [aniosRows] = await db.query<RowDataPacket[]>(`
      SELECT DISTINCT anio FROM (
        SELECT YEAR(fecha) AS anio FROM ingresos
          WHERE usuario_id IN (SELECT id FROM usuarios WHERE empresa_id = ? AND departamento_id = ?)
        UNION
        SELECT YEAR(fecha_comprobante) AS anio FROM gastos
          WHERE usuario_registro_id IN (SELECT id FROM usuarios WHERE empresa_id = ? AND departamento_id = ?)
      ) periodos WHERE anio IS NOT NULL ORDER BY anio DESC
    `, [empresaId, departamentoId, empresaId, departamentoId])
    const totales = totalesRows[0]
    res.json({
      ingresos: Number(totales.ingresos),
      egresos: Number(totales.egresos),
      balance: Number(totales.ingresos) - Number(totales.egresos),
      cantidadIngresos: Number(totales.cantidad_ingresos),
      cantidadEgresos: Number(totales.cantidad_egresos),
      anio,
      mes,
      anios: aniosRows.map(row => Number(row.anio)),
      mensual,
      movimientos,
    })
  } catch (error) {
    responderError(res, error)
  }
}

export const obtenerReporte = async (req: Request, res: Response): Promise<void> => {
  const { tipo } = req.params

  const consultas: Record<string, string> = {
    gastos: `SELECT g.id, g.fecha_comprobante AS fecha, CONCAT_WS('-', g.serie_comprobante, g.numero_comprobante) AS comprobante, p.nombre AS proveedor, COALESCE(NULLIF(g.persona_realizo_gasto_nombre, ''), u.nombre_completo) AS persona, COALESCE(tipos.tipos_gasto, 'Sin categoría') AS tipo_gasto, g.monto, g.estado
      FROM gastos g
      LEFT JOIN proveedores p ON p.id = g.proveedor_id
      LEFT JOIN usuarios u ON u.id = g.persona_realizo_gasto_id
      LEFT JOIN (SELECT gtg.gasto_id, GROUP_CONCAT(tg.nombre ORDER BY tg.nombre SEPARATOR ', ') AS tipos_gasto FROM gasto_tipos_gasto gtg INNER JOIN tipos_gasto tg ON tg.id = gtg.tipo_gasto_id GROUP BY gtg.gasto_id) tipos ON tipos.gasto_id = g.id
      ORDER BY g.fecha_comprobante DESC, g.id DESC`,
    persona: `SELECT COALESCE(NULLIF(g.persona_realizo_gasto_nombre, ''), u.nombre_completo, 'Sin asignar') AS persona, COUNT(g.id) AS total_gastos, COALESCE(SUM(g.monto), 0) AS monto_total
      FROM gastos g LEFT JOIN usuarios u ON u.id = g.persona_realizo_gasto_id
      GROUP BY COALESCE(NULLIF(g.persona_realizo_gasto_nombre, ''), u.nombre_completo, 'Sin asignar') ORDER BY monto_total DESC`,
    proveedor: `SELECT COALESCE(p.nombre, 'Sin proveedor') AS proveedor, p.nit, COUNT(g.id) AS total_gastos, COALESCE(SUM(g.monto), 0) AS monto_total
      FROM gastos g LEFT JOIN proveedores p ON p.id = g.proveedor_id
      GROUP BY p.id, p.nombre, p.nit ORDER BY monto_total DESC`,
    'tipo-gasto': `SELECT COALESCE(tg.nombre, 'Sin categoría') AS tipo_gasto, COUNT(DISTINCT g.id) AS total_gastos, COALESCE(SUM(g.monto), 0) AS monto_total
      FROM gastos g LEFT JOIN gasto_tipos_gasto gtg ON gtg.gasto_id = g.id LEFT JOIN tipos_gasto tg ON tg.id = gtg.tipo_gasto_id
      GROUP BY tg.id, tg.nombre ORDER BY monto_total DESC`,
    semanal: `SELECT CONCAT(YEARWEEK(MIN(g.fecha_comprobante), 1) DIV 100, '-S', LPAD(MOD(YEARWEEK(MIN(g.fecha_comprobante), 1), 100), 2, '0')) AS semana, COUNT(g.id) AS total_gastos, COALESCE(SUM(g.monto), 0) AS monto_total
      FROM gastos g GROUP BY YEARWEEK(g.fecha_comprobante, 1) ORDER BY MIN(g.fecha_comprobante) DESC`,
    mensual: `SELECT DATE_FORMAT(g.fecha_comprobante, '%Y-%m') AS periodo, COUNT(g.id) AS total_gastos, COALESCE(SUM(g.monto), 0) AS monto_total
      FROM gastos g GROUP BY DATE_FORMAT(g.fecha_comprobante, '%Y-%m') ORDER BY periodo DESC`,
    'ingresos-egresos': `SELECT periodo, SUM(ingresos) AS total_ingresos, SUM(egresos) AS total_egresos, SUM(ingresos) - SUM(egresos) AS balance
      FROM (
        SELECT DATE_FORMAT(fecha, '%Y-%m') AS periodo, monto AS ingresos, 0 AS egresos FROM ingresos WHERE estado = 'activo'
        UNION ALL
        SELECT DATE_FORMAT(fecha_comprobante, '%Y-%m') AS periodo, 0 AS ingresos, monto AS egresos FROM gastos WHERE estado <> 'anulado'
      ) movimientos GROUP BY periodo ORDER BY periodo DESC`,
  }

  const sql = consultas[tipo]
  if (!sql) {
    res.status(404).json({ message: 'Tipo de reporte no válido.' })
    return
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(sql)
    res.json(rows)
  } catch (error) {
    responderError(res, error)
  }
}
