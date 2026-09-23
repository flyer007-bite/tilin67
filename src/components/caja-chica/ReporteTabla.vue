<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

type Header = { title: string; key: string; align?: 'start' | 'end' | 'center' }

const props = defineProps<{
  titulo: string
  descripcion: string
  endpoint: string
  headers: Header[]
}>()

const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const busqueda = ref('')
const actualizadoEn = ref<Date | null>(null)
const monetaryKeys = new Set(['monto', 'monto_total', 'total_ingresos', 'total_egresos', 'balance'])
const iconos: Record<string, string> = {
  gastos: 'tabler-receipt-2',
  semanal: 'tabler-calendar-week',
  mensual: 'tabler-calendar-month',
  persona: 'tabler-users',
  proveedor: 'tabler-building-store',
  'tipo-gasto': 'tabler-category-2',
  'ingresos-egresos': 'tabler-arrows-exchange',
}
const icono = computed(() => iconos[props.endpoint] || 'tabler-report-analytics')
const esBalance = computed(() => props.endpoint === 'ingresos-egresos')
const totalMonto = computed(() => rows.value.reduce((total, item) => total + Number(item.monto_total ?? item.monto ?? 0), 0))
const totalIngresos = computed(() => rows.value.reduce((total, item) => total + Number(item.total_ingresos ?? 0), 0))
const totalEgresos = computed(() => rows.value.reduce((total, item) => total + Number(item.total_egresos ?? 0), 0))
const totalOperaciones = computed(() => rows.value.reduce((total, item) => total + Number(item.total_gastos ?? 0), 0))
const textoActualizacion = computed(() => actualizadoEn.value
  ? actualizadoEn.value.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
  : 'Pendiente')

const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    rows.value = await $api<Record<string, unknown>[]>(`/reportes/${props.endpoint}`)
    actualizadoEn.value = new Date()
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || 'No se pudo conectar con el servidor de reportes.'
  }
  finally {
    loading.value = false
  }
}

const moneda = (valor: unknown) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
}).format(Number(valor || 0))

const valorExcel = (item: Record<string, unknown>, key: string) => {
  const valor = item[key]
  return monetaryKeys.has(key) ? Number(valor || 0) : String(valor ?? '')
}

const valorPdf = (item: Record<string, unknown>, key: string) =>
  monetaryKeys.has(key) ? moneda(item[key]) : String(item[key] ?? '')

const nombreArchivo = () => props.titulo.replaceAll(' ', '_').replace(/[^\p{L}\p{N}_-]/gu, '')

const exportarExcel = async () => {
  if (!rows.value.length || exporting.value) return
  exporting.value = true
  error.value = ''
  try {
    const XLSX = await import('xlsx')
    const datos = rows.value.map(item => Object.fromEntries(props.headers.map(header => [header.title, valorExcel(item, header.key)])))
    const hoja = XLSX.utils.json_to_sheet(datos)

    props.headers.forEach((header, colIndex) => {
      if (!monetaryKeys.has(header.key)) return
      for (let rowIndex = 2; rowIndex <= datos.length + 1; rowIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex - 1, c: colIndex })
        if (hoja[address] && hoja[address].t === 'n') hoja[address].z = '"Q"#,##0.00'
      }
    })

    hoja['!cols'] = props.headers.map((header, colIndex) => ({
      wch: Math.min(45, Math.max(header.title.length + 2, ...datos.map(row => String(Object.values(row)[colIndex] ?? '').length + 2))),
    }))
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')
    XLSX.writeFile(libro, `${nombreArchivo()}.xlsx`)
  }
  catch (e: any) {
    error.value = e?.message || 'No fue posible exportar el archivo Excel.'
  }
  finally {
    exporting.value = false
  }
}

const exportarPDF = async () => {
  if (!rows.value.length || exporting.value) return
  exporting.value = true
  error.value = ''
  try {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const documento = new jsPDF({ orientation: 'landscape' })
    const emitidoEn = new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeStyle: 'medium' }).format(new Date())
    documento.setFontSize(18)
    documento.text(props.titulo, 14, 18)
    documento.setFontSize(10)
    documento.text('Sistema de Control y Administración de Caja Chica', 14, 25)
    documento.text(`Emitido: ${emitidoEn}`, 14, 31)
    autoTable(documento, {
      startY: 37,
      head: [props.headers.map(header => header.title)],
      body: rows.value.map(item => props.headers.map(header => valorPdf(item, header.key))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [178, 132, 16], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 247, 241] },
      margin: { left: 14, right: 14 },
    })
    documento.save(`${nombreArchivo()}.pdf`)
  }
  catch (e: any) {
    error.value = e?.message || 'No fue posible exportar el archivo PDF.'
  }
  finally {
    exporting.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="report-page">
    <section class="page-hero report-hero d-flex align-center justify-space-between ga-4 mb-6">
      <div class="d-flex align-center ga-4">
        <VAvatar color="primary" variant="tonal" rounded size="60"><VIcon :icon="icono" size="31" /></VAvatar>
        <div>
          <div class="process-kicker">Centro de reportería</div>
          <h1 class="text-h4 font-weight-bold mb-1">{{ titulo }}</h1>
          <p class="text-body-1 text-medium-emphasis mb-0">{{ descripcion }}</p>
        </div>
      </div>
      <VBtn prepend-icon="tabler-refresh" size="large" variant="tonal" :loading="loading" :disabled="exporting" @click="cargar">Actualizar</VBtn>
    </section>

    <VRow class="mb-3">
      <VCol cols="12" sm="6" lg="3">
        <div class="report-stat"><VAvatar color="primary" variant="tonal" rounded><VIcon icon="tabler-list-details" /></VAvatar><div><span>Filas del reporte</span><strong>{{ rows.length }}</strong></div></div>
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <div class="report-stat"><VAvatar color="info" variant="tonal" rounded><VIcon icon="tabler-receipt" /></VAvatar><div><span>Operaciones</span><strong>{{ totalOperaciones || rows.length }}</strong></div></div>
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <div class="report-stat report-stat--accent"><VAvatar color="success" variant="tonal" rounded><VIcon icon="tabler-cash" /></VAvatar><div><span>{{ esBalance ? 'Ingresos acumulados' : 'Monto acumulado' }}</span><strong>{{ moneda(esBalance ? totalIngresos : totalMonto) }}</strong></div></div>
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <div class="report-stat"><VAvatar :color="esBalance ? 'error' : 'secondary'" variant="tonal" rounded><VIcon :icon="esBalance ? 'tabler-arrow-up-right' : 'tabler-clock-check'" /></VAvatar><div><span>{{ esBalance ? 'Egresos acumulados' : 'Actualizado' }}</span><strong>{{ esBalance ? moneda(totalEgresos) : textoActualizacion }}</strong></div></div>
      </VCol>
    </VRow>

    <VCard class="report-card module-card">
      <VCardItem class="module-header">
        <VCardTitle><VIcon icon="tabler-table" class="me-2" />Detalle del reporte</VCardTitle>
        <VCardSubtitle>Información consolidada y lista para exportar</VCardSubtitle>
        <template #append><VChip color="success" variant="tonal" size="small"><VIcon start icon="tabler-circle-check" />Datos actualizados</VChip></template>
      </VCardItem>

    <VCardText class="pa-6">
      <VAlert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">{{ error }}</VAlert>
      <div class="report-toolbar d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
        <VTextField v-model="busqueda" prepend-inner-icon="tabler-search" label="Buscar en el reporte" clearable hide-details class="report-search" />
        <div class="d-flex ga-2 flex-wrap">
          <VBtn prepend-icon="tabler-file-spreadsheet" color="success" variant="tonal" :loading="exporting" :disabled="!rows.length || exporting" @click="exportarExcel">Exportar Excel</VBtn>
          <VBtn prepend-icon="tabler-file-type-pdf" color="error" variant="tonal" :disabled="!rows.length || exporting" @click="exportarPDF">Exportar PDF</VBtn>
        </div>
      </div>
      <VDataTable :headers="headers" :items="rows" :loading="loading" :search="busqueda" class="product-table text-no-wrap">
        <template #item.monto="{ item }"><strong>{{ moneda(item.monto) }}</strong></template>
        <template #item.monto_total="{ item }"><strong>{{ moneda(item.monto_total) }}</strong></template>
        <template #item.total_ingresos="{ item }"><span class="text-success font-weight-bold">{{ moneda(item.total_ingresos) }}</span></template>
        <template #item.total_egresos="{ item }"><span class="text-error font-weight-bold">{{ moneda(item.total_egresos) }}</span></template>
        <template #item.balance="{ item }"><strong>{{ moneda(item.balance) }}</strong></template>
        <template #item.estado="{ item }"><VChip size="small" :color="String(item.estado).toLowerCase() === 'activo' ? 'success' : 'secondary'" variant="tonal">{{ item.estado }}</VChip></template>
        <template #no-data><div class="process-empty py-12"><VIcon icon="tabler-report-off" size="48" color="primary" /><strong>No hay información disponible</strong><span>Actualiza el reporte o revisa los movimientos registrados.</span></div></template>
      </VDataTable>
    </VCardText>
    </VCard>
  </div>
</template>
