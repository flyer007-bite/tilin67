<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Persona', key: 'persona' }, { title: 'Cantidad de gastos', key: 'total_gastos', align: 'end' }, { title: 'Monto total', key: 'monto_total', align: 'end' }]
</script>
<template><ReporteTabla titulo="Reporte por Persona" descripcion="Gastos agrupados por la persona que los realizó." endpoint="persona" :headers="headers" /></template>
