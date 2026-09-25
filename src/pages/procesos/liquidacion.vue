<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiProcesos, solicitudId } from '@/utils/procesos'
import HistorialProcesos from '@/components/procesos/HistorialProcesos.vue'

type Fondo = { id: number; mes: number; anio: number; estado: string }
const fondos = ref<Fondo[]>([]); const fondoId = ref<number | null>(null); const resumen = ref<any>(null)
const monto = ref<number | null>(null); const receptor = ref(''); const comprobante = ref(''); const observaciones = ref('')
const error = ref(''); const ok = ref(''); const loading = ref(false); const confirmarLiquidacion = ref(false)
const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor || 0))
const consultar = async () => { error.value='';ok.value='';resumen.value=null;if(!fondoId.value)return;loading.value=true;try{resumen.value=await apiProcesos(`/resumen/${fondoId.value}`);monto.value=Number(resumen.value.saldoLibros/100)}catch(e:any){error.value=e.message}finally{loading.value=false} }
const liquidar = () => { if(fondoId.value) confirmarLiquidacion.value=true }
const ejecutarLiquidacion = async () => { if(!fondoId.value)return;confirmarLiquidacion.value=false;loading.value=true;error.value='';try{const r=await apiProcesos('/liquidacion',{method:'POST',body:JSON.stringify({fondo_id:fondoId.value,solicitud_id:solicitudId(),monto_remanente:monto.value,receptor_nombre:receptor.value,comprobante_entrega:comprobante.value,observaciones:observaciones.value})});ok.value=`Liquidación #${r.id} guardada correctamente.`}catch(e:any){error.value=e.message}finally{loading.value=false} }
onMounted(async()=>{try{fondos.value=(await apiProcesos('/fondos')).filter((f:Fondo)=>f.estado==='cerrado')}catch(e:any){error.value=e.message}})
</script>

<template>
  <div class="product-page process-page">
    <section class="page-hero process-hero mb-6">
      <div class="d-flex align-center ga-4"><VAvatar color="primary" variant="tonal" rounded="lg" size="58"><VIcon icon="tabler-file-check" size="31" /></VAvatar><div><div class="process-kicker">ETAPA FINAL</div><h1 class="text-h4 font-weight-bold mb-1">Liquidación de Fondo</h1><p class="mb-0 text-medium-emphasis">Documenta la entrega del remanente y finaliza formalmente el fondo.</p></div></div>
      <VChip color="info" variant="tonal" prepend-icon="tabler-certificate">Fondo cerrado requerido</VChip>
    </section>
    <VRow>
      <VCol cols="12" lg="8">
        <VCard class="process-card"><VCardItem class="module-header"><VCardTitle><VIcon icon="tabler-file-dollar" color="primary" class="me-2" />Datos de entrega</VCardTitle><VCardSubtitle>Completa la constancia de liquidación.</VCardSubtitle></VCardItem><VCardText class="pa-6">
          <AppErrorAlert v-model="error" /><VAlert v-if="ok" type="success" variant="tonal" closable class="mb-5">{{ok}}</VAlert>
          <VSelect v-model="fondoId" :items="fondos" :item-title="(item:Fondo)=>`Fondo #${item.id} · ${String(item.mes).padStart(2,'0')}/${item.anio}`" item-value="id" label="Fondo cerrado" prepend-inner-icon="tabler-lock" :loading="loading" @update:model-value="consultar" />
          <div v-if="resumen" class="process-balance my-5"><div><span>Saldo remanente validado</span><strong>{{moneda(Number(resumen.saldoLibros/100))}}</strong></div><VIcon icon="tabler-shield-check" size="34" /></div>
          <VRow><VCol cols="12" md="6"><VTextField v-model.number="monto" type="number" min="0" step="0.01" prefix="Q" label="Remanente entregado" /></VCol><VCol cols="12" md="6"><VTextField v-model="comprobante" label="Número de comprobante" prepend-inner-icon="tabler-receipt" /></VCol><VCol cols="12"><VTextField v-model="receptor" label="Nombre de quien recibe" prepend-inner-icon="tabler-user-check" /></VCol><VCol cols="12"><VTextarea v-model="observaciones" label="Observaciones finales" rows="3" maxlength="5000" /></VCol></VRow>
          <div class="d-flex justify-end mt-4"><VBtn color="primary" size="large" prepend-icon="tabler-check" :loading="loading" :disabled="!resumen||!receptor||!comprobante" @click="liquidar">Confirmar liquidación</VBtn></div>
        </VCardText></VCard>
      </VCol>
      <VCol cols="12" lg="4"><VCard class="process-card h-100"><VCardItem><VCardTitle>Flujo del proceso</VCardTitle></VCardItem><VCardText><div class="process-step is-complete"><b>1</b><div><strong>Arqueo</strong><small>Validación del efectivo</small></div></div><div class="process-step is-complete"><b>2</b><div><strong>Cierre</strong><small>Bloqueo del período</small></div></div><div class="process-step is-current"><b>3</b><div><strong>Liquidación</strong><small>Entrega del remanente</small></div></div></VCardText></VCard></VCol>
      <VCol cols="12"><HistorialProcesos tipo="liquidacion" titulo="Historial de Liquidaciones" /></VCol>
    </VRow>
    <AppConfirmDialog v-model="confirmarLiquidacion" title="Confirmar liquidación" message="Esta operación es definitiva y finalizará formalmente el fondo seleccionado." color="warning" confirm-text="Liquidar fondo" :loading="loading" @confirm="ejecutarLiquidacion"/>
    <VSnackbar :model-value="!!ok" color="success" location="top end" timeout="3500" @update:model-value="value => { if (!value) ok = '' }">{{ ok }}</VSnackbar>
  </div>
</template>
