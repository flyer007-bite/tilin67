<script setup lang="ts">
import { useTableNumbering } from '@/composables/useTableNumbering'
const { numberPage, numberPageSize, rowNumber } = useTableNumbering()
import { computed, onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

type Rule = { action: string; subject: string }
interface Proveedor { id?: number; nombre: string; nit: string; telefono: string; direccion?: string }
interface ProveedorTabla extends Proveedor { numero: number }

const proveedores = ref<Proveedor[]>([])
const busqueda = ref('')
const proveedoresTabla = computed<ProveedorTabla[]>(() => {
  const termino = busqueda.value.trim().toLowerCase()
  const ordenados = proveedores.value.filter(item => !termino || `${item.nombre} ${item.nit} ${item.telefono} ${item.direccion || ''}`.toLowerCase().includes(termino)).sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
  return ordenados.map((item, index) => ({ ...item, numero: index + 1 }))
})
const loading = ref(false)
const guardando = ref(false)
const dialog = ref(false)
const error = ref('')
const ok = ref('')
const confirmarEliminar = ref(false)
const proveedorAEliminar = ref<number | null>(null)
const nuevoProveedor = ref<Proveedor>({ nombre: '', nit: '', telefono: '', direccion: '' })
const userData = useCookie<Record<string, any> | null>('userData')
const abilityRules = useCookie<Rule[] | null>('userAbilityRules')
const isAdmin = computed(() => ['admin', 'administrador'].includes(String(userData.value?.role || '').toLowerCase()))
const puede = (accion: string) => isAdmin.value || (abilityRules.value || []).some(rule =>
  (rule.subject === 'proveedores' || rule.subject === 'all') && (rule.action === accion || rule.action === 'manage'),
)
const puedeCrear = computed(() => puede('crear'))
const puedeEliminar = computed(() => puede('eliminar'))
const headers = [
  { title: 'No.', key: 'numero', sortable: false }, { title: 'Nombre / Razón Social', key: 'nombre' }, { title: 'NIT', key: 'nit' },
  { title: 'Teléfono', key: 'telefono' }, { title: 'Dirección', key: 'direccion' }, { title: 'Acciones', key: 'actions', sortable: false },
]

const fetchProveedores = async () => {
  loading.value = true; error.value = ''
  try { proveedores.value = await $api<Proveedor[]>('/proveedores') }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No se pudieron cargar los proveedores.' }
  finally { loading.value = false }
}

const limpiarNit = () => { nuevoProveedor.value.nit = String(nuevoProveedor.value.nit || '').replace(/[-\s]/g, '').trim() }
const abrirDialog = () => { nuevoProveedor.value = { nombre: '', nit: '', telefono: '', direccion: '' }; dialog.value = true }

const guardarProveedor = async () => {
  error.value = ''; ok.value = ''; limpiarNit()
  if (!nuevoProveedor.value.nombre.trim()) { error.value = 'El nombre del proveedor es obligatorio.'; return }
  guardando.value = true
  try {
    await $api('/proveedores', { method: 'POST', body: {
      nombre: nuevoProveedor.value.nombre.trim(), nit: nuevoProveedor.value.nit,
      telefono: String(nuevoProveedor.value.telefono || '').trim(), direccion: String(nuevoProveedor.value.direccion || '').trim(),
    } })
    ok.value = 'Proveedor registrado correctamente.'
    dialog.value = false
    await fetchProveedores()
  }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No fue posible guardar el proveedor.' }
  finally { guardando.value = false }
}

const eliminarProveedor = async (id?: number) => {
  error.value = ''; ok.value = ''
  if (!id) return
  proveedorAEliminar.value = id
  confirmarEliminar.value = true
}
const ejecutarEliminarProveedor = async () => {
  const id = proveedorAEliminar.value
  if (!id) return
  confirmarEliminar.value = false
  try {
    await $api(`/proveedores/${id}`, { method: 'DELETE' })
    ok.value = 'Proveedor eliminado correctamente.'
    await fetchProveedores()
  }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No fue posible eliminar el proveedor.' }
}

onMounted(fetchProveedores)
</script>

<template>
  <div class="admin-page"><section class="page-hero admin-hero d-flex flex-wrap justify-space-between align-center ga-3 mb-6"><div class="d-flex align-center ga-4"><VAvatar color="primary" variant="tonal" rounded size="58"><VIcon icon="tabler-building-store" size="30"/></VAvatar><div><div class="process-kicker">Directorio comercial</div><h1 class="text-h4 font-weight-bold mb-1">Proveedores</h1><p class="text-medium-emphasis mb-0">Administra las entidades asociadas a los gastos.</p></div></div><VBtn v-if="puedeCrear" color="primary" size="large" prepend-icon="tabler-plus" @click="abrirDialog">Nuevo Proveedor</VBtn></section>
  <VCard class="module-card"><VCardItem class="module-header"><VCardTitle>Directorio de proveedores</VCardTitle><template #append><VChip color="primary" variant="tonal">{{ proveedoresTabla.length }} registrados</VChip></template></VCardItem>
    <VCardText class="pa-6"><VTextField v-model="busqueda" label="Buscar proveedor" prepend-inner-icon="tabler-search" clearable hide-details class="mb-5" />
      <AppErrorAlert v-model="error" />
      <VAlert v-if="ok" type="success" variant="tonal" class="mb-4">{{ ok }}</VAlert>
      <VDataTable v-model:page="numberPage" v-model:items-per-page="numberPageSize" :headers="headers" :items="proveedoresTabla" :loading="loading" class="product-table"><template #item.numero="{ index }">{{ rowNumber(index) }}</template><template #item.nombre="{ item }"><div class="d-flex align-center ga-2"><VAvatar size="32" color="primary" variant="tonal"><VIcon icon="tabler-building" size="17"/></VAvatar><strong>{{ item.nombre }}</strong></div></template>
        <template #item.nit="{ item }">{{ item.nit || 'Sin NIT' }}</template>
        <template #item.telefono="{ item }">{{ item.telefono || '—' }}</template>
        <template #item.direccion="{ item }">{{ item.direccion || '—' }}</template>
        <template #item.actions="{ item }"><VBtn v-if="puedeEliminar" icon size="small" color="error" variant="tonal" title="Eliminar proveedor" aria-label="Eliminar proveedor" @click="eliminarProveedor(item.id)"><VIcon icon="tabler-trash" /></VBtn></template>
      </VDataTable>
    </VCardText>
    <VDialog v-model="dialog" max-width="560"><VCard title="Agregar Proveedor"><VCardText><VRow><VCol cols="12"><VTextField v-model="nuevoProveedor.nombre" label="Nombre / Razón Social *" maxlength="150" counter /></VCol><VCol cols="12" md="6"><VTextField v-model="nuevoProveedor.nit" label="NIT" maxlength="30" @blur="limpiarNit" /></VCol><VCol cols="12" md="6"><VTextField v-model="nuevoProveedor.telefono" label="Teléfono" maxlength="30" /></VCol><VCol cols="12"><VTextarea v-model="nuevoProveedor.direccion" label="Dirección" maxlength="500" counter /></VCol></VRow></VCardText><VCardActions class="justify-end"><VBtn variant="outlined" @click="dialog = false">Cancelar</VBtn><VBtn color="primary" :loading="guardando" @click="guardarProveedor">Guardar</VBtn></VCardActions></VCard></VDialog>
  </VCard><AppConfirmDialog v-model="confirmarEliminar" title="Eliminar proveedor" message="Solo puede eliminarse si no tiene gastos relacionados. Esta acción no se puede deshacer." color="error" confirm-text="Eliminar" @confirm="ejecutarEliminarProveedor"/><VSnackbar :model-value="!!ok" color="success" location="top end" timeout="3500" @update:model-value="value => { if (!value) ok = '' }">{{ ok }}</VSnackbar></div>
</template>
