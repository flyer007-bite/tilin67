import 'dotenv/config'

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'] as const

for (const key of required) {
  if (!process.env[key]?.trim())
    throw new Error(`Falta la variable de entorno obligatoria ${key}.`)
}

if (process.env.JWT_SECRET!.length < 32)
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.')

const positivePort = (value: string | undefined, fallback: number, name: string) => {
  const port = Number(value || fallback)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`${name} no es válido.`)
  return port
}

const businessTimezone = process.env.BUSINESS_TIMEZONE?.trim() || 'America/Guatemala'
try {
  new Intl.DateTimeFormat('en-US', { timeZone: businessTimezone }).format(new Date())
}
catch {
  throw new Error('BUSINESS_TIMEZONE no es una zona horaria IANA válida.')
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: positivePort(process.env.PORT, 4000, 'PORT'),
  dbHost: process.env.DB_HOST!,
  dbPort: positivePort(process.env.DB_PORT, 3306, 'DB_PORT'),
  dbUser: process.env.DB_USER!,
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME!,
  jwtSecret: process.env.JWT_SECRET!,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(value => value.trim()).filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE == null
    ? process.env.NODE_ENV === 'production'
    : process.env.COOKIE_SECURE === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
  businessTimezone,
  autoMigrate: process.env.DB_AUTO_MIGRATE == null
    ? process.env.NODE_ENV !== 'production'
    : process.env.DB_AUTO_MIGRATE === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
}
