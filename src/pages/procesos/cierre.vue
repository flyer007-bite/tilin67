<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiProcesos, solicitudId } from '@/utils/procesos'

type Fondo = { id: number; mes: number; anio: number; monto_inicial: string | number; estado: string }
type Resumen = { fondoComprobar: number; saldoLibros: number; gastosC: number; fondo: Fondo }
const fondos = ref<Fondo[]>([])
const fondoId = ref<number | null>(null)
const observaciones = ref('')
const resumen = ref<Resumen | null>(null)
const error = ref('')
const ok = ref('')
const loading = ref(false)
const moneda = (centavos: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(centavos || 0) / 100)
const fondoSeleccionado = computed(() => fondos.value.find(item => item.id === fondoId.value))

const consultar = async () => {
  error.value = ''; ok.value = ''; resumen.value = null
  if (!fondoId.value) return
  loading.value = true
  try { resumen.value = await apiProcesos(`/resumen/${fondoId.value}`) }
  catch (e: any) { error.value = e.message }
  finally { loading.value = false }
}
const cerrar = async () => {
  if (!fondoId.value || !confirm('El fondo dejará de admitir movimientos. ¿Confirmar cierre?')) return
  loading.value = true; error.value = ''
  try {
    const result = await apiProcesos('/cierre', { method: 'POST', body: JSON.stringify({ fondo_id: fondoId.value, solicitud_id: solicitudId(), observaciones: observaciones.value }) })
    ok.value = `Cierre #${result.id} guardado correctamente.`
  } catch (e: any) { error.value = e.message }
  finally { loading.value = false }
}
onMounted(async () => { try { fondos.value = (await apiProcesos('/fondos')).filter((item: Fondo) => item.estado === 'activo') } catch (e: any) { error.value = e.message } })
</script>

<template>
  <div class="product-page process-page">
    <section class="page-hero process-hero mb-6">
      <div class="d-flex align-center ga-4">
        <VAvatar color="primary" variant="tonal" rounded="lg" size="58"><VIcon icon="tabler-lock-check" size="31" /></VAvatar>
        <div><div class="process-kicker">PROCESO FINANCIERO</div><h1 class="text-h4 font-weight-bold mb-1">Cierre de Caja</h1><p class="mb-0 text-medium-emphasis">Consolida el período y bloquea movimientos posteriores.</p></div>
      </div>
      <VChip color="warning" variant="tonal" prepend-icon="tabler-shield-check">Requiere arqueo cuadrado</VChip>
    </section>

    <VRow>
      <VCol cols="12" lg="8">
        <VCard class="process-card">
          <VCardItem class="module-header"><VCardTitle><VIcon icon="tabler-list-check" color="primary" class="me-2" />Preparar cierre</VCardTitle><VCardSubtitle>Selecciona el fondo y revisa las cifras antes de confirmar.</VCardSubtitle></VCardItem>
          <VCardText class="pa-6">
            <AppErrorAlert v-model="error" />
            <VAlert v-if="ok" type="success" variant="tonal" closable class="mb-5">{{ ok }}</VAlert>
            <VSelect v-model="fondoId" :items="fondos" :item-title="(item: Fondo) => `Fondo #${item.id} · ${String(item.mes).padStart(2, '0')}/${item.anio}`" item-value="id" label="Fondo activo" prepend-inner-icon="tabler-cash" :loading="loading" @update:model-value="consultar" />

            <VRow v-if="resumen" class="mt-2 mb-3">
              <VCol cols="12" sm="4"><div class="process-stat"><span>Fondo a comprobar</span><strong>{{ moneda(resumen.fondoComprobar) }}</strong></div></VCol>
              <VCol cols="12" sm="4"><div class="process-stat"><span>Total gastado</span><strong class="text-error">{{ moneda(resumen.gastosC) }}</strong></div></VCol>
              <VCol cols="12" sm="4"><div class="process-stat process-stat--accent"><span>Saldo contable</span><strong>{{ moneda(resumen.saldoLibros) }}</strong></div></VCol>
            </VRow>
            <VTextarea v-model="observaciones" label="Observaciones del cierre" placeholder="Agrega notas relevantes para auditoría" rows="4" maxlength="5000" counter />
            <div class="d-flex justify-end mt-5"><VBtn color="primary" size="large" prepend-icon="tabler-lock" :loading="loading" :disabled="!resumen" @click="cerrar">Confirmar cierre</VBtn></div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" lg="4">
        <VCard class="process-card h-100"><VCardItem><VCardTitle>Lista de verificación</VCardTitle></VCardItem><VCardText><div v-for="item in ['Arqueo guardado sin diferencias','Sin movimientos posteriores','Sin reservas activas','Saldo contable no negativo']" :key="item" class="process-check"><VIcon icon="tabler-circle-check" color="success" size="20" /><span>{{ item }}</span></div><VAlert color="warning" variant="tonal" class="mt-5">El cierre es una operación sensible y quedará registrado para auditoría.</VAlert></VCardText></VCard>
      </VCol>
    </VRow>
  </div>
</template>
