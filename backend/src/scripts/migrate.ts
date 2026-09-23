import { db, testDatabaseConnection } from '../config/db'
import { ensureDatabaseSchema, validateDatabaseSchema } from '../config/schema'

const main = async () => {
  await testDatabaseConnection()
  await ensureDatabaseSchema()
  const missing = await validateDatabaseSchema()
  if (missing.length) throw new Error(`El esquema sigue incompleto: ${missing.join(', ')}`)
  console.log('Migración aditiva completada; no se eliminaron columnas ni datos.')
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }).finally(() => db.end())
