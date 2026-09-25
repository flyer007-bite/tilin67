<script setup lang="ts">
import { useTableNumbering } from '@/composables/useTableNumbering'
const { numberPage, numberPageSize, rowNumber } = useTableNumbering()
import { computed, onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

type Rule = { action: string; subject: string }
interface TipoGasto { id?: number; nombre: string; descripcion: string }
interface TipoGastoTabla extends TipoGasto { numero: number }

const opcionesGastos = ['Viáticos y Alimentación', 'Papelería y Útiles de Oficina', 'Transporte y Combustible', 'Mantenimiento y Reparaciones', 'Servicios Públicos / Mantenimiento', 'Envíos y Mensajería', 'Otros Gastos Menores']
const tiposGasto = ref<TipoGasto[]>([])
const busqueda = ref('')
const tiposGastoTabla = computed<TipoGastoTabla[]>(() => {
  const termino = busqueda.value.trim().toLowerCase()
  const ordenados = tiposGasto.value.filter(item => !termino || `${item.nombre} ${item.descripcion}`.toLowerCase().includes(termino)).sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
  return ordenados.map((item, index) => ({ ...item, numero: index + 1 }))
})
const loading = ref(false)
const guardando = ref(false)
const dialog = ref(false)
const error = ref('')
const ok = ref('')
const confirmarEliminar = ref(false)
const tipoAEliminar = ref<number | null>(null)
const nuevoGasto = ref<TipoGasto>({ nombre: '', descripcion: '' })
const userData = useCookie<Record<string, any> | null>('userData')
const abilityRules = useCookie<Rule[] | null>('userAbilityRules')
const isAdmin = computed(() => ['admin', 'administrador'].includes(String(userData.value?.role || '').toLowerCase()))
const puede = (accion: string) => isAdmin.value || (abilityRules.value || []).some(rule =>
  (rule.subject === 'tipos_gasto' || rule.subject === 'all') && (rule.action === accion || rule.action === 'manage'),
)
const puedeCrear = computed(() => puede('crear'))
const puedeEliminar = computed(() => puede('eliminar'))
const headers = [
  { title: 'No.', key: 'numero', sortable: false },
  { title: 'Tipo de Gasto', key: 'nombre' },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center' as const },
]

const fetchTiposGasto = async () => {
  loading.value = true
  error.value = ''
  try { tiposGasto.value = await $api<TipoGasto[]>('/tipos-gasto') }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No se pudieron cargar los tipos de gasto.' }
  finally { loading.value = false }
}

const guardarTipoGasto = async () => {
  error.value = ''; ok.value = ''
  const nombre = typeof nuevoGasto.value.nombre === 'object'
    ? String((nuevoGasto.value.nombre as any)?.title || '').trim()
    : String(nuevoGasto.value.nombre || '').trim()
  if (!nombre) { error.value = 'Selecciona o escribe un tipo de gasto.'; return }
  guardando.value = true
  try {
    await $api('/tipos-gasto', { method: 'POST', body: { nombre, descripcion: String(nuevoGasto.value.descripcion || '').trim() } })
    ok.value = 'Tipo de gasto registrado correctamente.'
    dialog.value = false
    nuevoGasto.value = { nombre: '', descripcion: '' }
    await fetchTiposGasto()
  }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No fue posible guardar el tipo de gasto.' }
  finally { guardando.value = false }
}

const eliminarTipoGasto = async (id?: number) => {
  error.value = ''; ok.value = ''
  if (!id) return
  tipoAEliminar.value = id
  confirmarEliminar.value = true
}
const ejecutarEliminarTipoGasto = async () => {
  const id = tipoAEliminar.value
  if (!id) return
  confirmarEliminar.value = false
  try {
    await $api(`/tipos-gasto/${id}`, { method: 'DELETE' })
    ok.value = 'Tipo de gasto eliminado correctamente.'
    await fetchTiposGasto()
  }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No fue posible eliminar el tipo de gasto.' }
}

onMounted(fetchTiposGasto)
</script>

<template>
  <div class="admin-page">
    <div class="page-hero admin-hero d-flex flex-wrap justify-space-between align-center ga-3 mb-6">
      <div class="d-flex align-center ga-4"><VAvatar color="primary" variant="tonal" rounded size="58"><VIcon icon="tabler-category-2" size="30"/></VAvatar><div><div class="process-kicker">Catálogo financiero</div><h2 class="text-h4 font-weight-bold">Tipos de Gasto</h2><p class="text-body-1 text-medium-emphasis mb-0">Clasificación utilizada al registrar movimientos.</p></div></div>
      <VBtn v-if="puedeCrear" color="primary" prepend-icon="tabler-plus" @click="dialog = true">Nuevo Tipo de Gasto</VBtn>
    </div>
    <AppErrorAlert v-model="error" />
    <VAlert v-if="ok" type="success" variant="tonal" class="mb-4">{{ ok }}</VAlert>
    <VCard class="module-card"><VCardItem class="module-header"><VCardTitle>Catálogo de categorías</VCardTitle><template #append><VChip color="primary" variant="tonal">{{ tiposGastoTabla.length }} tipos</VChip></template></VCardItem><VCardText class="pa-6"><VTextField v-model="busqueda" label="Buscar categoría" prepend-inner-icon="tabler-search" clearable hide-details class="mb-5"/><VDataTable v-model:page="numberPage" v-model:items-per-page="numberPageSize" :headers="headers" :items="tiposGastoTabla" :loading="loading" class="product-table" no-data-text="No hay tipos de gasto registrados."><template #item.numero="{ index }">{{ rowNumber(index) }}</template><template #item.nombre="{ item }"><strong>{{ item.nombre }}</strong></template><template #item.acciones="{ item }"><VBtn v-if="puedeEliminar" icon size="small" color="error" variant="tonal" title="Eliminar tipo de gasto" aria-label="Eliminar tipo de gasto" @click="eliminarTipoGasto(item.id)"><VIcon icon="tabler-trash" /></VBtn></template></VDataTable></VCardText></VCard>
    <VDialog v-model="dialog" max-width="500"><VCard title="Nuevo Tipo de Gasto"><VCardText><VCombobox v-model="nuevoGasto.nombre" :items="opcionesGastos" label="Tipo de Gasto *" clearable class="mb-4"/><VTextarea v-model="nuevoGasto.descripcion" label="Descripción" maxlength="500" counter /></VCardText><VCardActions class="justify-end"><VBtn variant="outlined" @click="dialog = false">Cancelar</VBtn><VBtn color="primary" :loading="guardando" @click="guardarTipoGasto">Guardar</VBtn></VCardActions></VCard></VDialog>
    <AppConfirmDialog v-model="confirmarEliminar" title="Eliminar tipo de gasto" message="Solo puede eliminarse si no tiene movimientos relacionados." color="error" confirm-text="Eliminar" @confirm="ejecutarEliminarTipoGasto"/>
    <VSnackbar :model-value="!!ok" color="success" location="top end" timeout="3500" @update:model-value="value => { if (!value) ok = '' }">{{ ok }}</VSnackbar>
  </div>
</template>
