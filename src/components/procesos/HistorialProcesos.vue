<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { apiProcesos } from '@/utils/procesos'
const props = defineProps<{ tipo: 'arqueo' | 'cierre' | 'liquidacion'; titulo: string }>()
const fondos = ref<any[]>([]); const fondoId = ref<number | null>(null); const rows = ref<any[]>([]); const error = ref(''); const loading = ref(false)
const cargar = async () => { loading.value=true;error.value='';try { const r=await apiProcesos(`/historial/${props.tipo}?page=1${fondoId.value ? `&fondo_id=${fondoId.value}` : ''}`);rows.value=r.rows } catch(e:any){error.value=e.message}finally{loading.value=false} }
onMounted(async()=>{try{fondos.value=await apiProcesos('/fondos')}catch{};cargar()});watch(fondoId,cargar)
</script>
<template><VCard><VCardItem><VCardTitle>{{ titulo }}</VCardTitle></VCardItem><VCardText><VSelect v-model="fondoId" :items="fondos" item-title="id" item-value="id" label="Filtrar por fondo" clearable class="mb-4"/><VAlert v-if="error" type="error" variant="tonal">{{ error }}</VAlert><VDataTable :items="rows" :loading="loading" :headers="[{title:'ID',key:'id'},{title:'Fondo',key:'fondo_id'},{title:'Usuario',key:'usuario'},{title:'Fecha',key:'creado_en'}]"><template #no-data>No hay registros disponibles.</template></VDataTable></VCardText></VCard></template>
