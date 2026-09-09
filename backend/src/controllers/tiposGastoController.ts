import { Request, Response } from 'express';
import { pool } from '../config/db';

// Obtener los tipos de gasto
export const getTiposGasto = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tipos_gasto ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los tipos de gasto', error });
  }
};

// Crear un nuevo tipo de gasto
export const createTipoGasto = async (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO tipos_gasto (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );
    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el tipo de gasto', error });
  }
};
