<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Mes', key: 'periodo' }, { title: 'Ingresos', key: 'total_ingresos', align: 'end' as const }, { title: 'Egresos', key: 'total_egresos', align: 'end' as const }, { title: 'Balance', key: 'balance', align: 'end' as const }]
</script>
<template><ReporteTabla titulo="Ingresos y Egresos" descripcion="Balance mensual de movimientos de caja chica." endpoint="ingresos-egresos" :headers="headers" /></template>
