<script setup lang="ts">
import { onMounted, ref } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type Header = { title: string; key: string; align?: 'start' | 'end' | 'center' }

const props = defineProps<{
  titulo: string
  descripcion: string
  endpoint: string
  headers: Header[]
}>()

const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const error = ref('')

const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`http://localhost:4000/api/reportes/${props.endpoint}`)
    if (!response.ok)
      throw new Error('No fue posible cargar los datos.')

    rows.value = await response.json()
  } catch {
    error.value = 'No se pudo conectar con el servidor de reportes.'
  } finally {
    loading.value = false
  }
}

const moneda = (valor: unknown) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
}).format(Number(valor || 0))

const valorExportable = (item: Record<string, unknown>, key: string) => {
  const valor = item[key]
  return ['monto', 'monto_total', 'total_ingresos', 'total_egresos', 'balance'].includes(key)
    ? moneda(valor)
    : String(valor ?? '')
}

const exportarExcel = () => {
  const datos = rows.value.map(item => Object.fromEntries(props.headers.map(header => [header.title, valorExportable(item, header.key)])))
  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')
  XLSX.writeFile(libro, `${props.titulo.replaceAll(' ', '_')}.xlsx`)
}

const exportarPDF = () => {
  const documento = new jsPDF({ orientation: 'landscape' })
  const emitidoEn = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'long',
    timeStyle: 'medium',
  }).format(new Date())
  documento.setFontSize(18)
  documento.text(props.titulo, 14, 18)
  documento.setFontSize(10)
  documento.text('Departamento de Sistemas', 14, 25)
  documento.text(`Emitido: ${emitidoEn}`, 14, 31)
  autoTable(documento, {
    startY: 37,
    head: [props.headers.map(header => header.title)],
    body: rows.value.map(item => props.headers.map(header => valorExportable(item, header.key))),
    styles: { fontSize: 8 },
  })
  documento.save(`${props.titulo.replaceAll(' ', '_')}.pdf`)
}

onMounted(cargar)
</script>

<template>
  <VCard>
    <VCardItem>
      <template #append>
        <div class="d-flex ga-1">
          <VBtn prepend-icon="ri-file-excel-2-line" size="small" variant="tonal" :disabled="!rows.length" @click="exportarExcel">Excel</VBtn>
          <VBtn prepend-icon="ri-file-pdf-2-line" size="small" variant="tonal" :disabled="!rows.length" @click="exportarPDF">PDF</VBtn>
          <VBtn icon="ri-refresh-line" variant="text" :loading="loading" @click="cargar" />
        </div>
      </template>
      <VCardTitle>{{ titulo }}</VCardTitle>
      <VCardSubtitle>{{ descripcion }}</VCardSubtitle>
    </VCardItem>

    <VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</VAlert>
      <VDataTable :headers="headers" :items="rows" :loading="loading" class="text-no-wrap">
        <template #item.monto="{ item }"><strong>{{ moneda(item.monto) }}</strong></template>
        <template #item.monto_total="{ item }"><strong>{{ moneda(item.monto_total) }}</strong></template>
        <template #item.total_ingresos="{ item }"><span class="text-success">{{ moneda(item.total_ingresos) }}</span></template>
        <template #item.total_egresos="{ item }"><span class="text-error">{{ moneda(item.total_egresos) }}</span></template>
        <template #item.balance="{ item }"><strong>{{ moneda(item.balance) }}</strong></template>
        <template #no-data>No hay registros para mostrar.</template>
      </VDataTable>
    </VCardText>
  </VCard>
</template>
