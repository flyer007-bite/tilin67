<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Fecha', key: 'fecha' }, { title: 'Comprobante', key: 'comprobante' }, { title: 'Proveedor', key: 'proveedor' }, { title: 'Persona', key: 'persona' }, { title: 'Tipo', key: 'tipo_gasto' }, { title: 'Monto', key: 'monto', align: 'end' as const }, { title: 'Estado', key: 'estado' }]
</script>
<template><ReporteTabla titulo="Reporte de Gastos" descripcion="Detalle de todos los gastos registrados." endpoint="gastos" :headers="headers" /></template>
