import type { Request, Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import db from '../config/db'

const isDuplicateEntry = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY'

// Obtener todos los tipos de comprobante activos
exports.getTiposComprobante = async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, nombre, requiere_nit, estado, creado_en, actualizado_en FROM tipos_comprobante WHERE estado = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener tipos de comprobante:', error);
    res.status(500).json({ mensaje: 'Error al obtener los tipos de comprobante' });
  }
};

// Obtener un tipo de comprobante por ID
exports.getTipoComprobanteById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, nombre, requiere_nit, estado, creado_en, actualizado_en FROM tipos_comprobante WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Tipo de comprobante no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener el tipo de comprobante:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Crear un nuevo tipo de comprobante
exports.createTipoComprobante = async (req: Request, res: Response) => {
  const { nombre, requiere_nit } = req.body;

  if (!nombre) {
    return res.status(400).json({ mensaje: 'El campo "nombre" es obligatorio' });
  }

  try {
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO tipos_comprobante (nombre, requiere_nit) VALUES (?, ?)',
      [nombre, requiere_nit !== undefined ? requiere_nit : 1]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      requiere_nit: requiere_nit !== undefined ? requiere_nit : 1,
      mensaje: 'Tipo de comprobante creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear tipo de comprobante:', error);

    // Manejo de entrada duplicada si ya existe el nombre
    if (isDuplicateEntry(error)) {
      return res.status(400).json({ mensaje: 'Ya existe un tipo de comprobante con ese nombre' });
    }

    res.status(500).json({ mensaje: 'Error al registrar el tipo de comprobante' });
  }
};

// Actualizar un tipo de comprobante
exports.updateTipoComprobante = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, requiere_nit, estado } = req.body;

  try {
    const [result] = await db.query<ResultSetHeader>(
      'UPDATE tipos_comprobante SET nombre = ?, requiere_nit = ?, estado = ? WHERE id = ?',
      [nombre, requiere_nit, estado !== undefined ? estado : 1, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Tipo de comprobante no encontrado' });
    }

    res.json({ mensaje: 'Tipo de comprobante actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar tipo de comprobante:', error);

    if (isDuplicateEntry(error)) {
      return res.status(400).json({ mensaje: 'Ya existe un tipo de comprobante con ese nombre' });
    }

    res.status(500).json({ mensaje: 'Error al actualizar el tipo de comprobante' });
  }
};

// Desactivar / Eliminar (Borrado lógico cambiando estado a 0)
exports.deleteTipoComprobante = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [result] = await db.query<ResultSetHeader>(
      'UPDATE tipos_comprobante SET estado = 0 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Tipo de comprobante no encontrado' });
    }

    res.json({ mensaje: 'Tipo de comprobante desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar tipo de comprobante:', error);
    res.status(500).json({ mensaje: 'Error al desactivar el tipo de comprobante' });
  }
};
