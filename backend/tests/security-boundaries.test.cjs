const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const source = relative => readFileSync(join(__dirname, '..', 'src', relative), 'utf8')

test('los reportes aplican alcance por fondo y organización', () => {
  const text = source('controllers/reportesController.ts')
  assert.match(text, /fondos_caja WHERE empresa_id=\? AND departamento_id=\?/)
  assert.match(text, /fondosIniciales \+ ingresos - egresos/)
  assert.match(text, /g\.\$\{alcance\}/)
  assert.match(text, /req\.auth\?\.esAdministradorGlobal/)
})

test('historial y detalle de procesos validan el fondo de la organización', () => {
  const text = source('controllers/procesosController.ts')
  const protectedJoins = text.match(/JOIN fondos_caja f ON f\.id=pd\.fondo_id/g) || []
  assert.ok(protectedJoins.length >= 2)
  assert.match(text, /f\.empresa_id=\? AND f\.departamento_id=\?/)
})

test('usuarios y roles se filtran por empresa y departamento', () => {
  const text = source('controllers/seguridadController.ts')
  assert.match(text, /AND \$\{alias\}\.empresa_id=\? AND \$\{alias\}\.departamento_id=\?/)
  assert.match(text, /El rol no pertenece a la organización seleccionada/)
  assert.match(text, /No puedes cambiar tu propio rol u organización/)
})

test('los catálogos usan permisos RBAC explícitos', () => {
  const proveedores = source('routes/proveedoresRoutes.ts')
  const gastos = source('routes/tiposGastoRoutes.ts')
  const comprobantes = source('routes/tiposComprobanteRoutes.ts')
  assert.doesNotMatch(`${proveedores}${gastos}${comprobantes}`, /bloquearConsultor|requerirAdministrador/)
  assert.match(proveedores, /requerirPermiso\('proveedores', 'crear'\)/)
  assert.match(gastos, /requerirPermiso\('tipos_gasto', 'eliminar'\)/)
  assert.match(comprobantes, /requerirPermiso\('tipos_comprobante', 'ver'\)/)
})

test('el formulario de gastos dispone de catálogos con alcance organizacional', () => {
  const routes = source('routes/gastosRoutes.ts')
  const controller = source('controllers/gastosController.ts')
  assert.match(routes, /router\.get\('\/catalogos', requerirPermiso\('gastos', 'ver'\), obtenerCatalogosGasto\)/)
  assert.match(controller, /estado='activo' AND \$\{organizationSql\}/)
})
