<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTableNumbering } from '@/composables/useTableNumbering'
import { $api } from '@/utils/api'

interface Gasto {
  id: number
  fondo_id: number
  tipo_comprobante_id: number
  tipo_comprobante: string
  serie_comprobante: string | null
  numero_comprobante: string
  fecha_comprobante: string
  proveedor_id: number
  proveedor_nombre: string
  persona_realizo_gasto_id: number
  persona_realizo_gasto: string
  usuario_registro_id: number
  usuario_registro: string
  monto: number
  motivo_gasto: string
  observaciones: string | null
  documento_url: string | null
  estado: string
  mes: number
  anio: number
  creado_en: string
  tipos_gasto?: string
}
interface Proveedor { id: number; nombre: string; nit: string }
interface UsuarioGasto { id: number; nombre_completo: string }
interface Fondo { id: number; mes: number; anio: number; monto_inicial: string | number; numero_cheque?: string }
interface Catalogo { id: number; nombre: string }
interface Rule { action: string; subject: string }

const gastos = ref<Gasto[]>([])
const { numberPage: pagina, numberPageSize, rowNumber } = useTableNumbering()
const orden = ref<Array<{ key: string; order: 'asc' | 'desc' }>>([{ key: 'id', order: 'desc' }])
const proveedores = ref<Proveedor[]>([])
const usuarios = ref<UsuarioGasto[]>([])
const fondos = ref<Fondo[]>([])
const tiposComprobante = ref<Array<{ title: string; value: number }>>([])
const tiposGasto = ref<Array<{ title: string; value: number }>>([])
const loading = ref(false)
const loadingProveedores = ref(false)
const isDialogVisible = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const facturaArchivo = ref<File | null>(null)
const facturaVistaPrevia = ref('')
const escaneandoFactura = ref(false)
const progresoEscaneo = ref(0)
const mensajeEscaneo = ref('')
const camposDetectados = ref<string[]>([])

const userData = useCookie<Record<string, any> | null>('userData')
const abilityRules = useCookie<Rule[] | null>('userAbilityRules')
const isAdmin = computed(() => ['admin', 'administrador'].includes(String(userData.value?.role || '').toLowerCase()))
const canGasto = (action: string) => isAdmin.value || (abilityRules.value || []).some(rule =>
  (rule.subject === 'gastos' || rule.subject === 'all') && (rule.action === action || rule.action === 'manage'),
)
const puedeCrear = computed(() => canGasto('crear'))
const puedeAprobar = computed(() => canGasto('aprobar'))
const puedeEliminar = computed(() => canGasto('eliminar'))

const fechaLocal = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const nuevoGasto = ref({
  fondo_id: null as number | null,
  tipo_comprobante_id: null as number | null,
  serie_comprobante: '',
  numero_comprobante: '',
  fecha_comprobante: fechaLocal(),
  proveedor_id: null as number | null,
  persona_realizo_gasto_id: null as number | null,
  persona_realizo_gasto_nombre: '',
  monto: null as number | null,
  motivo_gasto: '',
  observaciones: '',
  documento_url: '',
  tipo_gasto_id: null as number | null,
})

const headers = [
  { title: 'No.', key: 'id' },
  { title: 'Fecha', key: 'fecha_comprobante' },
  { title: 'Comprobante', key: 'tipo_comprobante' },
  { title: 'Número', key: 'numero_comprobante' },
  { title: 'Proveedor', key: 'proveedor_nombre' },
  { title: 'Realizado por', key: 'persona_realizo_gasto' },
  { title: 'Tipo de gasto', key: 'tipos_gasto' },
  { title: 'Motivo', key: 'motivo_gasto' },
  { title: 'Monto', key: 'monto' },
  { title: 'Estado', key: 'estado' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

const getError = (error: any, fallback: string) => error?.data?.message || error?.message || fallback
const montoConDosDecimales = (value: unknown) => {
  const numero = Number(value)
  if (!Number.isFinite(numero) || numero <= 0 || numero > 99999999.99) return false
  const centavos = Math.round(numero * 100)
  return Math.abs(numero * 100 - centavos) < 0.000001
}

const cargarGastos = async () => {
  loading.value = true
  try {
    gastos.value = await $api<Gasto[]>('/gastos')
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudieron cargar los gastos.')
  }
  finally {
    loading.value = false
  }
}

const cargarCatalogos = async () => {
  loadingProveedores.value = true
  try {
    const data = await $api<{
      tiposComprobante: Catalogo[]
      proveedores: Proveedor[]
      usuarios: UsuarioGasto[]
      tiposGasto: Catalogo[]
      fondos: Fondo[]
    }>('/gastos/catalogos')
    proveedores.value = data.proveedores
    usuarios.value = data.usuarios
    fondos.value = data.fondos
    tiposComprobante.value = data.tiposComprobante.map(item => ({ title: item.nombre, value: item.id }))
    tiposGasto.value = data.tiposGasto.map(item => ({ title: item.nombre, value: item.id }))
    if (!nuevoGasto.value.fondo_id && fondos.value.length === 1)
      nuevoGasto.value.fondo_id = fondos.value[0].id
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudieron cargar los catálogos del gasto.')
  }
  finally {
    loadingProveedores.value = false
  }
}

const limpiarFormulario = () => {
  if (facturaVistaPrevia.value) URL.revokeObjectURL(facturaVistaPrevia.value)
  facturaArchivo.value = null
  facturaVistaPrevia.value = ''
  progresoEscaneo.value = 0
  mensajeEscaneo.value = ''
  camposDetectados.value = []
  nuevoGasto.value = {
    fondo_id: fondos.value.length === 1 ? fondos.value[0].id : null,
    tipo_comprobante_id: null,
    serie_comprobante: '',
    numero_comprobante: '',
    fecha_comprobante: fechaLocal(),
    proveedor_id: null,
    persona_realizo_gasto_id: null,
    persona_realizo_gasto_nombre: '',
    monto: null,
    motivo_gasto: '',
    observaciones: '',
    documento_url: '',
    tipo_gasto_id: null,
  }
}

const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
const soloNit = (valor: string) => normalizar(valor).replace(/[^0-9K]/g, '')
const fechaOcr = (texto: string) => {
  const coincidencia = texto.match(/\b(20\d{2})[\/.\-](0?[1-9]|1[0-2])[\/.\-]([0-2]?\d|3[01])\b/)
    || texto.match(/\b([0-2]?\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](20\d{2})\b/)
  if (!coincidencia) return ''
  const [anio, mes, dia] = coincidencia[1].length === 4
    ? [coincidencia[1], coincidencia[2], coincidencia[3]]
    : [coincidencia[3], coincidencia[2], coincidencia[1]]
  const valor = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  return Number.isNaN(new Date(`${valor}T00:00:00`).getTime()) ? '' : valor
}

const aplicarTextoFactura = (texto: string) => {
  const limpio = normalizar(texto)
  const lineas = limpio.split(/\r?\n/).map(linea => linea.trim()).filter(Boolean)
  const detectados: string[] = []
  const nit = limpio.match(/\bN\.?I\.?T\.?\s*[:#-]?\s*([0-9][0-9\s.-]{4,12}[0-9K])\b/)?.[1] || ''
  const proveedor = proveedores.value.find(item => nit && soloNit(item.nit) === soloNit(nit))
    || proveedores.value.find(item => {
      const palabras = normalizar(item.nombre).split(/\s+/).filter(palabra => palabra.length > 3)
      return palabras.length > 0 && palabras.filter(palabra => limpio.includes(palabra)).length >= Math.min(2, palabras.length)
    })
  if (proveedor) { nuevoGasto.value.proveedor_id = proveedor.id; detectados.push('Proveedor') }

  const fechaDetectada = fechaOcr(limpio)
  if (fechaDetectada) { nuevoGasto.value.fecha_comprobante = fechaDetectada; detectados.push('Fecha') }

  const serie = limpio.match(/\bSERIE\s*[:#-]?\s*([A-Z0-9-]{1,20})/)?.[1]
  if (serie) { nuevoGasto.value.serie_comprobante = serie; detectados.push('Serie') }

  const numero = limpio.match(/(?:FACTURA|DOCUMENTO|DTE|NUMERO|NO\.?)[\s:#-]{0,8}([A-Z0-9][A-Z0-9-]{2,40})/)?.[1]
  if (numero && numero !== serie) { nuevoGasto.value.numero_comprobante = numero; detectados.push('Número') }

  const montos = lineas
    .filter(linea => /\bTOTAL\b/.test(linea) && !/SUBTOTAL/.test(linea))
    .flatMap(linea => [...linea.matchAll(/(?:Q\s*)?([0-9]{1,3}(?:[, ][0-9]{3})*|[0-9]+)[.,]([0-9]{2})\b/g)])
    .map(match => Number(`${match[1].replace(/[, ]/g, '')}.${match[2]}`))
    .filter(valor => Number.isFinite(valor) && valor > 0)
  if (montos.length) { nuevoGasto.value.monto = Math.max(...montos); detectados.push('Monto') }

  const factura = tiposComprobante.value.find(item => normalizar(item.title).includes('FACTURA'))
  if (factura) { nuevoGasto.value.tipo_comprobante_id = factura.value; detectados.push('Tipo de comprobante') }
  camposDetectados.value = detectados
  mensajeEscaneo.value = detectados.length
    ? `Se completaron ${detectados.length} campos. Revisa la información antes de guardar.`
    : 'No se identificaron campos con suficiente claridad. Puedes completarlos manualmente.'
}

const seleccionarFactura = (archivos: File | File[] | null) => {
  const archivo = Array.isArray(archivos) ? archivos[0] : archivos
  if (!archivo) return
  if (!archivo.type.startsWith('image/')) {
    mensajeEscaneo.value = 'Selecciona una imagen JPG, PNG, WEBP o HEIC compatible con el navegador.'
    return
  }
  if (archivo.size > 12 * 1024 * 1024) {
    mensajeEscaneo.value = 'La imagen no puede superar 12 MB.'
    return
  }
  if (facturaVistaPrevia.value) URL.revokeObjectURL(facturaVistaPrevia.value)
  facturaArchivo.value = archivo
  facturaVistaPrevia.value = URL.createObjectURL(archivo)
  mensajeEscaneo.value = 'Imagen lista. Presiona “Leer factura” para completar los campos.'
  camposDetectados.value = []
}

const escanearFactura = async () => {
  if (!facturaArchivo.value || escaneandoFactura.value) return
  escaneandoFactura.value = true
  progresoEscaneo.value = 2
  mensajeEscaneo.value = 'Preparando el reconocimiento de texto…'
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('spa', undefined, {
      logger: evento => {
        if (typeof evento.progress === 'number') progresoEscaneo.value = Math.max(2, Math.round(evento.progress * 100))
        if (evento.status === 'recognizing text') mensajeEscaneo.value = 'Leyendo los datos de la factura…'
      },
    })
    try {
      const resultado = await worker.recognize(facturaArchivo.value)
      aplicarTextoFactura(resultado.data.text)
      progresoEscaneo.value = 100
    }
    finally { await worker.terminate() }
  }
  catch (error: any) {
    mensajeEscaneo.value = getError(error, 'No fue posible leer esta imagen. Puedes continuar ingresando los datos manualmente.')
    progresoEscaneo.value = 0
  }
  finally { escaneandoFactura.value = false }
}

const abrirDialogo = () => {
  errorMessage.value = ''
  successMessage.value = ''
  limpiarFormulario()
  isDialogVisible.value = true
}

const guardarGasto = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  const form = nuevoGasto.value
  const persona = usuarios.value.find(item => item.id === Number(form.persona_realizo_gasto_id))
  if (!form.fondo_id) return void (errorMessage.value = 'Selecciona un fondo activo.')
  if (!form.tipo_comprobante_id) return void (errorMessage.value = 'Selecciona el tipo de comprobante.')
  if (!form.numero_comprobante.trim()) return void (errorMessage.value = 'Ingresa el número de comprobante.')
  if (!form.fecha_comprobante) return void (errorMessage.value = 'Selecciona la fecha del comprobante.')
  if (!form.proveedor_id) return void (errorMessage.value = 'Selecciona un proveedor.')
  if (!persona) return void (errorMessage.value = 'Selecciona quién realizó el gasto.')
  if (!form.tipo_gasto_id) return void (errorMessage.value = 'Selecciona el tipo de gasto.')
  if (!montoConDosDecimales(form.monto))
    return void (errorMessage.value = 'Ingresa un monto válido mayor a Q 0.00 con máximo dos decimales.')
  if (!form.motivo_gasto.trim()) return void (errorMessage.value = 'Ingresa el motivo del gasto.')

  loading.value = true
  try {
    await $api('/gastos', {
      method: 'POST',
      body: {
        fondo_id: Number(form.fondo_id),
        tipo_comprobante_id: Number(form.tipo_comprobante_id),
        serie_comprobante: form.serie_comprobante.trim() || null,
        numero_comprobante: form.numero_comprobante.trim(),
        fecha_comprobante: form.fecha_comprobante,
        proveedor_id: Number(form.proveedor_id),
        persona_realizo_gasto_id: persona.id,
        persona_realizo_gasto_nombre: persona.nombre_completo,
        monto: Number(form.monto),
        motivo_gasto: form.motivo_gasto.trim(),
        observaciones: form.observaciones.trim() || null,
        documento_url: form.documento_url.trim() || null,
        tipo_gasto_id: Number(form.tipo_gasto_id),
      },
    })
    successMessage.value = 'Gasto registrado y enviado a aprobación.'
    isDialogVisible.value = false
    limpiarFormulario()
    await cargarGastos()
    orden.value = [{ key: 'id', order: 'desc' }]
    pagina.value = 1
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudo registrar el gasto.')
  }
  finally {
    loading.value = false
  }
}

const actualizarEstado = async (gasto: Gasto, estado: 'aprobado' | 'rechazado') => {
  if (gasto.estado !== 'pendiente') {
    errorMessage.value = 'Solo los gastos pendientes pueden aprobarse o rechazarse.'
    return
  }
  const accion = estado === 'aprobado' ? 'aprobar' : 'rechazar'
  if (!confirm(`¿Deseas ${accion} el gasto #${gasto.id}?`)) return
  loading.value = true
  try {
    const result = await $api<{ message: string }>(`/gastos/${gasto.id}/estado`, { method: 'PATCH', body: { estado } })
    successMessage.value = result.message
    await cargarGastos()
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudo actualizar el gasto.')
  }
  finally {
    loading.value = false
  }
}

const eliminarGasto = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar este gasto pendiente?')) return
  loading.value = true
  try {
    const result = await $api<{ message: string }>(`/gastos/${id}`, { method: 'DELETE' })
    successMessage.value = result.message
    await cargarGastos()
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudo eliminar el gasto.')
  }
  finally {
    loading.value = false
  }
}

const formatoMoneda = (valor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(valor))
const formatoFecha = (fecha: string) => {
  if (!fecha) return ''
  const partes = fecha.split('T')[0].split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha
}
const colorEstado = (estado: string) => estado === 'aprobado' ? 'success' : estado === 'rechazado' ? 'error' : 'warning'

onMounted(async () => {
  await Promise.all([cargarGastos(), cargarCatalogos()])
})
</script>

<template>
  <div class="product-page">
    <VCard class="module-card">
      <VCardItem class="module-header">
        <VCardTitle>
          <VIcon icon="tabler-receipt-2" color="primary" class="me-2" /> Gastos
        </VCardTitle>

        <VCardSubtitle>
          Registro y administración de gastos
          de Caja Chica.
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VAlert
          v-if="successMessage"
          type="success"
          variant="tonal"
          closable
          class="mb-4"
        >
          {{ successMessage }}
        </VAlert>

        <AppErrorAlert v-model="errorMessage" />

        <div class="d-flex justify-end mb-4">
          <VBtn
            v-if="puedeCrear"
            color="primary"
            prepend-icon="tabler-plus"
            @click="abrirDialogo"
          >
            Registrar gasto
          </VBtn>
        </div>

        <VDataTable
          v-model:page="pagina"
          v-model:items-per-page="numberPageSize"
          v-model:sort-by="orden"
          :headers="headers"
          :items="gastos"
          :loading="loading"
          item-value="id"
          class="text-no-wrap product-table"
        >
          <template #item.id="{ index }">{{ rowNumber(index) }}</template>
          <template
            #item.fecha_comprobante="{ item }"
          >
            {{
              formatoFecha(
                item.fecha_comprobante
              )
            }}
          </template>

          <template
            #item.numero_comprobante="{ item }"
          >
            <span>
              <span
                v-if="
                  item.serie_comprobante
                "
              >
                {{
                  item.serie_comprobante
                }}-
              </span>

              {{
                item.numero_comprobante
              }}
            </span>
          </template>

          <template
            #item.tipos_gasto="{ item }"
          >
            {{
              item.tipos_gasto ||
              'Sin categoría'
            }}
          </template>

          <template #item.monto="{ item }">
            <strong>
              {{
                formatoMoneda(item.monto)
              }}
            </strong>
          </template>

          <template
            #item.estado="{ item }"
          >
            <VChip
              :color="
                colorEstado(item.estado)
              "
              size="small"
              label
            >
              {{ item.estado }}
            </VChip>
          </template>

          <template
            #item.actions="{ item }"
          >
            <VBtn
              v-if="puedeAprobar && item.estado === 'pendiente'"
              icon
              variant="tonal"
              color="success"
              size="small"
              title="Aprobar gasto"
              aria-label="Aprobar gasto"
              @click="actualizarEstado(item, 'aprobado')"
            >
              <VIcon icon="tabler-check" />
            </VBtn>
            <VBtn
              v-if="puedeAprobar && item.estado === 'pendiente'"
              icon
              variant="tonal"
              color="warning"
              size="small"
              title="Rechazar gasto"
              aria-label="Rechazar gasto"
              @click="actualizarEstado(item, 'rechazado')"
            >
              <VIcon icon="tabler-x" />
            </VBtn>
            <VBtn
              v-if="false"
              icon
              variant="text"
              color="warning"
              size="small"
              title="Desaprobar gasto"
              @click="actualizarEstado(item, 'rechazado')"
            >
              <VIcon icon="tabler-thumb-down" />
            </VBtn>
            <VBtn
              v-if="puedeEliminar && item.estado === 'pendiente'"
              icon
              variant="tonal"
              color="error"
              size="small"
              title="Eliminar gasto"
              aria-label="Eliminar gasto"
              @click="
                eliminarGasto(item.id)
              "
            >
              <VIcon
                icon="tabler-trash"
              />
            </VBtn>
          </template>

          <template #no-data>
            No hay gastos registrados.
          </template>
        </VDataTable>
      </VCardText>
    </VCard>

    <VDialog
      v-model="isDialogVisible"
      max-width="920"
      persistent
    >
      <VCard>
        <VCardTitle
          class="d-flex align-center justify-space-between"
        >
          <span>
            Registrar gasto
          </span>

          <VBtn
            icon
            variant="text"
            @click="
              isDialogVisible = false;
              limpiarFormulario()
            "
          >
            <VIcon
              icon="tabler-x"
              title="Cerrar formulario"
              aria-label="Cerrar formulario"



            />
          </VBtn>
        </VCardTitle>

        <VCardText>
          <section class="invoice-scanner mb-6">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
              <div><div class="process-kicker">Asistente OCR</div><h3 class="text-h5 mb-1">Escanear factura</h3><p class="text-medium-emphasis mb-0">Toma una foto o selecciona una imagen. También puedes llenar todo manualmente.</p></div>
              <VChip color="primary" variant="tonal"><VIcon start icon="tabler-lock" />Lectura en el navegador</VChip>
            </div>
            <VRow align="stretch">
              <VCol cols="12" md="5">
                <VFileInput accept="image/*" capture="environment" label="Foto de la factura" prepend-icon="" prepend-inner-icon="tabler-camera" show-size :disabled="escaneandoFactura" @update:model-value="seleccionarFactura" />
                <div v-if="facturaVistaPrevia" class="invoice-preview"><img :src="facturaVistaPrevia" alt="Vista previa de la factura"></div>
                <div v-else class="invoice-placeholder"><VIcon icon="tabler-scan" size="48"/><span>La vista previa aparecerá aquí</span></div>
              </VCol>
              <VCol cols="12" md="7" class="d-flex flex-column">
                <VAlert color="info" variant="tonal" icon="tabler-sparkles" class="mb-4">El sistema intentará detectar proveedor, fecha, serie, número y monto. Confirma siempre los datos antes de guardar.</VAlert>
                <VProgressLinear v-if="escaneandoFactura" :model-value="progresoEscaneo" color="primary" height="8" rounded class="mb-3" />
                <p v-if="mensajeEscaneo" class="text-body-2 mb-3">{{ mensajeEscaneo }}</p>
                <div v-if="camposDetectados.length" class="d-flex flex-wrap ga-2 mb-4"><VChip v-for="campo in camposDetectados" :key="campo" color="success" size="small" variant="tonal"><VIcon start icon="tabler-check"/>{{ campo }}</VChip></div>
                <VBtn :disabled="!facturaArchivo || escaneandoFactura" :loading="escaneandoFactura" prepend-icon="tabler-scan" size="large" class="mt-auto" @click="escanearFactura">Leer factura</VBtn>
              </VCol>
            </VRow>
          </section>
          <VDivider class="mb-6" />
          <div class="d-flex align-center ga-2 mb-4"><VIcon icon="tabler-pencil" color="primary"/><h3 class="text-h5 mb-0">Datos del gasto</h3><VChip size="small" variant="tonal">Editables</VChip></div>
          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="nuevoGasto.fondo_id"
                :items="fondos"
                :item-title="item => `Fondo ${item.id} · ${String(item.mes).padStart(2, '0')}/${item.anio}`"
                item-value="id"
                label="Fondo activo *"
                placeholder="Selecciona un fondo"
                :disabled="fondos.length === 1"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VSelect
                v-model="nuevoGasto.persona_realizo_gasto_id"
                :items="usuarios"
                item-title="nombre_completo"
                item-value="id"
                label="Persona que realizó el gasto *"
                placeholder="Selecciona una persona"
                clearable
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="
                  nuevoGasto
                    .tipo_comprobante_id
                "
                :items="
                  tiposComprobante
                "
                label="Tipo de comprobante *"
                placeholder="Selecciona un tipo"
                clearable
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="
                  nuevoGasto
                    .serie_comprobante
                "
                label="Serie"
                placeholder="Ej. A"
                maxlength="50"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="
                  nuevoGasto
                    .numero_comprobante
                "
                label="Número de comprobante *"
                placeholder="Ej. 00125"
                maxlength="100"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="
                  nuevoGasto
                    .fecha_comprobante
                "
                type="date"
                label="Fecha del comprobante *"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="
                  nuevoGasto
                    .proveedor_id
                "
                :items="proveedores"
                item-title="nombre"
                item-value="id"
                label="Proveedor *"
                placeholder="Selecciona un proveedor"
                :loading="
                  loadingProveedores
                "
                clearable
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="
                  nuevoGasto
                    .tipo_gasto_id
                "
                :items="tiposGasto"
                label="Tipo de gasto *"
                placeholder="Selecciona un tipo"
                clearable
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model.number="
                  nuevoGasto.monto
                "
                type="number"
                min="0"
                step="0.01"
                max="99999999.99"
                label="Monto *"
                placeholder="Ej. 150.00"
                prefix="Q"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="
                  nuevoGasto
                    .motivo_gasto
                "
                label="Motivo del gasto *"
                placeholder="Describe el motivo del gasto"
                rows="3"
                maxlength="500"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="
                  nuevoGasto
                    .observaciones
                "
                label="Observaciones"
                placeholder="Observaciones adicionales"
                rows="2"
                maxlength="5000"
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="
                  nuevoGasto
                    .documento_url
                "
                label="URL del documento"
                placeholder="Opcional"
              />
            </VCol>
          </VRow>
        </VCardText>

        <VCardActions
          class="justify-end"
        >
          <VBtn
            variant="tonal"
            @click="
              isDialogVisible = false;
              limpiarFormulario()
            "
          >
            Cancelar
          </VBtn>

          <VBtn
            color="primary"
            :loading="loading"
            @click="guardarGasto"
          >
            Guardar gasto
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
