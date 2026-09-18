<script setup lang="ts">
import ReporteTabla from '@/components/caja-chica/ReporteTabla.vue'

const headers = [
  { title: 'Tipo de gasto', key: 'tipo_gasto' },
  { title: 'Cantidad de gastos', key: 'total_gastos', align: 'end' as const },
  { title: 'Monto total', key: 'monto_total', align: 'end' as const },
]
</script>

<template>
  <ReporteTabla
    titulo="Reporte por Tipo de Gasto"
    descripcion="Resumen de gastos por categoría."
    endpoint="tipo-gasto"
    :headers="headers"
  />
</template>
