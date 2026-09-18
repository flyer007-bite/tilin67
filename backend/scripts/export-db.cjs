const fs = require('node:fs')
const path = require('node:path')
const mysql = require('mysql2/promise')

const dbName = process.env.DB_NAME || 'caja_chica_db'
const output = path.resolve(process.cwd(), 'backups', `${dbName}_2026-09-18.sql`)

const escapeValue = value => {
  if (value === null || value === undefined) return 'NULL'
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\u0000/g, '\\0').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u001a/g, '\\Z')}'`
}

;(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 8889,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: dbName,
  })

  const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"')
  const tableKey = `Tables_in_${dbName}`
  const lines = [
    '-- Respaldo completo de Caja Chica',
    '-- Generado el 2026-09-18',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE \`${dbName}\`;`,
    '',
  ]

  for (const item of tables) {
    const table = item[tableKey]
    const [[definition]] = await connection.query(`SHOW CREATE TABLE \`${table}\``)
    const createSql = definition['Create Table']
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``)

    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`, `${createSql};`, '')
    if (rows.length) {
      const columns = Object.keys(rows[0]).map(column => `\`${column}\``).join(', ')
      for (const row of rows)
        lines.push(`INSERT INTO \`${table}\` (${columns}) VALUES (${Object.values(row).map(escapeValue).join(', ')});`)
      lines.push('')
    }
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;', '')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, lines.join('\n'), 'utf8')
  await connection.end()
  console.log(output)
})().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
