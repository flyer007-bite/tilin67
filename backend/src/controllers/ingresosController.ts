
import { Request, Response } from 'express'
import { db } from '../config/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { idPositivo, montoValido, textoSeguro } from '../utils/validacion'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware'

export const crearIngreso = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const {
    fondo_id,
    usuario_id,
    monto,
    tipo_ingreso,
    descripcion,
    documento_asociado_url,
    observaciones,
  } = req.body

  const fondoId = idPositivo(fondo_id)
  // La autoría del ingreso siempre es la del usuario autenticado.
  const usuarioId = req.user?.id
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

  try {
    // Crear ingreso
    const [ingresoResult] = await db.query<ResultSetHeader>(
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
    await db.query(
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
        fondo_id,
        ingresoId,
        `Ingreso: ${tipoIngreso} - ${descripcionSegura}`,
        montoSeguro,
        usuarioId,
      ]
    )

    res.status(201).json({
      message: 'Ingreso registrado correctamente',
      id: ingresoId,
    })
  } catch (error: any) {
    console.error('❌ ERROR AL CREAR INGRESO:', error)

    res.status(500).json({
      message: 'Error al guardar el ingreso.',
      detalles: error.sqlMessage || error.message,
    })
  }
}

export const obtenerIngresos = async (
  _req: Request,
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
       ORDER BY fecha DESC, id DESC`
    )

    res.json(rows)
  } catch (error: any) {
    console.error('❌ ERROR AL OBTENER INGRESOS:', error)

    res.status(500).json({
      message: 'Error al consultar los ingresos.',
      detalles: error.sqlMessage || error.message,
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

  try {
    // Primero eliminar el movimiento relacionado
    await db.query(
      `DELETE FROM movimientos_caja
       WHERE referencia_tipo = 'ingresos'
       AND referencia_id = ?`,
      [id]
    )

    // Luego eliminar el ingreso
    const [result] = await db.query<ResultSetHeader>(
      `DELETE FROM ingresos WHERE id = ?`,
      [id]
    )

    if (result.affectedRows === 0) {
      res.status(404).json({
        message: 'El ingreso no existe.',
      })
      return
    }

    res.json({
      message: 'Ingreso eliminado correctamente.',
    })
  } catch (error: any) {
    console.error('❌ ERROR AL ELIMINAR INGRESO:', error)

    res.status(500).json({
      message: 'Error al eliminar el ingreso.',
      detalles: error.sqlMessage || error.message,
    })
  }
}
