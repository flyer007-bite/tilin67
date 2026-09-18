<script setup lang="ts">
import { ref } from 'vue'

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
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (numero.value.trim()) params.set('numero_comprobante', numero.value.trim())
    if (serie.value.trim()) params.set('serie_comprobante', serie.value.trim())
    const response = await fetch(`http://localhost:4000/api/gastos?${params}`)
    if (!response.ok) throw new Error()
    resultados.value = await response.json()
  } catch {
    error.value = 'No se pudo realizar la consulta de facturas.'
  } finally {
    loading.value = false
  }
}

const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor || 0))
const fecha = (valor: string) => valor ? new Date(`${valor.slice(0, 10)}T00:00:00`).toLocaleDateString('es-GT') : ''
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>Consulta de Facturas</VCardTitle>
      <VCardSubtitle>Busca gastos por número y, opcionalmente, por serie de comprobante.</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <VForm @submit.prevent="buscar">
        <VRow align="center">
          <VCol cols="12" md="4"><VTextField v-model="numero" label="Número de factura" clearable /></VCol>
          <VCol cols="12" md="4"><VTextField v-model="serie" label="Serie (opcional)" clearable /></VCol>
          <VCol cols="12" md="4"><VBtn type="submit" color="primary" :loading="loading" prepend-icon="ri-search-line">Consultar</VBtn></VCol>
        </VRow>
      </VForm>
      <VAlert v-if="error" type="error" variant="tonal" class="my-4">{{ error }}</VAlert>
      <VDataTable :headers="headers" :items="resultados" :loading="loading" class="text-no-wrap">
        <template #item.fecha_comprobante="{ item }">{{ fecha(item.fecha_comprobante) }}</template>
        <template #item.monto="{ item }"><strong>{{ moneda(item.monto) }}</strong></template>
        <template #no-data>Ingresa un número de factura y presiona Consultar.</template>
      </VDataTable>
    </VCardText>
  </VCard>
</template>
