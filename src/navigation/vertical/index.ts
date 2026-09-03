import type { VerticalNavItems } from '@layouts/types'

export default [
  {
    title: 'Dashboard',
    to: { name: 'index' },
    icon: { icon: 'tabler-smart-home' },
  },

  {
    title: 'Parámetros',
    icon: { icon: 'tabler-settings' },
    children: [
      {
        title: 'Tipos de Gasto',
        to: { name: 'parametros-tipos-gasto' }, // <- Nombre correcto auto-generado
      },
      {
        title: 'Proveedores',
        to: { name: 'parametros-proveedores' },
      },
      {
        title: 'Tipos de Comprobante',
        to: { name: 'parametros-comprobantes' },
      },
    ],
  },

  {
    title: 'Ingresos',
    to: { name: 'ingresos' },
    icon: { icon: 'tabler-square-plus' },
  },

  {
    title: 'Gastos',
    to: { name: 'gastos' },
    icon: { icon: 'tabler-receipt' },
  },

  {
    title: 'Consulta',
    to: { name: 'consulta-facturas' },
    icon: { icon: 'tabler-search' },
  },

  {
    title: 'Reportería',
    icon: { icon: 'tabler-report-analytics' },
    children: [
      {
        title: 'Reporte de Gastos',
        to: { name: 'reportes-gastos' },
      },
      {
        title: 'Reporte por Persona',
        to: { name: 'reportes-persona' },
      },
      {
        title: 'Reporte por Proveedor',
        to: { name: 'reportes-proveedor' },
      },
      {
        title: 'Reporte por Tipo de Gasto',
        to: { name: 'reportes-tipo-gasto' },
      },
      {
        title: 'Reporte Semanal',
        to: { name: 'reportes-semanal' },
      },
      {
        title: 'Reporte Mensual',
        to: { name: 'reportes-mensual' },
      },
      {
        title: 'Ingresos y Egresos',
        to: { name: 'reportes-ingresos-egresos' },
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
      },
      {
        title: 'Cierre de Caja',
        to: { name: 'procesos-cierre' },
      },
      {
        title: 'Liquidación',
        to: { name: 'procesos-liquidacion' },
      },
      {
        title: 'Historial de Cierres',
        to: { name: 'procesos-historial-cierres' },
      },
      {
        title: 'Historial de Arqueos',
        to: { name: 'procesos-historial-arqueos' },
      },
    ],
  },

  {
    title: 'Notificaciones',
    to: { name: 'notificaciones' },
    icon: { icon: 'tabler-bell' },
  },

  {
    title: 'Seguridad',
    icon: { icon: 'tabler-shield-lock' },
    children: [
      {
        title: 'Usuarios',
        to: { name: 'seguridad-usuarios' },
      },
      {
        title: 'Roles',
        to: { name: 'seguridad-roles' },
      },
      {
        title: 'Permisos',
        to: { name: 'seguridad-permisos' },
      },
    ],
  },
] as VerticalNavItems
