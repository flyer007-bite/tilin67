<script setup lang="ts">
import { ref } from 'vue'
import { $api } from '@/utils/api'

type Gasto = {
  id: number
  fecha_comprobante: string
  serie_comprobante?: string
  numero_comprobante: string
  proveedor_nombre?: string
  proveedor_nit?: string
  tipos_gasto?: string
  monto: number
  estado: string
}

const numero = ref('')
const serie = ref('')
const resultados = ref<Gasto[]>([])
const loading = ref(false)
const error = ref('')

const headers = [
  { title: 'Fecha', key: 'fecha_comprobante' },
  { title: 'Serie', key: 'serie_comprobante' },
  { title: 'Factura', key: 'numero_comprobante' },
  { title: 'Proveedor', key: 'proveedor_nombre' },
  { title: 'NIT', key: 'proveedor_nit' },
  { title: 'Tipo de gasto', key: 'tipos_gasto' },
  { title: 'Monto', key: 'monto', align: 'end' as const },
  { title: 'Estado', key: 'estado' },
]

const buscar = async () => {
  error.value = ''
  const numeroBuscado = numero.value.trim()
  const serieBuscada = serie.value.trim()
  if (!numeroBuscado && !serieBuscada) {
    resultados.value = []
    error.value = 'Ingresa al menos el número o la serie del comprobante para realizar la búsqueda.'
    return
  }

  loading.value = true
  try {
    const params = new URLSearchParams()
    if (numeroBuscado) params.set('numero_comprobante', numeroBuscado)
    if (serieBuscada) params.set('serie_comprobante', serieBuscada)
    resultados.value = await $api<Gasto[]>(`/gastos?${params}`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'No se pudo realizar la consulta de facturas.'
  } finally {
    loading.value = false
  }
}

const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor || 0))
const fecha = (valor: string) => valor ? new Date(`${valor.slice(0, 10)}T00:00:00`).toLocaleDateString('es-GT') : ''
</script>

<template>
  <div class="admin-page">
    <section class="page-hero admin-hero d-flex align-center ga-4 mb-6"><VAvatar color="primary" variant="tonal" rounded size="58"><VIcon icon="tabler-file-search" size="30" /></VAvatar><div><div class="process-kicker">Consulta documental</div><h1 class="text-h4 font-weight-bold mb-1">Consulta de Facturas</h1><p class="text-medium-emphasis mb-0">Localiza y verifica comprobantes registrados en Caja Chica.</p></div></section>
    <VCard class="module-card mb-6">
      <VCardItem class="module-header"><VCardTitle><VIcon icon="tabler-adjustments-search" class="me-2" />Criterios de búsqueda</VCardTitle><VCardSubtitle>Ingresa al menos uno de los datos del comprobante</VCardSubtitle></VCardItem>
      <VCardText class="pa-6">
      <VForm @submit.prevent="buscar">
        <VRow align="center">
          <VCol cols="12" md="5"><VTextField v-model="numero" label="Número de factura" prepend-inner-icon="tabler-hash" clearable hide-details /></VCol>
          <VCol cols="12" md="4"><VTextField v-model="serie" label="Serie (opcional)" prepend-inner-icon="tabler-barcode" clearable hide-details /></VCol>
          <VCol cols="12" md="3"><VBtn block size="large" type="submit" color="primary" :loading="loading" prepend-icon="tabler-search">Consultar</VBtn></VCol>
        </VRow>
      </VForm>
      </VCardText>
    </VCard>
    <VCard class="module-card"><VCardItem class="module-header"><VCardTitle>Resultados</VCardTitle><template #append><VChip color="primary" variant="tonal">{{ resultados.length }} encontrados</VChip></template></VCardItem><VCardText class="pa-6">
      <VAlert v-if="error" type="error" variant="tonal" class="my-4">{{ error }}</VAlert>
      <VDataTable :headers="headers" :items="resultados" :loading="loading" class="product-table text-no-wrap">
        <template #item.fecha_comprobante="{ item }">{{ fecha(item.fecha_comprobante) }}</template>
        <template #item.monto="{ item }"><strong>{{ moneda(item.monto) }}</strong></template>
        <template #item.estado="{ item }"><VChip size="small" :color="item.estado === 'Activo' ? 'success' : 'secondary'" variant="tonal">{{ item.estado }}</VChip></template>
        <template #no-data><div class="process-empty py-10"><VIcon icon="tabler-file-invoice" size="46" color="primary"/><strong>Realiza una consulta</strong><span>Los comprobantes coincidentes aparecerán aquí.</span></div></template>
      </VDataTable>
    </VCardText>
    </VCard>
  </div>
</template>
