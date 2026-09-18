import { Request, Response } from 'express'

const fechaLocal = (fecha: Date) => fecha.toISOString().slice(0, 10)

const proximaFecha = (condicion: (fecha: Date) => boolean): string => {
  const fecha = new Date()
  fecha.setHours(0, 0, 0, 0)
  for (let dias = 0; dias <= 370; dias++) {
    const candidata = new Date(fecha)
    candidata.setDate(fecha.getDate() + dias)
    if (condicion(candidata)) return fechaLocal(candidata)
  }
  return fechaLocal(fecha)
}

export const obtenerNotificaciones = (_req: Request, res: Response): void => {
  const hoy = new Date()
  const dia = hoy.getDate()
  const esRevision = dia === 10 || dia === 20 || dia === 30
  const esCheque = dia === 1

  res.json({
    fecha: fechaLocal(hoy),
    notificaciones: [
      {
        id: 'revision-caja',
        titulo: 'Revisión de Caja Chica',
        mensaje: 'Corresponde realizar la revisión periódica de Caja Chica.',
        tipo: 'warning',
        activa: esRevision,
        proxima_fecha: proximaFecha(fecha => [10, 20, 30].includes(fecha.getDate())),
      },
      {
        id: 'cheque-recepcion',
        titulo: 'Recoger cheque en recepción',
        mensaje: 'Corresponde pasar a recepción a recoger el cheque mensual.',
        tipo: 'info',
        activa: esCheque,
        proxima_fecha: proximaFecha(fecha => fecha.getDate() === 1),
      },
    ],
  })
}
