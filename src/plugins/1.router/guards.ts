import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router'
import { canNavigate } from '@layouts/plugins/casl'

export const setupGuards = (router: _RouterTyped<RouteNamedMap & { [key: string]: any }>) => {
  // 👉 router.beforeEach
  // Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
  router.beforeEach(to => {
    /*
     * If it's a public route, continue navigation. This kind of pages are allowed to visited by login & non-login users. Basically, without any restrictions.
     * Examples of public routes are, 404, under maintenance, etc.
     */
    if (to.meta.public)
      return

    /**
     * Check if user is logged in by checking if token & user data exists in local storage
     * Feel free to update this logic to suit your needs
     */
    const isLoggedIn = !!(useCookie('userData').value && useCookie('accessToken').value)
    const userRole = String((useCookie<Record<string, unknown> | null>('userData').value?.role || '')).toLowerCase()
    const abilityRules = useCookie<unknown>('userAbilityRules').value
    const isAdministrator = ['admin', 'administrador'].includes(userRole) || userRole.endsWith(' - administrador')
    const isOperator = userRole === 'operador caja chica' || userRole.endsWith(' - usuario')
    const isConsultant = userRole.endsWith(' - consultor')

    // Rol limitado: únicamente los módulos solicitados para el operador.
    if (isLoggedIn && isOperator) {
      const allowedPaths = [
        '/dashboards/crm', '/parametros/', '/ingresos', '/gastos', '/reportes/',
        '/procesos/arqueo', '/procesos/cierre', '/procesos/liquidacion',
      ]
      if (to.path !== '/' && !allowedPaths.some(path => to.path.startsWith(path)))
        return { name: 'not-authorized' }
    }

    // El consultor solo puede usar los paneles de consulta y reportes.
    if (isLoggedIn && isConsultant) {
      const allowedPaths = ['/dashboards/crm', '/consulta', '/reportes/']
      if (to.path !== '/' && !allowedPaths.some(path => to.path.startsWith(path)))
        return { name: 'not-authorized' }
    }

    /*
      If user is logged in and is trying to access login like page, redirect to home
      else allow visiting the page
      (WARN: Don't allow executing further by return statement because next code will check for permissions)
     */
    if (to.meta.unauthenticatedOnly) {
      if (isLoggedIn)
        return '/'
      else
        return undefined
    }

    // Ninguna pantalla interna se debe poder abrir sin una sesión válida.
    // Los permisos se validan más abajo, pero primero se exige autenticación.
    if (!isLoggedIn) {
      return {
        name: 'login',
        query: { to: to.fullPath !== '/' ? to.fullPath : undefined },
      }
    }

    // Un usuario autenticado sin permisos no puede aprovechar una ruta que
    // todavía no tenga ACL declarada. El administrador es la única excepción.
    if (!isAdministrator && (!Array.isArray(abilityRules) || abilityRules.length === 0) && to.name !== 'not-authorized')
      return { name: 'not-authorized' }

    // Las páginas de Caja Chica no definen ACL individual. En ese caso la
    // autenticación basta; solo evaluamos CASL cuando una ruta pide permiso.
    const requiresAbility = to.matched.some(route => route.meta.action && route.meta.subject)

    if (requiresAbility && !canNavigate(to) && to.matched.length) {
      /* eslint-disable indent */
      return isLoggedIn
        ? { name: 'not-authorized' }
        : {
            name: 'login',
            query: {
              ...to.query,
              to: to.fullPath !== '/' ? to.path : undefined,
            },
          }
      /* eslint-enable indent */
    }
  })
}
