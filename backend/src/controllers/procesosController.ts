import { Request, Response } from 'express'
import crypto from 'node:crypto'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import type { PoolConnection } from 'mysql2/promise'
import { db } from '../config/db'

type Tipo = 'arqueo' | 'cierre' | 'liquidacion'
const centavos = (valor: unknown) => Math.round(Number(valor || 0) * 100)
const dinero = (valor: number) => (valor / 100).toFixed(2)
const usuarioSesion = (req: Request) => {
  if (!req.auth?.id) throw new Error('AUTH')
  return req.auth.id
}
const responder = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error de proceso.'
  const status = message === 'AUTH' ? 401 : 400
  res.status(status).json({ message: message === 'AUTH' ? 'Sesión inválida.' : message })
}

const resumen = async (fondoId: number, connection: typeof db | PoolConnection = db, auth?: Request['auth']) => {
  const scope = auth?.esAdministradorGlobal ? ' AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL' : ' AND empresa_id=? AND departamento_id=?'
  const params = auth?.esAdministradorGlobal ? [fondoId] : [fondoId, auth?.empresaId, auth?.departamentoId]
  const [fondos] = await connection.query<RowDataPacket[]>(`SELECT * FROM fondos_caja WHERE id=?${scope}`, params)
  if (!fondos.length) throw new Error('El fondo no existe.')
  const fondo = fondos[0]
  const [ingresos] = await connection.query<RowDataPacket[]>(`SELECT id, monto, tipo_ingreso, fecha FROM ingresos WHERE fondo_id=? AND estado='activo'`, [fondoId])
  const [gastos] = await connection.query<RowDataPacket[]>(`SELECT g.id,g.monto,g.numero_comprobante,g.serie_comprobante,g.fecha_comprobante,g.motivo_gasto,g.estado,tc.nombre tipo_comprobante,p.nombre proveedor,
    COALESCE(tg.tipos_gasto,'Sin categoría') categoria FROM gastos g LEFT JOIN tipos_comprobante tc ON tc.id=g.tipo_comprobante_id LEFT JOIN proveedores p ON p.id=g.proveedor_id
    LEFT JOIN (SELECT gtg.gasto_id,GROUP_CONCAT(t.nombre SEPARATOR ', ') tipos_gasto FROM gasto_tipos_gasto gtg JOIN tipos_gasto t ON t.id=gtg.tipo_gasto_id GROUP BY gtg.gasto_id) tg ON tg.gasto_id=g.id
    WHERE g.fondo_id=? AND g.estado='aprobado'`, [fondoId])
  const [reintegros] = await connection.query<RowDataPacket[]>(`SELECT COALESCE(SUM(r.monto_reembolsado),0) monto FROM reembolsos_gasto r JOIN gastos g ON g.id=r.gasto_id WHERE g.fondo_id=? AND r.estado='procesado'`, [fondoId])
  const montoInicial = centavos(fondo.monto_inicial)
  const asignaciones = ingresos.filter(i => String(i.tipo_ingreso).toLowerCase() === 'asignación inicial' || String(i.tipo_ingreso).toLowerCase() === 'asignacion inicial')
  const asignadoRegistrado = asignaciones.reduce((s, i) => s + centavos(i.monto), 0)
  if (asignaciones.length && asignadoRegistrado !== montoInicial) throw new Error('La asignación inicial registrada no coincide con el monto inicial del fondo.')
  const adicionales = ingresos.filter(i => !asignaciones.includes(i)).reduce((s, i) => s + centavos(i.monto), 0)
  const reintegrosC = centavos(reintegros[0].monto)
  const gastosC = gastos.reduce((s, g) => s + centavos(g.monto), 0)
  const fondoComprobar = montoInicial + adicionales + reintegrosC
  const huella = crypto.createHash('sha256').update(JSON.stringify({ fondo: [fondo.id, fondo.estado, fondo.monto_inicial], ingresos, gastos, reintegros: reintegrosC })).digest('hex')
  return { fondo, ingresos, gastos, montoInicial, adicionales, reintegros: reintegrosC, gastosC, fondoComprobar, saldoLibros: fondoComprobar - gastosC, huella }
}

export const fondos = async (req: Request, res: Response) => {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT id,mes,anio,monto_inicial,numero_cheque,estado FROM fondos_caja WHERE empresa_id IS NOT NULL AND departamento_id IS NOT NULL AND (?=1 OR (empresa_id=? AND departamento_id=?)) ORDER BY anio DESC,mes DESC,id DESC`, [req.auth?.esAdministradorGlobal ? 1 : 0, req.auth?.empresaId, req.auth?.departamentoId])
  res.json(rows)
}
export const obtenerResumen = async (req: Request, res: Response) => { try { res.json(await resumen(Number(req.params.id), db, req.auth)) } catch (e) { responder(res, e) } }

export const guardarArqueo = async (req: Request, res: Response) => {
  let c
  try {
    const usuario = usuarioSesion(req); const { fondo_id, solicitud_id, denominaciones, cuentas_bancarias = 0, comprobantes = [], observaciones = '', lugar = '', responsable = '', departamento = '', auditor = '' } = req.body
    if (!Number.isInteger(fondo_id) || !solicitud_id || String(solicitud_id).length > 36) throw new Error('Datos de arqueo inválidos.')
    if (!Array.isArray(denominaciones) || denominaciones.length !== 12) throw new Error('Debes registrar las doce denominaciones.')
    const validas = [1, 5, 10, 25, 50, 100, 500, 1000, 2000, 5000, 10000, 20000]
    const vistas = new Set<number>(); let efectivo = 0
    for (const d of denominaciones) { const valor = Number(d.centavos); const cantidad = Number(d.cantidad); if (!validas.includes(valor) || vistas.has(valor) || !Number.isInteger(cantidad) || cantidad < 0) throw new Error('Denominaciones o cantidades inválidas.'); vistas.add(valor); efectivo += valor * cantidad }
    const bancos = centavos(cuentas_bancarias); if (bancos < 0 || !Number.isFinite(bancos)) throw new Error('Cuentas bancarias inválidas.')
    c = await db.getConnection(); await c.beginTransaction()
    const [repetidos] = await c.query<RowDataPacket[]>(`SELECT proceso_id FROM procesos_detalles WHERE tipo='arqueo' AND solicitud_id=?`, [solicitud_id]); if (repetidos.length) { await c.rollback(); res.json({ id: repetidos[0].proceso_id, repetido: true }); return }
    await c.query('SELECT id FROM fondos_caja WHERE id=? AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL AND (?=1 OR (empresa_id=? AND departamento_id=?)) FOR UPDATE', [fondo_id,req.auth?.esAdministradorGlobal?1:0,req.auth?.empresaId,req.auth?.departamentoId]); const r = await resumen(fondo_id, c, req.auth)
    if (r.fondo.estado !== 'activo') throw new Error('El fondo no está activo.')
    if (!Array.isArray(comprobantes) || comprobantes.length !== r.gastos.length) throw new Error('Debes verificar todos los comprobantes vigentes.')
    const ids = new Set<number>(); const categorias = ['factura', 'recibo', 'vale', 'liquidacion_tramite']; let totalComp = 0
    for (const item of comprobantes) { const id = Number(item.gasto_id); const gasto = r.gastos.find(g => g.id === id); if (!gasto || ids.has(id) || item.verificado !== true || !categorias.includes(item.categoria)) throw new Error('Comprobantes inválidos o sin verificar.'); ids.add(id); totalComp += centavos(gasto.monto) }
    const totalCaja = efectivo + bancos + totalComp; const diferencia = totalCaja - r.fondoComprobar
    if (diferencia !== 0 && String(observaciones).trim().length < 3) throw new Error('Explica el sobrante o faltante en observaciones.')
    const resultado = diferencia === 0 ? 'cuadre_correcto' : diferencia < 0 ? 'faltante' : 'sobrante'
    const [insert] = await c.query<ResultSetHeader>(`INSERT INTO arqueos (fondo_id,usuario_id,solicitud_id,total_efectivo_fisico,total_comprobantes,total_caja,fondo_esperado,diferencia,resultado,huella_movimientos,observaciones,fecha_arqueo,periodo) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),?)`, [fondo_id, usuario, solicitud_id, dinero(efectivo + bancos), dinero(totalComp), dinero(totalCaja), dinero(r.fondoComprobar), dinero(diferencia), resultado, r.huella, String(observaciones).slice(0, 5000), `${r.fondo.anio}-${String(r.fondo.mes).padStart(2, '0')}`])
    for (const d of denominaciones) await c.query(`INSERT INTO arqueo_denominaciones (arqueo_id,denominacion,tipo,cantidad,subtotal) VALUES (?,?,?,?,?)`, [insert.insertId, dinero(Number(d.centavos)), Number(d.centavos) < 100 ? 'moneda' : 'billete', d.cantidad, dinero(Number(d.centavos) * d.cantidad)])
    for (const item of comprobantes) { const g = r.gastos.find(x => x.id === Number(item.gasto_id)); await c.query(`INSERT INTO arqueo_comprobantes (arqueo_id,gasto_id,categoria,monto_verificado,verificado) VALUES (?,?,?,?,1)`, [insert.insertId, g!.id, item.categoria, g!.monto]) }
    const datos = { lugar, responsable, departamento, auditor, cuentas_bancarias: dinero(bancos), denominaciones, comprobantes, resumen: r }
    await c.query(`INSERT INTO procesos_detalles (tipo,proceso_id,fondo_id,usuario_id,solicitud_id,huella_movimientos,datos_json) VALUES ('arqueo',?,?,?,?,?,?)`, [insert.insertId, fondo_id, usuario, solicitud_id, r.huella, JSON.stringify(datos)])
    await c.commit(); res.status(201).json({ id: insert.insertId, resultado, diferencia: dinero(diferencia) })
  } catch (e) { if (c) await c.rollback(); responder(res, e) } finally { c?.release() }
}

export const guardarCierre = async (req: Request, res: Response) => {
  let c
  try {
    const usuario = usuarioSesion(req); const { fondo_id, solicitud_id, observaciones = '' } = req.body
    if (!Number.isInteger(fondo_id) || !solicitud_id) throw new Error('Datos de cierre inválidos.')
    c = await db.getConnection(); await c.beginTransaction()
    const [existente] = await c.query<RowDataPacket[]>(`SELECT proceso_id FROM procesos_detalles WHERE tipo='cierre' AND solicitud_id=?`, [solicitud_id]); if (existente.length) { await c.rollback(); res.json({ id: existente[0].proceso_id, repetido: true }); return }
    await c.query('SELECT id FROM fondos_caja WHERE id=? AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL AND (?=1 OR (empresa_id=? AND departamento_id=?)) FOR UPDATE', [fondo_id,req.auth?.esAdministradorGlobal?1:0,req.auth?.empresaId,req.auth?.departamentoId]); const r = await resumen(fondo_id, c, req.auth)
    if (r.fondo.estado !== 'activo') throw new Error('El fondo no está activo.')
    const [arqueos] = await c.query<RowDataPacket[]>(`SELECT * FROM arqueos WHERE fondo_id=? ORDER BY fecha_arqueo DESC,id DESC LIMIT 1`, [fondo_id]); if (!arqueos.length) throw new Error('Debes guardar un arqueo antes de cerrar.')
    const a = arqueos[0]; if (centavos(a.diferencia) !== 0) throw new Error('No se puede cerrar un fondo con diferencia de arqueo.')
    if (a.huella_movimientos !== r.huella) throw new Error('Los movimientos cambiaron después del arqueo.')
    const [reservas] = await c.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM reservas WHERE fondo_id=? AND estado='activa'`, [fondo_id]); if (reservas[0].total) throw new Error('Existen reservas activas.')
    if (r.saldoLibros < 0) throw new Error('El saldo contable es negativo.')
    const [cierres] = await c.query<RowDataPacket[]>(`SELECT id FROM cierres WHERE fondo_id=? AND estado='cerrado'`, [fondo_id]); if (cierres.length) throw new Error('Ya existe un cierre vigente.')
    const [insert] = await c.query<ResultSetHeader>(`INSERT INTO cierres (fondo_id,usuario_id,arqueo_id,solicitud_id,fondo_inicial,total_ingresos,total_egresos,total_gastado,total_reservas,efectivo_fisico,comprobantes_monto,diferencia,saldo_final,observaciones,estado,huella_movimientos,fecha_cierre) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'cerrado',?,NOW())`, [fondo_id,usuario,a.id,solicitud_id,dinero(r.montoInicial),dinero(r.adicionales+r.reintegros),dinero(r.gastosC),dinero(r.gastosC),'0.00',a.total_efectivo_fisico,a.total_comprobantes,a.diferencia,dinero(r.saldoLibros),String(observaciones).slice(0,5000),r.huella])
    await c.query(`UPDATE fondos_caja SET estado='cerrado' WHERE id=?`, [fondo_id])
    await c.query(`INSERT INTO procesos_detalles (tipo,proceso_id,fondo_id,usuario_id,solicitud_id,huella_movimientos,datos_json) VALUES ('cierre',?,?,?,?,?,?)`, [insert.insertId,fondo_id,usuario,solicitud_id,r.huella,JSON.stringify({ resumen:r, arqueo_id:a.id, observaciones })])
    await c.commit(); res.status(201).json({ id:insert.insertId, saldo_final:dinero(r.saldoLibros) })
  } catch(e) { if(c) await c.rollback(); responder(res,e) } finally { c?.release() }
}

export const guardarLiquidacion = async (req: Request, res: Response) => {
  let c
  try {
    const usuario=usuarioSesion(req); const { fondo_id,solicitud_id,monto_remanente,receptor_nombre,comprobante_entrega,observaciones='' }=req.body
    if (!Number.isInteger(fondo_id)||!solicitud_id||!String(receptor_nombre).trim()||!String(comprobante_entrega).trim()) throw new Error('Completa los datos de liquidación.')
    c=await db.getConnection(); await c.beginTransaction(); const [dup]=await c.query<RowDataPacket[]>(`SELECT proceso_id FROM procesos_detalles WHERE tipo='liquidacion' AND solicitud_id=?`,[solicitud_id]); if(dup.length){await c.rollback();res.json({id:dup[0].proceso_id,repetido:true});return}
    await c.query('SELECT id FROM fondos_caja WHERE id=? AND empresa_id IS NOT NULL AND departamento_id IS NOT NULL AND (?=1 OR (empresa_id=? AND departamento_id=?)) FOR UPDATE',[fondo_id,req.auth?.esAdministradorGlobal?1:0,req.auth?.empresaId,req.auth?.departamentoId]); const r=await resumen(fondo_id,c,req.auth); if(r.fondo.estado!=='cerrado') throw new Error('El fondo debe estar cerrado.')
    const [cs]=await c.query<RowDataPacket[]>(`SELECT * FROM cierres WHERE fondo_id=? AND estado='cerrado' ORDER BY fecha_cierre DESC LIMIT 1`,[fondo_id]); if(!cs.length) throw new Error('No existe un cierre válido.'); const cierre=cs[0]
    if(cierre.huella_movimientos!==r.huella) throw new Error('Los movimientos cambiaron después del cierre.'); if(centavos(monto_remanente)!==centavos(cierre.saldo_final)) throw new Error('El remanente debe coincidir exactamente con el saldo del cierre.')
    const [ya]=await c.query<RowDataPacket[]>(`SELECT id FROM liquidaciones WHERE fondo_id=? AND estado='liquidado'`,[fondo_id]);if(ya.length)throw new Error('El fondo ya fue liquidado.')
    const [insert]=await c.query<ResultSetHeader>(`INSERT INTO liquidaciones (fondo_id,usuario_id,cierre_id,solicitud_id,receptor_nombre,comprobante_entrega,observaciones_finales,periodo,fondo_monto,total_gastos,total_ingresos,total_reintegros,saldo_remanente,diferencia,estado,huella_movimientos,fecha_liquidacion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'liquidado',?,NOW())`,[fondo_id,usuario,cierre.id,solicitud_id,String(receptor_nombre).slice(0,150),String(comprobante_entrega).slice(0,100),String(observaciones).slice(0,5000),`${r.fondo.anio}-${String(r.fondo.mes).padStart(2,'0')}`,dinero(r.montoInicial),dinero(r.gastosC),dinero(r.adicionales),dinero(r.reintegros),cierre.saldo_final,'0.00',r.huella])
    await c.query(`UPDATE fondos_caja SET estado='liquidado' WHERE id=?`,[fondo_id]);await c.query(`INSERT INTO procesos_detalles (tipo,proceso_id,fondo_id,usuario_id,solicitud_id,huella_movimientos,datos_json) VALUES ('liquidacion',?,?,?,?,?,?)`,[insert.insertId,fondo_id,usuario,solicitud_id,r.huella,JSON.stringify({cierre, receptor_nombre,comprobante_entrega,observaciones})]);await c.commit();res.status(201).json({id:insert.insertId})
  }catch(e){if(c)await c.rollback();responder(res,e)}finally{c?.release()}
}

export const historial = async (req: Request, res: Response) => {
  try {
    const tipo = req.params.tipo as Tipo
    if (!['arqueo', 'cierre', 'liquidacion'].includes(tipo)) throw new Error('Tipo inválido.')
    const page = Math.max(1, Number(req.query.page) || 1)
    const fondo = Number(req.query.fondo_id) || 0
    const scope = req.auth?.esAdministradorGlobal ? ' AND f.empresa_id IS NOT NULL AND f.departamento_id IS NOT NULL' : ' AND f.empresa_id=? AND f.departamento_id=?'
    const baseParams: Array<string | number | null> = [tipo]
    if (fondo) baseParams.push(fondo)
    if (!req.auth?.esAdministradorGlobal) baseParams.push(req.auth?.empresaId || null, req.auth?.departamentoId || null)
    const filtroFondo = fondo ? ' AND pd.fondo_id=?' : ''
    const [rows] = await db.query<RowDataPacket[]>(`SELECT pd.proceso_id id,pd.fondo_id,pd.creado_en,pd.datos_json,pd.huella_movimientos,u.nombre_completo usuario FROM procesos_detalles pd JOIN fondos_caja f ON f.id=pd.fondo_id LEFT JOIN usuarios u ON u.id=pd.usuario_id WHERE pd.tipo=?${filtroFondo}${scope} ORDER BY pd.creado_en DESC LIMIT 20 OFFSET ?`, [...baseParams, (page - 1) * 20])
    const [count] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM procesos_detalles pd JOIN fondos_caja f ON f.id=pd.fondo_id WHERE pd.tipo=?${filtroFondo}${scope}`, baseParams)
    res.json({ rows, page, total: Number(count[0].total) })
  } catch (e) { responder(res, e) }
}

export const detalle = async (req: Request, res: Response) => {
  try {
    const tipo = req.params.tipo as Tipo
    if (!['arqueo', 'cierre', 'liquidacion'].includes(tipo)) throw new Error('Tipo inválido.')
    const scope = req.auth?.esAdministradorGlobal ? ' AND f.empresa_id IS NOT NULL AND f.departamento_id IS NOT NULL' : ' AND f.empresa_id=? AND f.departamento_id=?'
    const params = req.auth?.esAdministradorGlobal
      ? [tipo, Number(req.params.id)]
      : [tipo, Number(req.params.id), req.auth?.empresaId, req.auth?.departamentoId]
    const [rows] = await db.query<RowDataPacket[]>(`SELECT pd.* FROM procesos_detalles pd JOIN fondos_caja f ON f.id=pd.fondo_id WHERE pd.tipo=? AND pd.proceso_id=?${scope} LIMIT 1`, params)
    if (!rows.length) throw new Error('Detalle no disponible.')
    res.json(rows[0])
  } catch (e) { responder(res, e) }
}
