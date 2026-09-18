
import 'dotenv/config'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'caja_chica_db',
  port: Number(process.env.DB_PORT) || 8889,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Se mantienen ambas formas de importación usadas por los controladores existentes.
export { pool }
export const db = pool
export default pool

export const testDatabaseConnection = async () => {
  try {
    const connection = await db.getConnection()

    console.log(
      '✅ Conexión exitosa a la base de datos MySQL (caja_chica_db)'
    )

    connection.release()
  } catch (error) {
    console.error(
      '❌ Error al conectar a la base de datos MySQL:',
      error
    )
  }
}
