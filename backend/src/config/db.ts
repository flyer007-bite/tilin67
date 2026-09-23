
import 'dotenv/config'
import mysql from 'mysql2/promise'
import { env } from './env'

const pool = mysql.createPool({
  host: env.dbHost,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  port: env.dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: false,
})

// Se mantienen ambas formas de importación usadas por los controladores existentes.
export { pool }
export const db = pool
export default pool

export const testDatabaseConnection = async () => {
  const connection = await db.getConnection()
  try {
    await connection.ping()
  }
  finally {
    connection.release()
  }
}
