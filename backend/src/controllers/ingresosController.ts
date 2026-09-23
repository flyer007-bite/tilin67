
import { Request, Response } from 'express'
import { db } from '../config/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { idPositivo, montoValido, textoSeguro } from '../utils/validacion'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware'
import { registrarAuditoria } from '../utils/auditoria'

export const crearIngreso = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const {
    fondo_id,
    monto,
    tipo_ingreso,
    descripcion,
    documento_asociado_url,
    observaciones,
  } = req.body

  const fondoId = idPositivo(fondo_id)
  // La autoría del ingreso siempre es la del usuario autenticado.
  const usuarioId = req.auth?.id
  const montoSeguro = montoValido(monto)
  const tipoIngreso = textoSeguro(tipo_ingreso, 100)
  const descripcionSegura = textoSeguro(descripcion, 500)
  const observacionesSeguras = observaciones == null || observaciones === '' ? null : textoSeguro(observaciones, 5000)
  const documentoSeguro = documento_asociado_url == null || documento_asociado_url === '' ? null : textoSeguro(documento_asociado_url, 500)

  if (!fondoId || !usuarioId || !montoSeguro || !tipoIngreso || !descripcionSegura || (observaciones != null && observaciones !== '' && !observacionesSeguras) || (documento_asociado_url != null && documento_asociado_url !== '' && !documentoSeguro)) {
    res.status(400).json({
      message: 'No se puede ingresar esa información. Ingresa un monto mayor a Q 0.00, con máximo dos decimales, y respeta los límites de texto solicitados.',
    })
    return
  }

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const scope = req.auth?.esAdministradorGlobal ? ' AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL' : ' AND empresa_id=? AND departamento_id=?'
    const scopeParams = req.auth?.esAdministradorGlobal ? [] : [req.auth?.empresaId, req.auth?.departamentoId]
    const [funds] = await connection.query<RowDataPacket[]>(
      `SELECT id,monto_inicial,estado FROM fondos_caja WHERE id=?${scope} FOR UPDATE`, [fondoId, ...scopeParams],
    )
    const fund = funds[0]
    if (!fund || fund.estado !== 'activo') {
      await connection.rollback(); res.status(409).json({ message: 'El fondo no existe, no está activo o no pertenece a tu organización.' }); return
    }
    if (tipoIngreso.toLowerCase() === 'asignación inicial' || tipoIngreso.toLowerCase() === 'asignacion inicial') {
      if (Number(montoSeguro) !== Number(fund.monto_inicial)) {
        await connection.rollback(); res.status(400).json({ message: 'La asignación inicial debe coincidir con el monto inicial del fondo.' }); return
      }
      const [existing] = await connection.query<RowDataPacket[]>(`SELECT id FROM ingresos WHERE fondo_id=? AND estado='activo' AND LOWER(tipo_ingreso) IN ('asignación inicial','asignacion inicial') LIMIT 1 FOR UPDATE`, [fondoId])
      if (existing.length) { await connection.rollback(); res.status(409).json({ message: 'El fondo ya tiene una asignación inicial activa.' }); return }
    }
    const [ingresoResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO ingresos
        (
          fondo_id,
          usuario_id,
          monto,
          tipo_ingreso,
          descripcion,
          documento_asociado_url,
          observaciones
        )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fondoId,
        usuarioId,
        montoSeguro,
        tipoIngreso,
        descripcionSegura,
        documentoSeguro,
        observacionesSeguras,
      ]
    )

    const ingresoId = ingresoResult.insertId

    // Registrar movimiento de caja
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
       VALUES (?, 'INGRESO', 'ingresos', ?, ?, ?, ?)`,
      [
        fondoId,
        ingresoId,
        `Ingreso: ${tipoIngreso} - ${descripcionSegura}`,
        montoSeguro,
        usuarioId,
      ]
    )

    await registrarAuditoria(connection, { usuarioId, accion: 'crear', entidad: 'ingreso', entidadId: ingresoId, fondoId, despues: { monto: montoSeguro, tipo_ingreso: tipoIngreso } })
    await connection.commit()
    res.status(201).json({
      message: 'Ingreso registrado correctamente',
      id: ingresoId,
    })
  } catch (error) {
    await connection.rollback(); console.error('Error al crear ingreso:', error)
    res.status(500).json({ message: 'Error al guardar el ingreso.' })
  } finally { connection.release() }
}

export const obtenerIngresos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        id,
        fondo_id,
        usuario_id,
        monto,
        tipo_ingreso,
        descripcion,
        documento_asociado_url,
        observaciones,
        fecha,
        estado
       FROM ingresos
       WHERE fondo_id IN (SELECT id FROM fondos_caja WHERE empresa_id IS NOT NULL AND departamento_id IS NOT NULL AND (?=1 OR (empresa_id=? AND departamento_id=?)))
       ORDER BY fecha DESC, id DESC`
      , [req.auth?.esAdministradorGlobal ? 1 : 0, req.auth?.empresaId, req.auth?.departamentoId]
    )

    res.json(rows)
  } catch (error: any) {
    console.error('❌ ERROR AL OBTENER INGRESOS:', error)

    res.status(500).json({
      message: 'Error al consultar los ingresos.',
    })
  }
}

export const eliminarIngreso = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params

  if (!id) {
    res.status(400).json({
      message: 'El ID del ingreso es obligatorio.',
    })
    return
  }

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const scope = req.auth?.esAdministradorGlobal ? ' AND f.empresa_id IS NOT NULL AND f.departamento_id IS NOT NULL' : ' AND f.empresa_id=? AND f.departamento_id=?'
    const params = req.auth?.esAdministradorGlobal ? [id] : [id, req.auth?.empresaId, req.auth?.departamentoId]
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT i.id,i.fondo_id,i.estado,i.tipo_ingreso,f.estado fondo_estado FROM ingresos i JOIN fondos_caja f ON f.id=i.fondo_id WHERE i.id=?${scope} FOR UPDATE`, params,
    )
    const ingreso = rows[0]
    if (!ingreso) { await connection.rollback(); res.status(404).json({ message: 'El ingreso no existe.' }); return }
    if (ingreso.fondo_estado !== 'activo' || ingreso.estado !== 'activo') { await connection.rollback(); res.status(409).json({ message: 'No puede eliminarse información de un fondo cerrado o liquidado.' }); return }
    await registrarAuditoria(connection, { usuarioId: req.auth!.id, accion: 'eliminar', entidad: 'ingreso', entidadId: Number(id), fondoId: Number(ingreso.fondo_id), antes: ingreso })
    await connection.query(
      `DELETE FROM movimientos_caja
       WHERE referencia_tipo = 'ingresos'
       AND referencia_id = ?`,
      [id]
    )

    // Luego eliminar el ingreso
    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM ingresos WHERE id = ?`,
      [id]
    )

    if (result.affectedRows === 0) {
      res.status(404).json({
        message: 'El ingreso no existe.',
      })
      return
    }

    await connection.commit()
    res.json({
      message: 'Ingreso eliminado correctamente.',
    })
  } catch (error) {
    await connection.rollback(); console.error('Error al eliminar ingreso:', error)
    res.status(500).json({ message: 'Error al eliminar el ingreso.' })
  } finally { connection.release() }
}

export const obtenerFondosActivos = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id,mes,anio,monto_inicial,numero_cheque FROM fondos_caja
        WHERE estado='activo' AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL AND (?=1 OR (empresa_id=? AND departamento_id=?))
        ORDER BY anio DESC,mes DESC,id DESC`,
      [req.auth?.esAdministradorGlobal ? 1 : 0, req.auth?.empresaId, req.auth?.departamentoId],
    )
    res.json(rows)
  }
  catch (error) { console.error('Error consultando fondos:', error); res.status(500).json({ message: 'No fue posible cargar los fondos activos.' }) }
}
