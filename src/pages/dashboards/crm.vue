<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

type Movimiento = { tipo: 'Ingreso' | 'Egreso'; fecha: string; descripcion: string; monto: number; estado: string; persona_realizo_gasto?: string | null }
type Resumen = {
  ingresos: number
  egresos: number
  fondosIniciales: number
  balance: number
  cantidadIngresos: number
  cantidadEgresos: number
  anio: number
  mes: number
  anios: number[]
  mensual: { periodo: string; ingresos: number; egresos: number }[]
  movimientos: Movimiento[]
}

const resumen = ref<Resumen | null>(null)
const loading = ref(false)
const error = ref('')
const userData = useCookie<Record<string, any> | null>('userData')
const abilityRules = useCookie<Array<{ action: string; subject: string }> | null>('userAbilityRules')
const esOperador = computed(() => String(userData.value?.role || '').toLowerCase() === 'operador caja chica')
const esAdmin = computed(() => ['admin', 'administrador'].includes(String(userData.value?.role || '').toLowerCase()))
const puede = (subject: string, action = 'crear') => esAdmin.value || (abilityRules.value || []).some(rule =>
  (rule.subject === subject || rule.subject === 'all') && (rule.action === action || rule.action === 'manage'),
)
const anioSeleccionado = ref(new Date().getFullYear())
const mesSeleccionado = ref<number | null>(null)
const aniosHasta2030 = Array.from({ length: 2030 - 2020 + 1 }, (_, index) => 2020 + index).reverse()
const meses = [
  { title: 'Todo el año', value: null }, { title: 'Enero', value: 1 }, { title: 'Febrero', value: 2 },
  { title: 'Marzo', value: 3 }, { title: 'Abril', value: 4 }, { title: 'Mayo', value: 5 },
  { title: 'Junio', value: 6 }, { title: 'Julio', value: 7 }, { title: 'Agosto', value: 8 },
  { title: 'Septiembre', value: 9 }, { title: 'Octubre', value: 10 }, { title: 'Noviembre', value: 11 }, { title: 'Diciembre', value: 12 },
]

const semanaActual = computed(() => {
  const hoy = new Date()
  const fechaUtc = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
  const dia = fechaUtc.getUTCDay() || 7
  fechaUtc.setUTCDate(fechaUtc.getUTCDate() + 4 - dia)
  const inicioAnio = new Date(Date.UTC(fechaUtc.getUTCFullYear(), 0, 1))
  const numero = Math.ceil((((fechaUtc.getTime() - inicioAnio.getTime()) / 86400000) + 1) / 7)
  const inicio = new Date(hoy)
  inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)
  const formato = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' })

  return { numero, rango: `${formato.format(inicio)} – ${formato.format(fin)}` }
})

const cargarDashboard = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ anio: String(anioSeleccionado.value) })
    if (mesSeleccionado.value) params.set('mes', String(mesSeleccionado.value))
    resumen.value = await $api<Resumen>(`/reportes/dashboard?${params}`)
    if (!resumen.value.anios.includes(anioSeleccionado.value))
      anioSeleccionado.value = resumen.value.anio
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'No se pudieron cargar los datos de Caja Chica.'
  } finally {
    loading.value = false
  }
}

const moneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor || 0))
const fecha = (valor: string) => valor ? new Date(`${valor.slice(0, 10)}T00:00:00`).toLocaleDateString('es-GT') : ''
const porcentajeEgresos = computed(() => {
  const disponible = Number(resumen.value?.fondosIniciales || 0) + Number(resumen.value?.ingresos || 0)
  if (!disponible) return 0
  return Math.min(100, Math.round((Number(resumen.value?.egresos || 0) / disponible) * 100))
})

const headers = [
  { title: 'Tipo', key: 'tipo' },
  { title: 'Fecha', key: 'fecha' },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Realizado por', key: 'persona_realizo_gasto' },
  { title: 'Estado', key: 'estado' },
  { title: 'Monto', key: 'monto', align: 'end' as const },
]

const seriesGrafica = computed(() => [
  { name: 'Ingresos', data: (resumen.value?.mensual || []).map(item => Number(item.ingresos)) },
  { name: 'Egresos', data: (resumen.value?.mensual || []).map(item => Number(item.egresos)) },
])

const opcionesGrafica = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false } },
  colors: ['#28c76f', '#ea5455'],
  plotOptions: { bar: { borderRadius: 5, columnWidth: '45%' } },
  dataLabels: { enabled: false },
  xaxis: { categories: (resumen.value?.mensual || []).map(item => item.periodo) },
  yaxis: { labels: { formatter: (valor: number) => `Q ${valor.toLocaleString('es-GT')}` } },
  tooltip: { y: { formatter: (valor: number) => moneda(valor) } },
  legend: { position: 'top' },
  grid: { borderColor: 'rgba(128,128,128,0.2)' },
}))

onMounted(cargarDashboard)
</script>

<template>
  <div class="product-page dashboard-page">
    <div class="page-hero d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <div class="d-flex align-center ga-2">
          <VIcon icon="tabler-layout-dashboard" size="30" color="primary" />
          <h3 class="text-h4 font-weight-bold">{{ esOperador ? 'Mi Dashboard de Caja Chica' : 'Dashboard de Caja Chica' }}</h3>
        </div>
        <p class="text-body-1 mb-0">{{ esOperador ? 'Consulta los movimientos, ingresos y egresos disponibles.' : 'Resumen actualizado de ingresos, egresos y disponibilidad.' }}</p>
        <VChip color="primary" variant="tonal" class="mt-2" prepend-icon="tabler-calendar-week">
          Semana {{ semanaActual.numero }} · {{ semanaActual.rango }}
        </VChip>
      </div>
      <div class="d-flex flex-wrap ga-3 align-center">
        <VSelect v-model="anioSeleccionado" :items="aniosHasta2030" label="Año" density="compact" hide-details style="min-inline-size: 110px" />
        <VSelect v-model="mesSeleccionado" :items="meses" label="Mes" density="compact" hide-details style="min-inline-size: 165px" />
        <VBtn color="primary" prepend-icon="tabler-refresh" :loading="loading" @click="cargarDashboard">Actualizar</VBtn>
      </div>
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-6">{{ error }}</VAlert>
    <VAlert v-if="resumen && porcentajeEgresos >= 80" :type="porcentajeEgresos >= 95 ? 'error' : 'warning'" variant="tonal" prominent class="mb-6"><VAlertTitle>Atención al presupuesto</VAlertTitle>Se ha utilizado el {{ porcentajeEgresos }}% de los fondos disponibles. Revisa los gastos antes de registrar nuevos movimientos.</VAlert>

    <section class="quick-actions mb-6">
      <div class="d-flex align-center justify-space-between mb-3"><div><div class="process-kicker">Accesos directos</div><h2 class="text-h5 mb-0">¿Qué deseas hacer?</h2></div></div>
      <VRow>
        <VCol v-if="puede('gastos')" cols="12" sm="6" lg="3"><VCard :to="{ name: 'gastos', query: { nuevo: '1' } }" class="quick-action-card h-100"><VCardText><VAvatar color="error" variant="tonal" rounded><VIcon icon="tabler-receipt"/></VAvatar><div><strong>Nuevo gasto</strong><span>Registrar manualmente</span></div><VIcon icon="tabler-chevron-right"/></VCardText></VCard></VCol>
        <VCol v-if="puede('gastos')" cols="12" sm="6" lg="3"><VCard :to="{ name: 'gastos', query: { nuevo: '1', escanear: '1' } }" class="quick-action-card h-100"><VCardText><VAvatar color="primary" variant="tonal" rounded><VIcon icon="tabler-scan"/></VAvatar><div><strong>Escanear factura</strong><span>Completar con una foto</span></div><VIcon icon="tabler-chevron-right"/></VCardText></VCard></VCol>
        <VCol v-if="puede('ingresos')" cols="12" sm="6" lg="3"><VCard :to="{ name: 'ingresos', query: { nuevo: '1' } }" class="quick-action-card h-100"><VCardText><VAvatar color="success" variant="tonal" rounded><VIcon icon="tabler-cash-banknote"/></VAvatar><div><strong>Nuevo ingreso</strong><span>Agregar fondos</span></div><VIcon icon="tabler-chevron-right"/></VCardText></VCard></VCol>
        <VCol v-if="puede('consulta', 'ver')" cols="12" sm="6" lg="3"><VCard :to="{ name: 'consulta-facturas' }" class="quick-action-card h-100"><VCardText><VAvatar color="info" variant="tonal" rounded><VIcon icon="tabler-file-search"/></VAvatar><div><strong>Buscar factura</strong><span>Consultar comprobantes</span></div><VIcon icon="tabler-chevron-right"/></VCardText></VCard></VCol>
      </VRow>
    </section>

    <VRow v-if="resumen" class="match-height">
      <VCol cols="12" md="4">
        <VCard class="metric-card metric-card--income">
          <VCardText>
            <VAvatar color="success" variant="tonal" rounded size="44"><VIcon icon="tabler-arrow-down-circle" size="26" /></VAvatar>
            <p class="text-h6 mt-4 mb-1">Ingresos</p>
            <h3 class="text-h4 text-success">{{ moneda(resumen.ingresos) }}</h3>
            <p class="mb-0 text-body-2">{{ resumen.cantidadIngresos }} registro(s) activo(s)</p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard class="metric-card metric-card--expense">
          <VCardText>
            <VAvatar color="error" variant="tonal" rounded size="44"><VIcon icon="tabler-arrow-up-circle" size="26" /></VAvatar>
            <p class="text-h6 mt-4 mb-1">Egresos</p>
            <h3 class="text-h4 text-error">{{ moneda(resumen.egresos) }}</h3>
            <p class="mb-0 text-body-2">{{ resumen.cantidadEgresos }} gasto(s) registrado(s)</p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard class="metric-card metric-card--balance">
          <VCardText>
            <VAvatar :color="resumen.balance >= 0 ? 'primary' : 'warning'" variant="tonal" rounded size="44"><VIcon icon="tabler-wallet" size="26" /></VAvatar>
            <p class="text-h6 mt-4 mb-1">Saldo disponible</p>
            <h3 class="text-h4">{{ moneda(resumen.balance) }}</h3>
            <p class="mb-2 text-body-2">Egresos equivalentes al {{ porcentajeEgresos }}% de los fondos disponibles.</p>
            <VProgressLinear :model-value="porcentajeEgresos" color="warning" rounded height="7" />
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="5">
        <VCard class="surface-card h-100">
          <VCardItem>
            <template #prepend><VIcon icon="tabler-chart-bar" size="24" /></template>
            <VCardTitle>Resumen del período</VCardTitle>
            <VCardSubtitle>Ingresos y egresos {{ mesSeleccionado ? 'por día' : 'por mes' }}</VCardSubtitle>
          </VCardItem>
          <VCardText>
            <div v-if="!resumen.mensual.length" class="text-medium-emphasis">No hay movimientos en el período seleccionado.</div>
            <VueApexCharts v-else type="bar" height="300" :options="opcionesGrafica" :series="seriesGrafica" />
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="7">
        <VCard class="surface-card h-100">
          <VCardItem>
            <template #prepend><VIcon icon="tabler-history" size="24" /></template>
            <VCardTitle>Movimientos recientes</VCardTitle>
            <VCardSubtitle>Últimos ingresos y egresos registrados</VCardSubtitle>
          </VCardItem>
          <VDataTable :headers="headers" :items="resumen.movimientos" :loading="loading" density="comfortable">
            <template #item.tipo="{ item }"><VChip :color="item.tipo === 'Ingreso' ? 'success' : 'error'" size="small" label>{{ item.tipo }}</VChip></template>
            <template #item.fecha="{ item }">{{ fecha(item.fecha) }}</template>
            <template #item.monto="{ item }"><strong :class="item.tipo === 'Ingreso' ? 'text-success' : 'text-error'">{{ moneda(item.monto) }}</strong></template>
            <template #no-data>No hay movimientos registrados.</template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>

    <VProgressLinear v-else-if="loading" indeterminate color="primary" />
  </div>
</template>
