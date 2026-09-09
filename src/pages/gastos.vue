
<script setup lang="ts">
import { ref, onMounted } from 'vue'

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
}

interface Proveedor {
  id: number
  nombre: string
  nit: string
}

interface TipoComprobante {
  id: number
  nombre: string
  descripcion?: string | null
  requiere_nit?: number | boolean
  estado?: number | boolean
}

interface TipoGasto {
  id: number
  nombre: string
  descripcion?: string | null
  estado?: number | boolean
}

const API_URL = 'http://localhost:4000/api'

const gastos = ref<Gasto[]>([])
const proveedores = ref<Proveedor[]>([])
const tiposComprobante = ref<TipoComprobante[]>([])
const tiposGasto = ref<TipoGasto[]>([])

const loading = ref(false)
const loadingProveedores = ref(false)
const loadingTiposComprobante = ref(false)
const loadingTiposGasto = ref(false)

const isDialogVisible = ref(false)

const errorMessage = ref('')
const successMessage = ref('')

const usuarioActualId = ref(1)

const obtenerIdUsuarioValido = (valor: unknown): number => {
  const id = Number(valor)

  if (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  ) {
    return id
  }

  console.warn(
    '⚠️ ID de usuario inválido:',
    valor,
    'Se utilizará el usuario 1.'
  )

  return 1
}

const nuevoGasto = ref({
  fondo_id: 1,
  tipo_comprobante_id: null as number | null,
  serie_comprobante: '',
  numero_comprobante: '',
  fecha_comprobante: new Date().toISOString().split('T')[0],
  proveedor_id: null as number | null,
  persona_realizo_gasto_id: 1,
  usuario_registro_id: 1,
  monto: null as number | null,
  motivo_gasto: '',
  observaciones: '',
  documento_url: '',
  tipo_gasto_id: null as number | null,
})

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Fecha', key: 'fecha_comprobante' },
  { title: 'Comprobante', key: 'tipo_comprobante' },
  { title: 'Número', key: 'numero_comprobante' },
  { title: 'Proveedor', key: 'proveedor_nombre' },
  { title: 'Tipo de gasto', key: 'tipos_gasto' },
  { title: 'Motivo', key: 'motivo_gasto' },
  { title: 'Monto', key: 'monto' },
  { title: 'Estado', key: 'estado' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

/*
|--------------------------------------------------------------------------
| USUARIO ACTUAL
|--------------------------------------------------------------------------
*/

const cargarUsuarioActual = () => {
  try {
    const userData = localStorage.getItem('userData')

    if (!userData) {
      usuarioActualId.value = 1
      nuevoGasto.value.persona_realizo_gasto_id = 1
      nuevoGasto.value.usuario_registro_id = 1
      return
    }

    const usuario = JSON.parse(userData)

    const idValido = obtenerIdUsuarioValido(usuario?.id)

    usuarioActualId.value = idValido

    nuevoGasto.value.persona_realizo_gasto_id = idValido
    nuevoGasto.value.usuario_registro_id = idValido

    console.log(
      '👤 Usuario actual:',
      usuario
    )

    console.log(
      '🆔 ID utilizado:',
      idValido
    )
  } catch (error) {
    console.error(
      'Error al obtener usuario:',
      error
    )

    usuarioActualId.value = 1

    nuevoGasto.value.persona_realizo_gasto_id = 1
    nuevoGasto.value.usuario_registro_id = 1
  }
}

/*
|--------------------------------------------------------------------------
| CARGAR GASTOS
|--------------------------------------------------------------------------
*/

const cargarGastos = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      `${API_URL}/gastos`
    )

    if (!response.ok) {
      throw new Error(
        'No se pudieron obtener los gastos.'
      )
    }

    const data = await response.json()

    gastos.value = Array.isArray(data)
      ? data
      : data.gastos || []
  } catch (error: any) {
    console.error(
      '❌ Error al cargar gastos:',
      error
    )

    errorMessage.value =
      error.message ||
      'Error al cargar los gastos.'
  } finally {
    loading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| CARGAR PROVEEDORES
|--------------------------------------------------------------------------
*/

const cargarProveedores = async () => {
  loadingProveedores.value = true

  try {
    const response = await fetch(
      `${API_URL}/proveedores`
    )

    if (!response.ok) {
      throw new Error(
        'No se pudieron obtener los proveedores.'
      )
    }

    const data = await response.json()

    proveedores.value = Array.isArray(data)
      ? data
      : data.proveedores || []

    console.log(
      '🏢 Proveedores:',
      proveedores.value
    )
  } catch (error: any) {
    console.error(
      '❌ Error al cargar proveedores:',
      error
    )

    errorMessage.value =
      error.message ||
      'Error al cargar los proveedores.'
  } finally {
    loadingProveedores.value = false
  }
}

/*
|--------------------------------------------------------------------------
| CARGAR TIPOS DE COMPROBANTE
|--------------------------------------------------------------------------
*/

const cargarTiposComprobante = async () => {
  loadingTiposComprobante.value = true

  try {
    const response = await fetch(
      `${API_URL}/tipos-comprobante`
    )

    if (!response.ok) {
      throw new Error(
        'No se pudieron obtener los tipos de comprobante.'
      )
    }

    const data = await response.json()

    tiposComprobante.value =
      Array.isArray(data)
        ? data
        : data.tiposComprobante ||
          data.tipos_comprobante ||
          []

    console.log(
      '🧾 Tipos de comprobante:',
      tiposComprobante.value
    )
  } catch (error: any) {
    console.error(
      '❌ Error al cargar tipos de comprobante:',
      error
    )

    tiposComprobante.value = []

    errorMessage.value =
      error.message ||
      'Error al cargar los tipos de comprobante.'
  } finally {
    loadingTiposComprobante.value = false
  }
}

/*
|--------------------------------------------------------------------------
| CARGAR TIPOS DE GASTO
|--------------------------------------------------------------------------
*/

const cargarTiposGasto = async () => {
  loadingTiposGasto.value = true

  try {
    const response = await fetch(
      `${API_URL}/tipos-gasto`
    )

    if (!response.ok) {
      throw new Error(
        'No se pudieron obtener los tipos de gasto.'
      )
    }

    const data = await response.json()

    tiposGasto.value =
      Array.isArray(data)
        ? data
        : data.tiposGasto ||
          data.tipos_gasto ||
          []

    console.log(
      '📂 Tipos de gasto:',
      tiposGasto.value
    )
  } catch (error: any) {
    console.error(
      '❌ Error al cargar tipos de gasto:',
      error
    )

    tiposGasto.value = []

    errorMessage.value =
      error.message ||
      'Error al cargar los tipos de gasto.'
  } finally {
    loadingTiposGasto.value = false
  }
}

/*
|--------------------------------------------------------------------------
| ABRIR DIÁLOGO
|--------------------------------------------------------------------------
*/

const abrirDialogo = () => {
  errorMessage.value = ''
  successMessage.value = ''

  const idUsuario =
    obtenerIdUsuarioValido(
      usuarioActualId.value
    )

  usuarioActualId.value = idUsuario

  nuevoGasto.value.persona_realizo_gasto_id =
    idUsuario

  nuevoGasto.value.usuario_registro_id =
    idUsuario

  isDialogVisible.value = true
}

/*
|--------------------------------------------------------------------------
| LIMPIAR FORMULARIO
|--------------------------------------------------------------------------
*/

const limpiarFormulario = () => {
  const idUsuario =
    obtenerIdUsuarioValido(
      usuarioActualId.value
    )

  nuevoGasto.value = {
    fondo_id: 1,
    tipo_comprobante_id: null,
    serie_comprobante: '',
    numero_comprobante: '',
    fecha_comprobante:
      new Date().toISOString().split('T')[0],
    proveedor_id: null,
    persona_realizo_gasto_id:
      idUsuario,
    usuario_registro_id:
      idUsuario,
    monto: null,
    motivo_gasto: '',
    observaciones: '',
    documento_url: '',
    tipo_gasto_id: null,
  }
}

/*
|--------------------------------------------------------------------------
| GUARDAR GASTO
|--------------------------------------------------------------------------
*/

const guardarGasto = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  const idUsuario =
    obtenerIdUsuarioValido(
      usuarioActualId.value
    )

  usuarioActualId.value = idUsuario

  nuevoGasto.value.persona_realizo_gasto_id =
    idUsuario

  nuevoGasto.value.usuario_registro_id =
    idUsuario

  if (!nuevoGasto.value.tipo_comprobante_id) {
    errorMessage.value =
      'Selecciona el tipo de comprobante.'
    return
  }

  if (
    !nuevoGasto.value.numero_comprobante.trim()
  ) {
    errorMessage.value =
      'Ingresa el número de comprobante.'
    return
  }

  if (!nuevoGasto.value.fecha_comprobante) {
    errorMessage.value =
      'Selecciona la fecha del comprobante.'
    return
  }

  if (!nuevoGasto.value.proveedor_id) {
    errorMessage.value =
      'Selecciona un proveedor.'
    return
  }

  if (!nuevoGasto.value.tipo_gasto_id) {
    errorMessage.value =
      'Selecciona el tipo de gasto.'
    return
  }

  if (
    !nuevoGasto.value.monto ||
    Number(nuevoGasto.value.monto) <= 0
  ) {
    errorMessage.value =
      'Ingresa un monto válido.'
    return
  }

  if (
    !nuevoGasto.value.motivo_gasto.trim()
  ) {
    errorMessage.value =
      'Ingresa el motivo del gasto.'
    return
  }

  loading.value = true

  try {
    const personaId =
      obtenerIdUsuarioValido(
        nuevoGasto.value
          .persona_realizo_gasto_id
      )

    const usuarioRegistroId =
      obtenerIdUsuarioValido(
        nuevoGasto.value
          .usuario_registro_id
      )

    const fecha =
      nuevoGasto.value.fecha_comprobante

    const datos = {
      fondo_id:
        Number(
          nuevoGasto.value.fondo_id
        ),

      tipo_comprobante_id:
        Number(
          nuevoGasto.value
            .tipo_comprobante_id
        ),

      serie_comprobante:
        nuevoGasto.value
          .serie_comprobante
          ?.trim() || null,

      numero_comprobante:
        nuevoGasto.value
          .numero_comprobante
          .trim(),

      fecha_comprobante:
        fecha,

      proveedor_id:
        Number(
          nuevoGasto.value
            .proveedor_id
        ),

      persona_realizo_gasto_id:
        personaId,

      usuario_registro_id:
        usuarioRegistroId,

      monto:
        Number(
          nuevoGasto.value.monto
        ),

      motivo_gasto:
        nuevoGasto.value
          .motivo_gasto
          .trim(),

      observaciones:
        nuevoGasto.value
          .observaciones
          ?.trim() || null,

      documento_url:
        nuevoGasto.value
          .documento_url
          ?.trim() || null,

      mes:
        Number(fecha.split('-')[1]),

      anio:
        Number(fecha.split('-')[0]),

      tipo_gasto_id:
        Number(
          nuevoGasto.value
            .tipo_gasto_id
        ),
    }

    console.log(
      '📤 DATOS ENVIADOS:',
      datos
    )

    const response = await fetch(
      `${API_URL}/gastos`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(datos),
      }
    )

    const resultado =
      await response.json()

    console.log(
      '📥 RESPUESTA DEL BACKEND:',
      resultado
    )

    if (!response.ok) {
      throw new Error(
        resultado.detalles ||
          resultado.message ||
          'No se pudo registrar el gasto.'
      )
    }

    successMessage.value =
      'Gasto registrado correctamente.'

    isDialogVisible.value = false

    limpiarFormulario()

    await cargarGastos()
  } catch (error: any) {
    console.error(
      '❌ Error al guardar gasto:',
      error
    )

    errorMessage.value =
      error.message ||
      'Error al guardar el gasto.'
  } finally {
    loading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| ELIMINAR GASTO
|--------------------------------------------------------------------------
*/

const eliminarGasto = async (
  id: number
) => {
  if (
    !confirm(
      '¿Estás seguro de eliminar este gasto?'
    )
  ) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      `${API_URL}/gastos/${id}`,
      {
        method: 'DELETE',
      }
    )

    const resultado =
      await response.json()

    if (!response.ok) {
      throw new Error(
        resultado.detalles ||
          resultado.message ||
          'No se pudo eliminar el gasto.'
      )
    }

    successMessage.value =
      'Gasto eliminado correctamente.'

    await cargarGastos()
  } catch (error: any) {
    console.error(
      '❌ Error al eliminar gasto:',
      error
    )

    errorMessage.value =
      error.message ||
      'Error al eliminar el gasto.'
  } finally {
    loading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| FORMATO MONEDA
|--------------------------------------------------------------------------
*/

const formatoMoneda = (
  valor: number
) => {
  return new Intl.NumberFormat(
    'es-GT',
    {
      style: 'currency',
      currency: 'GTQ',
    }
  ).format(Number(valor))
}

/*
|--------------------------------------------------------------------------
| FORMATO FECHA
|--------------------------------------------------------------------------
*/

const formatoFecha = (
  fecha: string
) => {
  if (!fecha) {
    return ''
  }

  const partes =
    fecha
      .split('T')[0]
      .split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

/*
|--------------------------------------------------------------------------
| COLOR ESTADO
|--------------------------------------------------------------------------
*/

const colorEstado = (
  estado: string
) => {
  switch (estado) {
    case 'aprobado':
      return 'success'

    case 'rechazado':
      return 'error'

    case 'anulado':
      return 'secondary'

    default:
      return 'warning'
  }
}

/*
|--------------------------------------------------------------------------
| INICIALIZACIÓN
|--------------------------------------------------------------------------
*/

onMounted(async () => {
  cargarUsuarioActual()

  await Promise.all([
    cargarGastos(),
    cargarProveedores(),
    cargarTiposComprobante(),
    cargarTiposGasto(),
  ])
})
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>
          Gastos
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

        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ errorMessage }}
        </VAlert>

        <div class="d-flex justify-end mb-4">
          <VBtn
            color="primary"
            prepend-icon="ri-add-line"
            @click="abrirDialogo"
          >
            Registrar gasto
          </VBtn>
        </div>

        <VDataTable
          :headers="headers"
          :items="gastos"
          :loading="loading"
          item-value="id"
          class="text-no-wrap"
        >
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

          <template #item.estado="{ item }">
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

          <template #item.actions="{ item }">
            <VBtn
              icon
              variant="text"
              color="error"
              size="small"
              @click="
                eliminarGasto(item.id)
              "
            >
              <VIcon
                icon="ri-delete-bin-line"
              />
            </VBtn>
          </template>

          <template #no-data>
            No hay gastos registrados.
          </template>
        </VDataTable>
      </VCardText>
    </VCard>

    <!-- DIÁLOGO -->
    <VDialog
      v-model="isDialogVisible"
      max-width="700"
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
              icon="ri-close-line"
            />
          </VBtn>
        </VCardTitle>

        <VCardText>
          <VRow>
            <!-- TIPO COMPROBANTE -->
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
                item-title="nombre"
                item-value="id"
                label="Tipo de comprobante *"
                placeholder="Selecciona un tipo"
                :loading="
                  loadingTiposComprobante
                "
                :disabled="
                  loadingTiposComprobante
                "
                clearable
              />
            </VCol>

            <!-- SERIE -->
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
              />
            </VCol>

            <!-- NUMERO -->
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
              />
            </VCol>

            <!-- FECHA -->
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

            <!-- PROVEEDOR -->
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

            <!-- TIPO DE GASTO -->
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
                item-title="nombre"
                item-value="id"
                label="Tipo de gasto *"
                placeholder="Selecciona un tipo"
                :loading="
                  loadingTiposGasto
                "
                :disabled="
                  loadingTiposGasto
                "
                clearable
              />
            </VCol>

            <!-- MONTO -->
            <VCol cols="12">
              <VTextField
                v-model.number="
                  nuevoGasto.monto
                "
                type="number"
                min="0"
                step="0.01"
                label="Monto *"
                placeholder="Ej. 150.00"
                prefix="Q"
              />
            </VCol>

            <!-- MOTIVO -->
            <VCol cols="12">
              <VTextarea
                v-model="
                  nuevoGasto
                    .motivo_gasto
                "
                label="Motivo del gasto *"
                placeholder="Describe el motivo del gasto"
                rows="3"
              />
            </VCol>

            <!-- OBSERVACIONES -->
            <VCol cols="12">
              <VTextarea
                v-model="
                  nuevoGasto
                    .observaciones
                "
                label="Observaciones"
                placeholder="Observaciones adicionales"
                rows="2"
              />
            </VCol>

            <!-- DOCUMENTO -->
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
```
