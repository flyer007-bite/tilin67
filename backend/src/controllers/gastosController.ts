import { Request, Response } from 'express'
import { db } from '../config/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { fechaValida, idPositivo, montoValido, textoSeguro } from '../utils/validacion'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware'
import { registrarAuditoria } from '../utils/auditoria'

export const crearGasto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const {
    fondo_id,
    tipo_comprobante_id,
    serie_comprobante,
    numero_comprobante,
    fecha_comprobante,
    proveedor_id,
    persona_realizo_gasto_id,
    persona_realizo_gasto_nombre,
    usuario_registro_id,
    monto,
    motivo_gasto,
    observaciones,
    documento_url,
    tipo_gasto_id,
  } = req.body

  const fondoId = idPositivo(fondo_id)
  const tipoComprobanteId = idPositivo(tipo_comprobante_id)
  const proveedorId = idPositivo(proveedor_id)
  const personaId = idPositivo(persona_realizo_gasto_id)
  // Quien registra se obtiene de la sesión; el navegador no puede elegirlo.
  const usuarioId = req.auth?.id
  const tipoGastoId = idPositivo(tipo_gasto_id)
  const numeroComprobante = textoSeguro(String(numero_comprobante ?? ''), 100)
  const fechaComprobante = fechaValida(fecha_comprobante)
  const personaNombre = textoSeguro(persona_realizo_gasto_nombre, 150)
  const montoSeguro = montoValido(monto)
  const motivo = textoSeguro(motivo_gasto, 500)
  const serie = serie_comprobante == null || serie_comprobante === '' ? null : textoSeguro(serie_comprobante, 50)
  const observacion = observaciones == null || observaciones === '' ? null : textoSeguro(observaciones, 5000)
  const documento = documento_url == null || documento_url === '' ? null : textoSeguro(documento_url, 500)

  if (!fondoId || !tipoComprobanteId || !numeroComprobante || !fechaComprobante || !proveedorId || !personaId || !personaNombre || !usuarioId || !montoSeguro || !motivo || !tipoGastoId || (serie_comprobante != null && serie_comprobante !== '' && !serie) || (observaciones != null && observaciones !== '' && !observacion) || (documento_url != null && documento_url !== '' && !documento)) {
    res.status(400).json({
      message: 'No se puede ingresar esa información. Ingresa un monto mayor a Q 0.00, con máximo dos decimales, y completa los campos solicitados dentro de sus límites.',
    })
    return
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const scopeSql = req.auth?.esAdministradorGlobal ? ' AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL' : ' AND empresa_id=? AND departamento_id=?'
    const scopeParams = req.auth?.esAdministradorGlobal ? [] : [req.auth?.empresaId, req.auth?.departamentoId]
    const [fondos] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM fondos_caja WHERE id=? AND estado='activo'${scopeSql} FOR UPDATE`, [fondoId, ...scopeParams],
    )
    if (!fondos.length) {
      await connection.rollback()
      res.status(409).json({ message: 'El fondo no existe, no está activo o no pertenece a tu organización.' })
      return
    }
    const references = await Promise.all([
      connection.query<RowDataPacket[]>('SELECT id FROM tipos_comprobante WHERE id=? LIMIT 1', [tipoComprobanteId]),
      connection.query<RowDataPacket[]>('SELECT id FROM proveedores WHERE id=? LIMIT 1', [proveedorId]),
      connection.query<RowDataPacket[]>(`SELECT id FROM usuarios WHERE id=? AND estado=1${req.auth?.esAdministradorGlobal ? '' : ' AND empresa_id=? AND departamento_id=?'} LIMIT 1`, [personaId, ...scopeParams]),
      connection.query<RowDataPacket[]>('SELECT id FROM tipos_gasto WHERE id=? LIMIT 1', [tipoGastoId]),
    ])
    if (references.some(([rows]) => !rows.length)) {
      await connection.rollback()
      res.status(400).json({ message: 'Alguno de los datos seleccionados ya no está disponible.' })
      return
    }
    const [duplicates] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM gastos WHERE proveedor_id=? AND tipo_comprobante_id=? AND serie_comprobante <=> ? AND numero_comprobante=? LIMIT 1 FOR UPDATE',
      [proveedorId, tipoComprobanteId, serie, numeroComprobante],
    )
    if (duplicates.length) {
      await connection.rollback()
      res.status(409).json({ message: 'Ya existe un gasto con ese comprobante.' })
      return
    }
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO gastos
      (
        fondo_id,
        tipo_comprobante_id,
        serie_comprobante,
        numero_comprobante,
        fecha_comprobante,
        proveedor_id,
        persona_realizo_gasto_id,
        persona_realizo_gasto_nombre,
        usuario_registro_id,
        monto,
        motivo_gasto,
        observaciones,
        documento_url,
        estado,
        mes,
        anio
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente',
        MONTH(?),
        YEAR(?)
      )`,
      [
        fondoId,
        tipoComprobanteId,
        serie,
        numeroComprobante,
        fechaComprobante,
        proveedorId,
        personaId,
        personaNombre,
        usuarioId,
        montoSeguro,
        motivo,
        observacion,
        documento,
        fechaComprobante,
        fechaComprobante,
      ]
    )

    const gastoId = result.insertId

    /*
     * 2. Relacionar el gasto con su tipo
     */
    await connection.query(
      `INSERT INTO gasto_tipos_gasto
      (
        gasto_id,
        tipo_gasto_id
      )
      VALUES (?, ?)`,
      [
        gastoId,
        tipoGastoId,
      ]
    )

    await registrarAuditoria(connection, { usuarioId, accion: 'crear', entidad: 'gasto', entidadId: gastoId, fondoId, despues: { estado: 'pendiente', monto: montoSeguro } })

    await connection.commit()

    res.status(201).json({
      message: 'Gasto registrado correctamente.',
      id: gastoId,
    })
  } catch (error: any) {
    await connection.rollback()

    console.error('❌ ERROR AL CREAR GASTO:', error)

    res.status(500).json({
      message: 'Error al guardar el gasto.',
    })
  } finally {
    connection.release()
  }
}


/*
 * ============================================================
 * OBTENER GASTOS
 * ============================================================
 */
export const obtenerGastos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {

    /*
     * Recibir filtros desde la URL
     *
     * Ejemplo:
     * /api/gastos?numero_comprobante=1111
     *
     * O:
     * /api/gastos?numero_comprobante=1111&serie_comprobante=A
     */
    const numeroComprobante =
      typeof req.query.numero_comprobante === 'string'
        ? req.query.numero_comprobante.trim()
        : ''

    const serieComprobante =
      typeof req.query.serie_comprobante === 'string'
        ? req.query.serie_comprobante.trim()
        : ''

    /*
     * Consulta principal
     */
    let sql = `
      SELECT
        g.id,
        g.fondo_id,

        g.tipo_comprobante_id,
        tc.nombre AS tipo_comprobante,

        g.serie_comprobante,
        g.numero_comprobante,
        g.fecha_comprobante,

        g.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,

        g.persona_realizo_gasto_id,
        COALESCE(NULLIF(g.persona_realizo_gasto_nombre, ''), u1.nombre_completo) AS persona_realizo_gasto,

        g.usuario_registro_id,
        u2.nombre_completo AS usuario_registro,

        g.monto,
        g.motivo_gasto,
        g.observaciones,
        g.documento_url,
        g.estado,

        g.mes,
        g.anio,

        (
          SELECT GROUP_CONCAT(
            tg.nombre
            ORDER BY tg.nombre
            SEPARATOR ', '
          )
          FROM gasto_tipos_gasto gtg
          INNER JOIN tipos_gasto tg
            ON gtg.tipo_gasto_id = tg.id
          WHERE gtg.gasto_id = g.id
        ) AS tipos_gasto,

        g.creado_en,
        g.actualizado_en

      FROM gastos g

      INNER JOIN tipos_comprobante tc
        ON g.tipo_comprobante_id = tc.id

      INNER JOIN proveedores p
        ON g.proveedor_id = p.id

      INNER JOIN usuarios u1
        ON g.persona_realizo_gasto_id = u1.id

      INNER JOIN usuarios u2
        ON g.usuario_registro_id = u2.id

      WHERE 1 = 1
    `

    /*
     * Parámetros seguros para MySQL
     */
    const params: Array<string | number> = []

    if (!req.auth?.esAdministradorGlobal) {
      sql += ' AND g.fondo_id IN (SELECT id FROM fondos_caja WHERE empresa_id=? AND departamento_id=?)'
      params.push(String(req.auth?.empresaId || ''), Number(req.auth?.departamentoId || 0))
    }

    /*
     * Filtrar por número de comprobante
     */
    if (numeroComprobante) {
      sql += ` AND g.numero_comprobante = ?`
      params.push(numeroComprobante)
    }

    /*
     * Filtrar por serie solamente si el usuario la escribió
     */
    if (serieComprobante) {
      sql += ` AND g.serie_comprobante = ?`
      params.push(serieComprobante)
    }

    /*
     * Ordenar resultados
     */
    sql += `
      ORDER BY
        g.creado_en DESC,
        g.id DESC
    `

    /*
     * Ejecutar consulta
     */
    const [rows] = await db.query<RowDataPacket[]>(
      sql,
      params
    )

    res.json(rows)

  } catch (error: any) {
    console.error('❌ ERROR AL OBTENER GASTOS:', error)

    res.status(500).json({
      message: 'Error al consultar los gastos.',
    })
  }
}

// Personas disponibles para indicar quién realizó el gasto.
export const obtenerUsuariosGasto = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id,nombre_completo FROM usuarios WHERE estado=1${req.auth?.esAdministradorGlobal ? '' : ' AND empresa_id=? AND departamento_id=?'} ORDER BY nombre_completo`,
      req.auth?.esAdministradorGlobal ? [] : [req.auth?.empresaId, req.auth?.departamentoId],
    )
    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ message: 'No se pudieron obtener los usuarios.' })
  }
}

// Catálogos necesarios para registrar un gasto. Los catálogos maestros son
// globales, pero personas y fondos siempre respetan el alcance de la sesión.
export const obtenerCatalogosGasto = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationSql = req.auth?.esAdministradorGlobal
      ? 'empresa_id IS NOT NULL AND departamento_id IS NOT NULL'
      : 'empresa_id=? AND departamento_id=?'
    const organizationParams = req.auth?.esAdministradorGlobal
      ? []
      : [req.auth?.empresaId, req.auth?.departamentoId]
    const [tiposComprobante, proveedores, usuarios, tiposGasto, fondos] = await Promise.all([
      db.query<RowDataPacket[]>('SELECT id,nombre FROM tipos_comprobante ORDER BY nombre'),
      db.query<RowDataPacket[]>('SELECT id,nombre,nit FROM proveedores ORDER BY nombre'),
      db.query<RowDataPacket[]>(`SELECT id,nombre_completo FROM usuarios WHERE estado=1 AND ${organizationSql} ORDER BY nombre_completo`, organizationParams),
      db.query<RowDataPacket[]>('SELECT id,nombre FROM tipos_gasto ORDER BY nombre'),
      db.query<RowDataPacket[]>(`SELECT id,mes,anio,monto_inicial,numero_cheque FROM fondos_caja WHERE estado='activo' AND ${organizationSql} ORDER BY anio DESC,mes DESC,id DESC`, organizationParams),
    ])
    res.json({
      tiposComprobante: tiposComprobante[0],
      proveedores: proveedores[0],
      usuarios: usuarios[0],
      tiposGasto: tiposGasto[0],
      fondos: fondos[0],
    })
  } catch (error) {
    console.error('Error consultando catálogos de gastos:', error)
    res.status(500).json({ message: 'No fue posible cargar los catálogos del gasto.' })
  }
}

// Aprobar o rechazar un gasto pendiente.
export const cambiarEstadoGasto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  const { estado } = req.body
  const usuarioId = req.auth?.id

  if (!Number.isInteger(id) || !usuarioId || !['aprobado', 'rechazado'].includes(estado)) {
    res.status(400).json({ message: 'Solicitud de aprobación inválida.' })
    return
  }

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const scope = req.auth?.esAdministradorGlobal ? ' AND f.empresa_id IS NOT NULL AND f.departamento_id IS NOT NULL' : ' AND f.empresa_id=? AND f.departamento_id=?'
    const params = req.auth?.esAdministradorGlobal ? [id] : [id, req.auth?.empresaId, req.auth?.departamentoId]
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT g.id,g.fondo_id,g.monto,g.motivo_gasto,g.estado,f.estado fondo_estado
         FROM gastos g JOIN fondos_caja f ON f.id=g.fondo_id WHERE g.id=?${scope} FOR UPDATE`, params,
    )
    const gasto = rows[0]
    if (!gasto) { await connection.rollback(); res.status(404).json({ message: 'El gasto no existe.' }); return }
    if (gasto.estado !== 'pendiente') { await connection.rollback(); res.status(409).json({ message: 'Solo los gastos pendientes pueden revisarse.' }); return }
    if (gasto.fondo_estado !== 'activo') { await connection.rollback(); res.status(409).json({ message: 'El fondo está cerrado o liquidado.' }); return }
    const [movements] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM movimientos_caja WHERE referencia_tipo='gastos' AND referencia_id=? FOR UPDATE`, [id],
    )
    if (movements.length) {
      await connection.rollback()
      res.status(409).json({ message: 'El gasto presenta una inconsistencia histórica y requiere auditoría antes de continuar.' })
      return
    }
    if (estado === 'aprobado') {
      await connection.query(
        `INSERT INTO movimientos_caja (fondo_id,tipo_movimiento,referencia_tipo,referencia_id,descripcion,monto,usuario_id)
         VALUES (?,'EGRESO','gastos',?,?,?,?)`, [gasto.fondo_id,id,`Gasto: ${gasto.motivo_gasto}`,gasto.monto,usuarioId],
      )
    }
    await connection.query(
      `UPDATE gastos SET estado=?,aprobado_por=IF(?='aprobado',?,NULL),aprobado_en=IF(?='aprobado',NOW(),NULL),revisado_por=?,revisado_en=NOW() WHERE id=?`,
      [estado,estado,usuarioId,estado,usuarioId,id],
    )
    await registrarAuditoria(connection, { usuarioId, accion: estado === 'aprobado' ? 'aprobar' : 'rechazar', entidad: 'gasto', entidadId: id, fondoId: Number(gasto.fondo_id), antes: { estado: 'pendiente' }, despues: { estado } })
    await connection.commit()
    res.json({ message: `Gasto ${estado} correctamente.` })
  }
  catch (error) {
    await connection.rollback()
    console.error('Error actualizando gasto:', error)
    res.status(500).json({ message: 'No se pudo actualizar el gasto.' })
  }
  finally { connection.release() }
}


/*
 * ============================================================
 * ELIMINAR GASTO
 * ============================================================
 */
export const eliminarGasto = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params

  if (!id) {
    res.status(400).json({
      message: 'El ID del gasto es obligatorio.',
    })
    return
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const scope = req.auth?.esAdministradorGlobal ? ' AND f.empresa_id IS NOT NULL AND f.departamento_id IS NOT NULL' : ' AND f.empresa_id=? AND f.departamento_id=?'
    const params = req.auth?.esAdministradorGlobal ? [id] : [id, req.auth?.empresaId, req.auth?.departamentoId]
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT g.id,g.estado,g.fondo_id,f.estado fondo_estado FROM gastos g JOIN fondos_caja f ON f.id=g.fondo_id WHERE g.id=?${scope} FOR UPDATE`, params,
    )
    const gasto = rows[0]
    if (!gasto) { await connection.rollback(); res.status(404).json({ message: 'El gasto no existe.' }); return }
    if (gasto.estado !== 'pendiente' || gasto.fondo_estado !== 'activo') {
      await connection.rollback(); res.status(409).json({ message: 'Solo puede eliminarse un gasto pendiente de un fondo activo.' }); return
    }
    const [movements] = await connection.query<RowDataPacket[]>(`SELECT id FROM movimientos_caja WHERE referencia_tipo='gastos' AND referencia_id=? LIMIT 1`, [id])
    if (movements.length) { await connection.rollback(); res.status(409).json({ message: 'El gasto requiere auditoría antes de eliminarse.' }); return }
    await registrarAuditoria(connection, { usuarioId: req.auth!.id, accion: 'eliminar_borrador', entidad: 'gasto', entidadId: Number(id), fondoId: Number(gasto.fondo_id), antes: gasto })

    /*
     * Eliminar relaciones del gasto
     */

    await connection.query(
      `DELETE FROM arqueo_comprobantes
       WHERE gasto_id = ?`,
      [id]
    )

    await connection.query(
      `DELETE FROM reembolsos_gasto
       WHERE gasto_id = ?`,
      [id]
    )

    await connection.query(
      `DELETE FROM documentos
       WHERE gasto_id = ?`,
      [id]
    )

    await connection.query(
      `DELETE FROM gasto_tipos_gasto
       WHERE gasto_id = ?`,
      [id]
    )

    /*
     * Finalmente eliminar el gasto
     */

    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM gastos
       WHERE id = ?`,
      [id]
    )

    if (result.affectedRows === 0) {
      await connection.rollback()

      res.status(404).json({
        message: 'El gasto no existe.',
      })

      return
    }

    await connection.commit()

    res.json({
      message: 'Gasto eliminado correctamente.',
    })

  } catch (error: any) {
    await connection.rollback()

    console.error('❌ ERROR AL ELIMINAR GASTO:', error)

    res.status(500).json({
      message: 'Error al eliminar el gasto.',
    })

  } finally {
    connection.release()
  }
}
