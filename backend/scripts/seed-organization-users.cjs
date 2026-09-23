/* Crea una cuenta Administrador, Usuario y Consultor para cada departamento.
 * Es idempotente: volver a ejecutarlo no duplica usuarios existentes.
 */
require('dotenv').config()
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')

const password = process.env.DEFAULT_USER_PASSWORD
if (!password || password.length < 12 || password.length > 72) {
  console.error('DEFAULT_USER_PASSWORD es obligatoria y debe tener entre 12 y 72 caracteres.')
  process.exit(1)
}

const slug = value => String(value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  })

  try {
    await db.beginTransaction()
    const [departamentos] = await db.query(`
      SELECT e.id AS empresa_id, e.nombre AS empresa, d.id AS departamento_id, d.nombre AS departamento
      FROM empresas e JOIN departamentos d ON d.empresa_id = e.id
      WHERE e.estado = 1 AND d.estado = 1
      ORDER BY e.id, d.nombre`)
    const hash = await bcrypt.hash(password, 10)
    let created = 0
    let existing = 0

    for (const departamento of departamentos) {
      for (const [roleLabel, emailPrefix, displayName] of [
        ['Administrador', 'admin', 'Administrador'],
        ['Usuario', 'user', 'Usuario'],
        ['Consultor', 'consultor', 'Consultor'],
      ]) {
        const roleName = `${departamento.empresa_id} - ${departamento.departamento} - ${roleLabel}`
        const email = `${emailPrefix}.${slug(departamento.departamento)}.${String(departamento.empresa_id).toLowerCase()}@cajachica.com`
        const [roles] = await db.query('SELECT id FROM roles WHERE nombre = ? AND empresa_id = ? AND departamento_id = ? LIMIT 1', [roleName, departamento.empresa_id, departamento.departamento_id])
        if (!roles.length) throw new Error(`No existe el rol: ${roleName}`)

        const [users] = await db.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email])
        if (users.length) {
          existing++
          continue
        }

        await db.query(
          'INSERT INTO usuarios (rol_id, empresa_id, departamento_id, nombre_completo, email, password) VALUES (?, ?, ?, ?, ?, ?)',
          [roles[0].id, departamento.empresa_id, departamento.departamento_id, `${displayName} ${departamento.empresa_id} - ${departamento.departamento}`, email, hash],
        )
        created++
      }
    }
    await db.commit()
    console.log(`Cuentas creadas: ${created}. Ya existentes: ${existing}.`)
  } catch (error) {
    await db.rollback()
    throw error
  } finally {
    await db.end()
  }
}

main().catch(error => { console.error(error.message); process.exit(1) })
