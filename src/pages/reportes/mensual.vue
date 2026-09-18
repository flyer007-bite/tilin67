<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Mes', key: 'periodo' }, { title: 'Cantidad de gastos', key: 'total_gastos', align: 'end' }, { title: 'Monto total', key: 'monto_total', align: 'end' }]
</script>
<template><ReporteTabla titulo="Reporte Mensual" descripcion="Total de gastos agrupado por mes." endpoint="mensual" :headers="headers" /></template>
