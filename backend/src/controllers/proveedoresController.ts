
import { Request, Response } from 'express'
import pool from '../config/db'

// Obtener la lista de proveedores
export const getProveedores = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM proveedores ORDER BY id DESC'
    )

    res.json(rows)
  } catch (error) {
    console.error('Error GET proveedores:', error)

    res.status(500).json({
      message: 'Error al obtener proveedores',
      error,
    })
  }
}

// Crear un proveedor
export const createProveedor = async (req: Request, res: Response) => {
  const { nombre, nit, telefono } = req.body

  try {
    const [result]: any = await pool.query(
      'INSERT INTO proveedores (nombre, nit, telefono) VALUES (?, ?, ?)',
      [nombre, nit, telefono]
    )

    res.status(201).json({
      id: result.insertId,
      nombre,
      nit,
      telefono,
    })
  } catch (error) {
    console.error('Error POST proveedores:', error)

    res.status(500).json({
      message: 'Error al registrar proveedor',
      error,
    })
  }
}

// Eliminar un proveedor
export const deleteProveedor = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    await pool.query(
      'DELETE FROM proveedores WHERE id = ?',
      [id]
    )

    res.json({
      message: 'Proveedor eliminado correctamente',
    })
  } catch (error) {
    console.error('Error DELETE proveedores:', error)

    res.status(500).json({
      message: 'Error al eliminar proveedor',
      error,
    })
  }
}
