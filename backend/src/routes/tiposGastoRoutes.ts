import { Router } from 'express'
import { db } from '../config/db'
import { requerirAutenticacion, requerirPermiso } from '../middlewares/auth.middleware'

const router = Router()
router.use(requerirAutenticacion)

// GET: Obtener todos los tipos de gasto
router.get('/', requerirPermiso('tipos_gasto', 'ver'), async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tipos_gasto ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error('Error GET tipos_gasto:', error)
    res.status(500).json({ message: 'Error al obtener registros' })
  }
})

// POST: Crear un nuevo tipo de gasto
router.post('/', requerirPermiso('tipos_gasto', 'crear'), async (req, res) => {
  const { nombre, descripcion } = req.body

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre es obligatorio' })
  }

  try {
    const [result]: any = await db.query(
      'INSERT INTO tipos_gasto (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || '']
    )

    res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion
    })
  } catch (error) {
    console.error('Error POST tipos_gasto:', error)
    res.status(500).json({ message: 'Error al guardar en la base de datos' })
  }
})

// DELETE: Eliminar un tipo de gasto por ID
router.delete('/:id', requerirPermiso('tipos_gasto', 'eliminar'), async (req, res) => {
  const { id } = req.params

  try {
    const [result]: any = await db.query(
      'DELETE FROM tipos_gasto WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'El registro no existe' })
    }

    res.json({ message: 'Registro eliminado correctamente' })
  } catch (error) {
    console.error('Error DELETE tipos_gasto:', error)
    res.status(500).json({ message: 'Error al eliminar el registro en la base de datos' })
  }
})

export default router
