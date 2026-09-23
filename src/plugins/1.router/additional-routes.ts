import type { RouteRecordRaw } from 'vue-router/auto'

export const redirects: RouteRecordRaw[] = [
  { path: '/', name: 'index', redirect: () => ({ name: 'dashboards-crm' }) },
]

export const routes: RouteRecordRaw[] = []
