<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

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

const gastos = ref<Gasto[]>([])
const proveedores = ref<Proveedor[]>([])

const loading = ref(false)
const loadingProveedores = ref(false)
const isDialogVisible = ref(false)

const errorMessage = ref('')
const successMessage = ref('')
const esOperador = computed(() => {
  try {
    const role = String(JSON.parse(localStorage.getItem('userData') || '{}').role || '').toLowerCase()
    return role === 'operador caja chica' || role.endsWith(' - usuario')
  } catch {
    return false
  }
})

/*
 * ID del usuario actual de la base de datos.
 *
 * En tu BD los usuarios tienen IDs como:
 * 1 = Administrador
 * 2 = Usuario
 * 3 = Control
 *
 * Si localStorage tiene un ID inválido o demasiado grande,
 * utilizamos 1 como usuario por defecto.
 */
const usuarioActualId = ref(1)

/*
 * Obtiene un ID de usuario válido para la BD.
 */
const obtenerIdUsuarioValido = (valor: unknown): number => {
  const id = Number(valor)

  /*
   * MySQL INT:
   * máximo positivo: 2147483647
   *
   * Number.isSafeInteger también evita números
   * demasiado grandes para manejarse correctamente
   * en JavaScript.
   */
  if (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  ) {
    return id
  }

  console.warn(
    '⚠️ ID de usuario inválido detectado:',
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
  persona_realizo_gasto_nombre: '',
  usuario_registro_id: 1,
  monto: null as number | null,
  motivo_gasto: '',
  observaciones: '',
  documento_url: '',
  tipo_gasto_id: null as number | null,
})

const tiposComprobante = [
  { title: 'Factura', value: 1 },
  { title: 'Recibo', value: 2 },
  { title: 'Vale de Caja', value: 3 },
  { title: 'Ticket', value: 4 },
]

const tiposGasto = [
  { title: 'Alimentación', value: 1 },
  { title: 'Transporte', value: 2 },
  { title: 'Papelería', value: 3 },
  { title: 'Limpieza', value: 4 },
  { title: 'Mantenimiento', value: 5 },
  { title: 'Servicios', value: 6 },
  { title: 'Compras', value: 7 },
  { title: 'Otros', value: 8 },
]

const headers = [
  { title: 'ID', key: 'id' },
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

/*
 * CARGAR USUARIO ACTUAL
 */
const cargarUsuarioActual = () => {
  try {
    const userData = localStorage.getItem('userData')

    console.log('👤 userData encontrado:', userData)

    if (!userData) {
      console.warn(
        '⚠️ No existe userData. Se utilizará el usuario 1.'
      )

      usuarioActualId.value = 1
      nuevoGasto.value.persona_realizo_gasto_id = 1
      nuevoGasto.value.usuario_registro_id = 1

      return
    }

    const usuario = JSON.parse(userData)

    console.log('👤 Usuario almacenado:', usuario)
    console.log('🆔 ID almacenado:', usuario?.id)

    const idValido = obtenerIdUsuarioValido(usuario?.id)

    usuarioActualId.value = idValido

    nuevoGasto.value.persona_realizo_gasto_id = idValido
    nuevoGasto.value.usuario_registro_id = idValido

    console.log(
      '✅ ID de usuario utilizado para el gasto:',
      idValido
    )
  } catch (error) {
    console.warn(
      '⚠️ No se pudo obtener el usuario actual:',
      error
    )

    usuarioActualId.value = 1

    nuevoGasto.value.persona_realizo_gasto_id = 1
    nuevoGasto.value.usuario_registro_id = 1
  }
}

/*
 * CARGAR GASTOS
 */
const cargarGastos = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      'http://localhost:4000/api/gastos'
    )

    if (!response.ok) {
      throw new Error(
        'No se pudieron obtener los gastos.'
      )
    }

    const data = await response.json()

    gastos.value = data
  } catch (error: any) {
    console.error(
      'Error al cargar gastos:',
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
 * CARGAR PROVEEDORES
 */
const cargarProveedores = async () => {
  loadingProveedores.value = true

  try {
    const response = await fetch(
      'http://localhost:4000/api/proveedores'
    )

    if (!response.ok) {
      throw new Error(
        'No se pudieron obtener los proveedores.'
      )
    }

    const data = await response.json()

    proveedores.value = data
  } catch (error: any) {
    console.error(
      'Error al cargar proveedores:',
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
 * ABRIR DIÁLOGO
 */
const abrirDialogo = () => {
  errorMessage.value = ''
  successMessage.value = ''

  /*
   * Aseguramos que el usuario actual
   * siempre tenga un ID válido.
   */
  const idUsuario = obtenerIdUsuarioValido(
    usuarioActualId.value
  )

  usuarioActualId.value = idUsuario

  nuevoGasto.value.usuario_registro_id = idUsuario

  isDialogVisible.value = true
}

/*
 * LIMPIAR FORMULARIO
 */
const limpiarFormulario = () => {
  const idUsuario = obtenerIdUsuarioValido(
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
    persona_realizo_gasto_id: idUsuario,
    persona_realizo_gasto_nombre: '',
    usuario_registro_id: idUsuario,
    monto: null,
    motivo_gasto: '',
    observaciones: '',
    documento_url: '',
    tipo_gasto_id: null,
  }
}

/*
 * GUARDAR GASTO
 */
const guardarGasto = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  /*
   * Validar usuario antes de enviar.
   */
  const idUsuario = obtenerIdUsuarioValido(
    usuarioActualId.value
  )

  usuarioActualId.value = idUsuario

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

  if (nuevoGasto.value.numero_comprobante.trim().length > 100 || (nuevoGasto.value.serie_comprobante?.trim().length || 0) > 50) {
    errorMessage.value = 'No se puede ingresar ese comprobante. Ingresa un número de hasta 100 caracteres y una serie de hasta 50.'
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

  if (!nuevoGasto.value.persona_realizo_gasto_nombre.trim()) {
    errorMessage.value = 'Escribe el nombre de quien realizó el gasto.'
    return
  }

  if (nuevoGasto.value.persona_realizo_gasto_nombre.trim().length > 150) {
    errorMessage.value = 'No se puede ingresar un nombre mayor de 150 caracteres. Ingresa el nombre completo de quien realizó el gasto.'
    return
  }

  if (!nuevoGasto.value.tipo_gasto_id) {
    errorMessage.value =
      'Selecciona el tipo de gasto.'
    return
  }

  if (
    !nuevoGasto.value.monto ||
    Number(nuevoGasto.value.monto) <= 0 ||
    Number(nuevoGasto.value.monto) > 99999999.99 ||
    Math.round(Number(nuevoGasto.value.monto) * 100) !== Number(nuevoGasto.value.monto) * 100
  ) {
    errorMessage.value =
      'No se puede ingresar ese monto. Ingresa un valor mayor a Q 0.00 y con máximo dos decimales.'
    return
  }

  if (
    !nuevoGasto.value.motivo_gasto.trim()
  ) {
    errorMessage.value =
      'Ingresa el motivo del gasto.'
    return
  }

  if (nuevoGasto.value.motivo_gasto.trim().length > 500 || (nuevoGasto.value.observaciones?.trim().length || 0) > 5000) {
    errorMessage.value = 'No se puede ingresar ese texto. Ingresa un motivo de hasta 500 caracteres y observaciones de hasta 5,000.'
    return
  }

  loading.value = true

  try {
    /*
     * Validar nuevamente el usuario.
     */
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

    /*
     * Fecha.
     */
    const fecha = new Date(
      nuevoGasto.value.fecha_comprobante +
        'T00:00:00'
    )

    /*
     * Datos que se enviarán al backend.
     */
    const datos = {
      fondo_id:
        Number(nuevoGasto.value.fondo_id),

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
        nuevoGasto.value
          .fecha_comprobante,

      proveedor_id:
        Number(
          nuevoGasto.value
            .proveedor_id
        ),

      /*
       * IMPORTANTE:
       * Ambos IDs ahora son números enteros
       * válidos para la tabla usuarios.
       */
      persona_realizo_gasto_id:
        personaId,

      persona_realizo_gasto_nombre:
        nuevoGasto.value.persona_realizo_gasto_nombre.trim(),

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
        fecha.getMonth() + 1,

      anio:
        fecha.getFullYear(),

      tipo_gasto_id:
        Number(
          nuevoGasto.value
            .tipo_gasto_id
        ),
    }

    /*
     * Mostrar en consola exactamente
     * qué estamos enviando.
     */
    console.log(
      '📤 DATOS ENVIADOS AL BACKEND:',
      datos
    )

    const response = await fetch(
      'http://localhost:4000/api/gastos',
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
      'Error al guardar gasto:',
      error
    )

    errorMessage.value =
      error.message ||
      'Error al guardar el gasto.'
  } finally {
    loading.value = false
  }
}

const actualizarEstado = async (gasto: Gasto, estado: 'aprobado' | 'rechazado') => {
  const accion = estado === 'aprobado'
    ? 'aprobar'
    : gasto.estado === 'aprobado' ? 'desaprobar' : 'rechazar'
  if (!confirm(`¿Deseas ${accion} el gasto #${gasto.id}?`)) return

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`http://localhost:4000/api/gastos/${gasto.id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ estado, usuario_id: usuarioActualId.value }),
    })
    const resultado = await response.json()
    if (!response.ok) throw new Error(resultado.message || 'No se pudo actualizar el gasto.')
    successMessage.value = resultado.message
    await cargarGastos()
  } catch (error: any) {
    errorMessage.value = error.message || 'No se pudo actualizar el gasto.'
  } finally {
    loading.value = false
  }
}

/*
 * ELIMINAR GASTO
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
      `http://localhost:4000/api/gastos/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
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
      'Error al eliminar gasto:',
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
 * FORMATO MONEDA
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
 * FORMATO FECHA
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
 * COLOR DEL ESTADO
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
 * INICIALIZACIÓN
 */
onMounted(async () => {
  cargarUsuarioActual()

  await Promise.all([
    cargarGastos(),
    cargarProveedores(),
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
          closable
          class="mb-4"
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
              v-if="!esOperador && item.estado === 'pendiente'"
              icon
              variant="text"
              color="success"
              size="small"
              title="Aprobar gasto"
              @click="actualizarEstado(item, 'aprobado')"
            >
              <VIcon icon="ri-check-line" />
            </VBtn>
            <VBtn
              v-if="!esOperador && item.estado === 'pendiente'"
              icon
              variant="text"
              color="warning"
              size="small"
              title="Rechazar gasto"
              @click="actualizarEstado(item, 'rechazado')"
            >
              <VIcon icon="ri-close-line" />
            </VBtn>
            <VBtn
              v-if="!esOperador && item.estado === 'aprobado'"
              icon
              variant="text"
              color="warning"
              size="small"
              title="Desaprobar gasto"
              @click="actualizarEstado(item, 'rechazado')"
            >
              <VIcon icon="ri-thumb-down-line" />
            </VBtn>
            <VBtn
              v-if="!esOperador"
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
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="nuevoGasto.persona_realizo_gasto_nombre"
                label="Nombre de quien realizó el gasto *"
                placeholder="Escribe el nombre completo"
                maxlength="150"
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
