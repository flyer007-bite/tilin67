<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Proveedor', key: 'proveedor' }, { title: 'NIT', key: 'nit' }, { title: 'Cantidad de gastos', key: 'total_gastos', align: 'end' }, { title: 'Monto total', key: 'monto_total', align: 'end' }]
</script>
<template><ReporteTabla titulo="Reporte por Proveedor" descripcion="Gastos agrupados por proveedor." endpoint="proveedor" :headers="headers" /></template>
