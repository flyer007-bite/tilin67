import type { RouteRecordRaw } from 'vue-router/auto'

const emailRouteComponent = () => import('@/pages/apps/email/index.vue')

export const redirects: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'index',
    redirect: to => {
      const userData = useCookie<Record<string, unknown> | null | undefined>('userData')
      const accessToken = useCookie('accessToken').value || localStorage.getItem('accessToken')

      if (!accessToken || !userData.value)
        return { name: 'login', query: to.query }

      const userRole = userData.value?.role

      if (userRole === 'admin' || userRole === 'administrador')
        return { name: 'dashboards-crm' }
      if (userRole === 'operador caja chica')
        return { name: 'dashboards-crm' }
      if (userRole === 'client')
        return { name: 'access-control' }

      // Un usuario autenticado no debe volver al login solo porque su rol
      // tenga un nombre distinto a los roles del template.
      return { name: 'dashboards-crm' }
    },
  },
  {
    path: '/pages/user-profile',
    name: 'pages-user-profile',
    redirect: () => ({ name: 'pages-user-profile-tab', params: { tab: 'profile' } }),
  },
  {
    path: '/pages/account-settings',
    name: 'pages-account-settings',
    redirect: () => ({ name: 'pages-account-settings-tab', params: { tab: 'account' } }),
  },
]

export const routes: RouteRecordRaw[] = [
  {
    path: '/apps/email/filter/:filter',
    name: 'apps-email-filter',
    component: emailRouteComponent,
    meta: {
      navActiveLink: 'apps-email',
      layoutWrapperClasses: 'layout-content-height-fixed',
    },
  },
  {
    path: '/apps/email/label/:label',
    name: 'apps-email-label',
    component: emailRouteComponent,
    meta: {
      navActiveLink: 'apps-email',
      layoutWrapperClasses: 'layout-content-height-fixed',
    },
  },
  {
    path: '/dashboards/logistics',
    name: 'dashboards-logistics',
    component: () => import('@/pages/apps/logistics/dashboard.vue'),
  },
  {
    path: '/dashboards/academy',
    name: 'dashboards-academy',
    component: () => import('@/pages/apps/academy/dashboard.vue'),
  },
  {
    path: '/apps/ecommerce/dashboard',
    name: 'apps-ecommerce-dashboard',
    component: () => import('@/pages/dashboards/ecommerce.vue'),
  },
]
