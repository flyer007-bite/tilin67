export const textoSeguro = (valor: unknown, maximo: number): string | null => {
  if (typeof valor !== 'string') return null

  const texto = valor.trim().replace(/\s+/g, ' ')

  return texto.length > 0 && texto.length <= maximo ? texto : null
}

export const idPositivo = (valor: unknown): number | null => {
  const numero = typeof valor === 'number' ? valor : Number(valor)

  return Number.isSafeInteger(numero) && numero > 0 ? numero : null
}

// Caja Chica trabaja con quetzales y dos decimales como máximo.
export const montoValido = (valor: unknown): number | null => {
  const numero = typeof valor === 'number' ? valor : Number(valor)

  if (!Number.isFinite(numero) || numero <= 0 || numero > 99_999_999.99)
    return null

  const centavos = Math.round(numero * 100)

  return Math.abs(numero * 100 - centavos) < 0.000001 ? centavos / 100 : null
}

export const fechaValida = (valor: unknown): string | null => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null

  const fecha = new Date(`${valor}T00:00:00Z`)

  return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor ? null : valor
}
