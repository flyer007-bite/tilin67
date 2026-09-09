
import mysql from 'mysql2/promise'

export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: 'caja_chica_db',
  port: Number(process.env.DB_PORT) || 8889,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

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




