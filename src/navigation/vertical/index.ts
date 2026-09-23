import type { VerticalNavItems } from '@layouts/types'

export default [
  {
    title: 'Dashboard',
    to: { name: 'index' },
    icon: { icon: 'tabler-smart-home' },
    action: 'ver', subject: 'dashboard',
  },

  {
    title: 'Parámetros',
    icon: { icon: 'tabler-settings' },
    children: [
      {
        title: 'Tipos de Gasto',
        to: { name: 'parametros-tipos-gasto' }, // <- Nombre correcto auto-generado
        icon: { icon: 'tabler-category' },
        action: 'ver', subject: 'tipos_gasto',
      },
      {
        title: 'Proveedores',
        to: { name: 'parametros-proveedores' },
        icon: { icon: 'tabler-building-store' },
        action: 'ver', subject: 'proveedores',
      },
      {
        title: 'Tipos de Comprobante',
        to: { name: 'parametros-comprobantes' },
        icon: { icon: 'tabler-file-invoice' },
        action: 'ver', subject: 'tipos_comprobante',
      },
    ],
  },

  {
    title: 'Ingresos',
    to: { name: 'ingresos' },
    icon: { icon: 'tabler-square-plus' },
    action: 'ver', subject: 'ingresos',
  },

  {
    title: 'Gastos',
    to: { name: 'gastos' },
    icon: { icon: 'tabler-receipt' },
    action: 'ver', subject: 'gastos',
  },

  {
    title: 'Consulta',
    to: { name: 'consulta-facturas' },
    icon: { icon: 'tabler-search' },
    action: 'ver', subject: 'consulta',
  },

  {
    title: 'Reportería',
    icon: { icon: 'tabler-report-analytics' },
    children: [
      {
        title: 'Reporte de Gastos',
        to: { name: 'reportes-gastos' },
        icon: { icon: 'tabler-report-money' },
        action: 'ver', subject: 'reportes',
      },
      {
        title: 'Reporte por Persona',
        to: { name: 'reportes-persona' },
        icon: { icon: 'tabler-user' },
        action: 'ver', subject: 'reportes',
      },
      {
        title: 'Reporte por Proveedor',
        to: { name: 'reportes-proveedor' },
        icon: { icon: 'tabler-truck' },
        action: 'ver', subject: 'reportes',
      },
      {
        title: 'Reporte por Tipo de Gasto',
        to: { name: 'reportes-tipo-gasto' },
        icon: { icon: 'tabler-tags' },
        action: 'ver', subject: 'reportes',
      },
      {
        title: 'Reporte Semanal',
        to: { name: 'reportes-semanal' },
        icon: { icon: 'tabler-calendar-week' },
        action: 'ver', subject: 'reportes',
      },
      {
        title: 'Reporte Mensual',
        to: { name: 'reportes-mensual' },
        icon: { icon: 'tabler-calendar-month' },
        action: 'ver', subject: 'reportes',
      },
      {
        title: 'Ingresos y Egresos',
        to: { name: 'reportes-ingresos-egresos' },
        icon: { icon: 'tabler-arrows-exchange' },
        action: 'ver', subject: 'reportes',
      },
    ],
  },

  {
    title: 'Procesos',
    icon: { icon: 'tabler-refresh' },
    children: [
      {
        title: 'Arqueo de Caja',
        to: { name: 'procesos-arqueo' },
        icon: { icon: 'tabler-cash' },
        action: 'ver', subject: 'arqueos',
      },
      {
        title: 'Cierre de Caja',
        to: { name: 'procesos-cierre' },
        icon: { icon: 'tabler-lock' },
        action: 'ver', subject: 'cierres',
      },
      {
        title: 'Liquidación',
        to: { name: 'procesos-liquidacion' },
        icon: { icon: 'tabler-file-check' },
        action: 'ver', subject: 'liquidaciones',
      },
      {
        title: 'Historial de Cierres',
        to: { name: 'procesos-historial-cierres' },
        icon: { icon: 'tabler-history' },
        action: 'ver', subject: 'cierres',
      },
      {
        title: 'Historial de Arqueos',
        to: { name: 'procesos-historial-arqueos' },
        icon: { icon: 'tabler-clipboard-data' },
        action: 'ver', subject: 'arqueos',
      },
    ],
  },

  {
    title: 'Notificaciones',
    to: { name: 'notificaciones' },
    icon: { icon: 'tabler-bell' },
    action: 'ver', subject: 'notificaciones',
  },

  {
    title: 'Seguridad',
    icon: { icon: 'tabler-shield-lock' },
    children: [
      {
        title: 'Usuarios',
        to: { name: 'seguridad-usuarios' },
        icon: { icon: 'tabler-users' },
        action: 'ver', subject: 'usuarios',
      },
      {
        title: 'Roles',
        to: { name: 'seguridad-roles' },
        icon: { icon: 'tabler-user-shield' },
        action: 'ver', subject: 'roles',
      },
      {
        title: 'Permisos',
        to: { name: 'seguridad-permisos' },
        icon: { icon: 'tabler-key' },
        action: 'ver', subject: 'permisos',
      },
    ],
  },
] as VerticalNavItems
