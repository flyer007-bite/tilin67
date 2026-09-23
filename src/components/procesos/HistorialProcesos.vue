<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiProcesos } from '@/utils/procesos'

interface Fondo { id: number; nombre?: string; descripcion?: string }
interface Registro { id: number; fondo_id: number; usuario?: string; creado_en: string }

const props = defineProps<{ tipo: 'arqueo' | 'cierre' | 'liquidacion'; titulo: string }>()
const fondos = ref<Fondo[]>([])
const fondoId = ref<number | null>(null)
const rows = ref<Registro[]>([])
const error = ref('')
const loading = ref(false)
const icono = computed(() => ({ arqueo: 'tabler-scale', cierre: 'tabler-lock-check', liquidacion: 'tabler-receipt-refund' })[props.tipo])
const nombreFondo = (id: number) => fondos.value.find(fondo => fondo.id === id)?.nombre || `Fondo #${id}`
const fecha = (valor: string) => new Date(valor).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })

const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const respuesta = await apiProcesos(`/historial/${props.tipo}?page=1${fondoId.value ? `&fondo_id=${fondoId.value}` : ''}`)
    rows.value = respuesta.rows ?? []
  }
  catch (e: any) { error.value = e.message }
  finally { loading.value = false }
}

onMounted(async () => {
  try { fondos.value = await apiProcesos('/fondos') }
  catch { fondos.value = [] }
  cargar()
})
watch(fondoId, cargar)
</script>

<template>
  <VCard class="process-history-card module-card">
    <VCardItem class="module-header">
      <template #prepend><VAvatar color="primary" variant="tonal" rounded size="46" class="me-3"><VIcon :icon="icono" size="25" /></VAvatar></template>
      <VCardTitle>{{ titulo }}</VCardTitle>
      <VCardSubtitle>Consulta y seguimiento de operaciones realizadas</VCardSubtitle>
      <template #append><VChip color="primary" variant="tonal" size="small">{{ rows.length }} registro{{ rows.length === 1 ? '' : 's' }}</VChip></template>
    </VCardItem>
    <VCardText class="pa-6">
      <VRow align="center" class="mb-2">
        <VCol cols="12" md="5"><VSelect v-model="fondoId" :items="fondos" :item-title="item => item.nombre || item.descripcion || `Fondo #${item.id}`" item-value="id" label="Filtrar por fondo" prepend-inner-icon="tabler-filter" clearable hide-details /></VCol>
        <VCol cols="12" md="7" class="text-md-end text-medium-emphasis"><VIcon icon="tabler-info-circle" size="18" class="me-1" />{{ fondoId ? 'Mostrando el fondo seleccionado' : 'Mostrando todos los fondos disponibles' }}</VCol>
      </VRow>
      <VAlert v-if="error" type="error" variant="tonal" class="my-4" closable>{{ error }}</VAlert>
      <VDataTable :items="rows" :loading="loading" :headers="[{ title: 'Operación', key: 'id' }, { title: 'Fondo', key: 'fondo_id' }, { title: 'Realizado por', key: 'usuario' }, { title: 'Fecha y hora', key: 'creado_en' }]" class="product-table mt-5">
        <template #item.id="{ item }"><VChip size="small" variant="tonal" color="primary">#{{ item.id }}</VChip></template>
        <template #item.fondo_id="{ item }"><span class="font-weight-medium">{{ nombreFondo(item.fondo_id) }}</span></template>
        <template #item.usuario="{ item }"><div class="d-flex align-center ga-2 py-2"><VAvatar size="30" color="secondary" variant="tonal"><VIcon icon="tabler-user" size="17" /></VAvatar>{{ item.usuario || 'Sin asignar' }}</div></template>
        <template #item.creado_en="{ item }"><span class="text-no-wrap">{{ fecha(item.creado_en) }}</span></template>
        <template #no-data><div class="process-empty py-10"><VIcon icon="tabler-file-search" size="44" color="primary" /><strong>No hay registros disponibles</strong><span>Las operaciones completadas aparecerán en este historial.</span></div></template>
      </VDataTable>
    </VCardText>
  </VCard>
</template>
