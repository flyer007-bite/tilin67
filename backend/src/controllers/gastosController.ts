import { Request, Response } from 'express'
import { db } from '../config/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { fechaValida, idPositivo, montoValido, textoSeguro } from '../utils/validacion'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware'

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
  const usuarioId = req.user?.id
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

    /*
     * 1. Crear el gasto
     */
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

    /*
     * 3. Crear movimiento de caja como EGRESO
     */
    await connection.query(
      `INSERT INTO movimientos_caja
      (
        fondo_id,
        tipo_movimiento,
        referencia_tipo,
        referencia_id,
        descripcion,
        monto,
        usuario_id
      )
      VALUES (
        ?,
        'EGRESO',
        'gastos',
        ?,
        ?,
        ?,
        ?
      )`,
      [
        fondo_id,
        gastoId,
        `Gasto: ${motivo}`,
        montoSeguro,
        usuarioId,
      ]
    )

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
      detalles: error.sqlMessage || error.message,
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
    const params: string[] = []

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

    console.log('🔎 CONSULTA DE GASTOS')
    console.log('Número:', numeroComprobante || 'TODOS')
    console.log('Serie:', serieComprobante || 'TODAS')
    console.log('Resultados:', rows.length)

    res.json(rows)

  } catch (error: any) {
    console.error('❌ ERROR AL OBTENER GASTOS:', error)

    res.status(500).json({
      message: 'Error al consultar los gastos.',
      detalles: error.sqlMessage || error.message,
    })
  }
}

// Personas disponibles para indicar quién realizó el gasto.
export const obtenerUsuariosGasto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, nombre_completo FROM usuarios ORDER BY nombre_completo'
    )
    res.json(rows)
  } catch (error: any) {
    res.status(500).json({ message: 'No se pudieron obtener los usuarios.', detalles: error.message })
  }
}

// Aprobar o rechazar un gasto pendiente.
export const cambiarEstadoGasto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id)
  const { estado } = req.body
  const usuarioId = req.user?.id

  if (!Number.isInteger(id) || !usuarioId || !['aprobado', 'rechazado'].includes(estado)) {
    res.status(400).json({ message: 'Solicitud de aprobación inválida.' })
    return
  }

  try {
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE gastos
       SET estado = ?,
           aprobado_por = CASE WHEN ? = 'aprobado' THEN ? ELSE aprobado_por END,
           aprobado_en = CASE WHEN ? = 'aprobado' THEN NOW() ELSE aprobado_en END,
           revisado_por = ?, revisado_en = NOW()
       WHERE id = ? AND estado IN ('pendiente', 'aprobado')`,
      [estado, estado, usuarioId, estado, usuarioId, id],
    )

    if (!result.affectedRows) {
      res.status(409).json({ message: 'El gasto no existe o ya fue rechazado.' })
      return
    }

    res.json({ message: `Gasto ${estado} correctamente.` })
  } catch (error: any) {
    res.status(500).json({ message: 'No se pudo actualizar el gasto.', detalles: error.message })
  }
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
     * Eliminar movimiento de caja relacionado
     */

    await connection.query(
      `DELETE FROM movimientos_caja
       WHERE referencia_tipo = 'gastos'
       AND referencia_id = ?`,
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
      detalles: error.sqlMessage || error.message,
    })

  } finally {
    connection.release()
  }
}
