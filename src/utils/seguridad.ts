import { $api } from './api'

export const apiSeguridad = <T = any>(ruta: string, opciones: Record<string, any> = {}) =>
  $api<T>(`/seguridad${ruta}`, opciones)
