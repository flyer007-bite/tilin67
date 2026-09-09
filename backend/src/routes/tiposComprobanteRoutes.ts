import { Router } from 'express'
import { db } from '../config/db'

const router = Router()

// GET: Obtener todos los tipos de comprobante
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tipos_comprobante ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error('Error GET tipos_comprobante:', error)
    res.status(500).json({ message: 'Error al consultar los tipos de comprobante' })
  }
})

// POST: Crear nuevo tipo de comprobante
router.post('/', async (req, res) => {
  const { nombre, descripcion } = req.body

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre es obligatorio' })
  }

  try {
    const [result]: any = await db.query(
      'INSERT INTO tipos_comprobante (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || '']
    )

    res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion
    })
  } catch (error) {
    console.error('Error POST tipos_comprobante:', error)
    res.status(500).json({ message: 'Error al guardar el registro' })
  }
})

// DELETE: Eliminar tipo de comprobante por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const [result]: any = await db.query(
      'DELETE FROM tipos_comprobante WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'El registro no existe' })
    }

    res.json({ message: 'Registro eliminado correctamente' })
  } catch (error) {
    console.error('Error DELETE tipos_comprobante:', error)
    res.status(500).json({ message: 'Error al eliminar el registro' })
  }
})

export default router
