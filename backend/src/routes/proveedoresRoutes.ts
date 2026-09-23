import { Router } from 'express'
import { db } from '../config/db'
import { requerirAutenticacion, requerirPermiso } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

// GET: Obtener todos los proveedores
router.get('/', requerirPermiso('proveedores', 'ver'), async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM proveedores ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error('Error GET proveedores:', error)
    res.status(500).json({ message: 'Error al consultar los proveedores' })
  }
})

// POST: Crear un nuevo proveedor
router.post('/', requerirPermiso('proveedores', 'crear'), async (req, res) => {
  const { nombre, nit, telefono, direccion } = req.body

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del proveedor es obligatorio' })
  }

  try {
    const [result]: any = await db.query(
      'INSERT INTO proveedores (nombre, nit, telefono, direccion) VALUES (?, ?, ?, ?)',
      [nombre, nit || '', telefono || '', direccion || '']
    )

    res.status(201).json({
      id: result.insertId,
      nombre,
      nit,
      telefono,
      direccion
    })
  } catch (error) {
    console.error('Error POST proveedores:', error)
    res.status(500).json({ message: 'Error al guardar el proveedor' })
  }
})

// DELETE: Eliminar un proveedor por ID
router.delete('/:id', requerirPermiso('proveedores', 'eliminar'), async (req, res) => {
  const { id } = req.params

  try {
    const [result]: any = await db.query(
      'DELETE FROM proveedores WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'El proveedor no existe' })
    }

    res.json({ message: 'Proveedor eliminado correctamente' })
  } catch (error) {
    console.error('Error DELETE proveedores:', error)
    res.status(500).json({ message: 'Error al eliminar el proveedor' })
  }
})

export default router
