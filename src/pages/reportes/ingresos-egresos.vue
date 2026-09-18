<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'
const headers = [{ title: 'Mes', key: 'periodo' }, { title: 'Ingresos', key: 'total_ingresos', align: 'end' }, { title: 'Egresos', key: 'total_egresos', align: 'end' }, { title: 'Balance', key: 'balance', align: 'end' }]
</script>
<template><ReporteTabla titulo="Ingresos y Egresos" descripcion="Balance mensual de movimientos de caja chica." endpoint="ingresos-egresos" :headers="headers" /></template>
