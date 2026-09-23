import { $api } from './api'

export const apiProcesos = <T = any>(ruta: string, opciones: Record<string, any> = {}) =>
  $api<T>(`/procesos${ruta}`, opciones)

export const solicitudId = () => crypto.randomUUID()
