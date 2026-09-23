import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router'
import { $api, clearClientSession } from '@/utils/api'

interface Rule { action: string; subject: string }
const productPrefixes = ['/dashboards/crm', '/gastos', '/ingresos', '/consulta-facturas', '/parametros/', '/reportes/', '/procesos/', '/notificaciones', '/seguridad/']

const requirement = (path: string): Rule | null => {
  if (path === '/dashboards/crm') return { action: 'ver', subject: 'dashboard' }
  if (path === '/gastos') return { action: 'ver', subject: 'gastos' }
  if (path === '/consulta-facturas') return { action: 'ver', subject: 'consulta' }
  if (path === '/ingresos') return { action: 'ver', subject: 'ingresos' }
  if (path === '/parametros/proveedores') return { action: 'ver', subject: 'proveedores' }
  if (path === '/parametros/tipos-gasto') return { action: 'ver', subject: 'tipos_gasto' }
  if (path === '/parametros/comprobantes') return { action: 'ver', subject: 'tipos_comprobante' }
  if (path.startsWith('/reportes/')) return { action: 'ver', subject: 'reportes' }
  if (path.includes('historial-arqueos')) return { action: 'ver', subject: 'arqueos' }
  if (path.includes('historial-cierres')) return { action: 'ver', subject: 'cierres' }
  if (path === '/procesos/arqueo') return { action: 'ver', subject: 'arqueos' }
  if (path === '/procesos/cierre') return { action: 'ver', subject: 'cierres' }
  if (path === '/procesos/liquidacion') return { action: 'ver', subject: 'liquidaciones' }
  if (path === '/notificaciones') return { action: 'ver', subject: 'notificaciones' }
  if (path.startsWith('/seguridad/')) return { action: 'ver', subject: path.split('/')[2] || '' }
  return null
}

const allowed = (required: Rule, rules: Rule[]) => rules.some(rule =>
  (rule.subject === required.subject || rule.subject === 'all')
  && (rule.action === required.action || rule.action === 'manage'),
)

export const setupGuards = (router: _RouterTyped<RouteNamedMap & { [key: string]: any }>) => {
  router.beforeEach(async to => {
    if (to.meta.public && !to.meta.unauthenticatedOnly) return

    let session: any = null
    try { session = await $api('/auth/me') }
    catch { clearClientSession() }

    if (to.meta.unauthenticatedOnly)
      return session ? '/' : undefined

    if (!session) return { name: 'login', query: { to: to.fullPath !== '/' ? to.fullPath : undefined } }

    useCookie('userData').value = session.userData
    useCookie('userAbilityRules').value = session.userAbilityRules

    if (to.path !== '/' && !productPrefixes.some(prefix => prefix.endsWith('/') ? to.path.startsWith(prefix) : to.path === prefix))
      return { name: 'not-authorized' }

    const required = requirement(to.path)
    if (required && !allowed(required, session.userAbilityRules || [])) return { name: 'not-authorized' }
  })
}
