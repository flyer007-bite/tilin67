<script setup lang="ts">
import { useTableNumbering } from '@/composables/useTableNumbering'
const { numberPage, numberPageSize, rowNumber } = useTableNumbering()
import { computed, onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

type Rule = { action: string; subject: string }
interface TipoComprobante { id?: number; nombre: string; descripcion: string }
interface TipoComprobanteTabla extends TipoComprobante { numero: number }

const opcionesComprobantes = ['Factura Electrónica (FEL)', 'Recibo de Caja', 'Ticket / Voucher', 'Vale de Caja Chica', 'Factura Especial']
const tiposComprobante = ref<TipoComprobante[]>([])
const tiposComprobanteTabla = computed<TipoComprobanteTabla[]>(() => {
  const ordenados = [...tiposComprobante.value].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
  return ordenados.map((item, index) => ({ ...item, numero: index + 1 }))
})
const loading = ref(false)
const guardando = ref(false)
const dialog = ref(false)
const error = ref('')
const ok = ref('')
const nuevoComprobante = ref<TipoComprobante>({ nombre: '', descripcion: '' })
const userData = useCookie<Record<string, any> | null>('userData')
const abilityRules = useCookie<Rule[] | null>('userAbilityRules')
const isAdmin = computed(() => ['admin', 'administrador'].includes(String(userData.value?.role || '').toLowerCase()))
const puede = (accion: string) => isAdmin.value || (abilityRules.value || []).some(rule =>
  (rule.subject === 'tipos_comprobante' || rule.subject === 'all') && (rule.action === accion || rule.action === 'manage'),
)
const puedeCrear = computed(() => puede('crear'))
const puedeEliminar = computed(() => puede('eliminar'))
const headers = [
  { title: 'No.', key: 'numero', sortable: false }, { title: 'Tipo de Comprobante', key: 'nombre' }, { title: 'Descripción', key: 'descripcion' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center' as const },
]

const fetchTiposComprobante = async () => {
  loading.value = true; error.value = ''
  try { tiposComprobante.value = await $api<TipoComprobante[]>('/tipos-comprobante') }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No se pudieron cargar los tipos de comprobante.' }
  finally { loading.value = false }
}

const guardarTipoComprobante = async () => {
  error.value = ''; ok.value = ''
  const nombre = typeof nuevoComprobante.value.nombre === 'object'
    ? String((nuevoComprobante.value.nombre as any)?.title || '').trim()
    : String(nuevoComprobante.value.nombre || '').trim()
  if (!nombre) { error.value = 'Selecciona o escribe un tipo de comprobante.'; return }
  guardando.value = true
  try {
    await $api('/tipos-comprobante', { method: 'POST', body: { nombre, descripcion: String(nuevoComprobante.value.descripcion || '').trim() } })
    ok.value = 'Tipo de comprobante registrado correctamente.'
    dialog.value = false
    nuevoComprobante.value = { nombre: '', descripcion: '' }
    await fetchTiposComprobante()
  }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No fue posible guardar el tipo de comprobante.' }
  finally { guardando.value = false }
}

const eliminarTipoComprobante = async (id?: number) => {
  error.value = ''; ok.value = ''
  if (!id || !confirm('¿Eliminar este tipo de comprobante? Solo puede eliminarse si no está en uso.')) return
  try {
    await $api(`/tipos-comprobante/${id}`, { method: 'DELETE' })
    ok.value = 'Tipo de comprobante eliminado correctamente.'
    await fetchTiposComprobante()
  }
  catch (e: any) { error.value = e?.data?.message || e?.message || 'No fue posible eliminar el tipo de comprobante.' }
}

onMounted(fetchTiposComprobante)
</script>

<template>
  <div class="admin-page">
    <div class="page-hero admin-hero d-flex flex-wrap justify-space-between align-center ga-3 mb-6">
      <div class="d-flex align-center ga-4"><VAvatar color="primary" variant="tonal" rounded size="58"><VIcon icon="tabler-files" size="30"/></VAvatar><div><div class="process-kicker">Catálogo documental</div><h2 class="text-h4 font-weight-bold">Tipos de Comprobante</h2><p class="text-body-1 text-medium-emphasis mb-0">Documentos autorizados como soporte de movimientos.</p></div></div>
      <VBtn v-if="puedeCrear" color="primary" prepend-icon="tabler-plus" @click="dialog = true">Nuevo Comprobante</VBtn>
    </div>
    <AppErrorAlert v-model="error" />
    <VAlert v-if="ok" type="success" variant="tonal" class="mb-4">{{ ok }}</VAlert>
    <VCard class="module-card"><VCardItem class="module-header"><VCardTitle>Documentos configurados</VCardTitle><template #append><VChip color="primary" variant="tonal">{{ tiposComprobanteTabla.length }} tipos</VChip></template></VCardItem><VCardText class="pa-6"><VDataTable v-model:page="numberPage" v-model:items-per-page="numberPageSize" :headers="headers" :items="tiposComprobanteTabla" :loading="loading" class="product-table" no-data-text="No hay tipos de comprobante registrados."><template #item.numero="{ index }">{{ rowNumber(index) }}</template><template #item.nombre="{ item }"><strong>{{ item.nombre }}</strong></template><template #item.acciones="{ item }"><VBtn v-if="puedeEliminar" icon size="small" color="error" variant="tonal" title="Eliminar comprobante" aria-label="Eliminar comprobante" @click="eliminarTipoComprobante(item.id)"><VIcon icon="tabler-trash" /></VBtn></template></VDataTable></VCardText></VCard>
    <VDialog v-model="dialog" max-width="500"><VCard title="Nuevo Tipo de Comprobante"><VCardText><VCombobox v-model="nuevoComprobante.nombre" :items="opcionesComprobantes" label="Tipo de Comprobante *" clearable class="mb-4"/><VTextarea v-model="nuevoComprobante.descripcion" label="Descripción" maxlength="500" counter /></VCardText><VCardActions class="justify-end"><VBtn variant="outlined" @click="dialog = false">Cancelar</VBtn><VBtn color="primary" :loading="guardando" @click="guardarTipoComprobante">Guardar</VBtn></VCardActions></VCard></VDialog>
  </div>
</template>
