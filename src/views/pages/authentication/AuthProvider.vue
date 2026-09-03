```ts
import type { VerticalNavItems } from '@layouts/types'

export default [
  // =========================
  // DASHBOARD
  // =========================
  {
    title: 'Dashboard',
    to: '/',
    icon: { icon: 'tabler-smart-home' },
  },

  // =========================
  // PARÁMETROS
  // =========================
  {
    title: 'Parámetros',
    icon: { icon: 'tabler-settings' },
    children: [
      {
        title: 'Tipos de Gasto',
        to: '/parametros/tipos-gasto',
      },
      {
        title: 'Proveedores',
        to: '/parametros/proveedores',
      },
      {
        title: 'Tipos de Comprobante',
        to: '/parametros/comprobantes',
      },
    ],
  },

  // =========================
  // INGRESOS
  // =========================
  {
    title: 'Ingresos',
    to: '/ingresos',
    icon: { icon: 'tabler-square-plus' },
  },

  // =========================
  // GASTOS
  // =========================
  {
    title: 'Gastos',
    to: '/gastos',
    icon: { icon: 'tabler-receipt' },
  },

  // =========================
  // CONSULTA
  // =========================
  {
    title: 'Consulta',
    to: '/consulta-facturas',
    icon: { icon: 'tabler-search' },
  },

  // =========================
  // REPORTERÍA
  // =========================
  {
    title: 'Reportería',
    icon: { icon: 'tabler-report-analytics' },
    children: [
      {
        title: 'Reporte de Gastos',
        to: '/reportes/gastos',
      },
      {
        title: 'Reporte por Persona',
        to: '/reportes/persona',
      },
      {
        title: 'Reporte por Proveedor',
        to: '/reportes/proveedor',
      },
      {
        title: 'Reporte por Tipo de Gasto',
        to: '/reportes/tipo-gasto',
      },
      {
        title: 'Reporte Semanal',
        to: '/reportes/semanal',
      },
      {
        title: 'Reporte Mensual',
        to: '/reportes/mensual',
      },
      {
        title: 'Ingresos y Egresos',
        to: '/reportes/ingresos-egresos',
      },
    ],
  },

  // =========================
  // PROCESOS
  // =========================
  {
    title: 'Procesos',
    icon: { icon: 'tabler-refresh' },
    children: [
      {
        title: 'Arqueo de Caja',
        to: '/procesos/arqueo',
      },
      {
        title: 'Cierre de Caja',
        to: '/procesos/cierre',
      },
      {
        title: 'Liquidación',
        to: '/procesos/liquidacion',
      },
      {
        title: 'Historial de Cierres',
        to: '/procesos/historial-cierres',
      },
      {
        title: 'Historial de Arqueos',
        to: '/procesos/historial-arqueos',
      },
    ],
  },

  // =========================
  // NOTIFICACIONES
  // =========================
  {
    title: 'Notificaciones',
    to: '/notificaciones',
    icon: { icon: 'tabler-bell' },
  },

  // =========================
  // SEGURIDAD
  // =========================
  {
    title: 'Seguridad',
    icon: { icon: 'tabler-shield-lock' },
    children: [
      {
        title: 'Usuarios',
        to: '/seguridad/usuarios',
      },
      {
        title: 'Roles',
        to: '/seguridad/roles',
      },
      {
        title: 'Permisos',
        to: '/seguridad/permisos',
      },
    ],
  },
] as VerticalNavItems
```
