<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Semana', key: 'semana' }, { title: 'Cantidad de gastos', key: 'total_gastos', align: 'end' }, { title: 'Monto total', key: 'monto_total', align: 'end' }]
</script>
<template><ReporteTabla titulo="Reporte Semanal" descripcion="Total de gastos agrupado por semana." endpoint="semanal" :headers="headers" /></template>
