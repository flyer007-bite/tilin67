<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

interface Ingreso {
  id: number
  fondo_id: number
  usuario_id: number
  usuario_nombre?: string
  monto: number
  tipo_ingreso: string
  descripcion: string
  documento_asociado_url?: string
  observaciones?: string
  fecha: string
  estado: string
}
interface Fondo { id: number; mes: number; anio: number; monto_inicial: string | number; numero_cheque?: string }
interface Rule { action: string; subject: string }

const ingresosList = ref<Ingreso[]>([])
const ordenId = ref<'asc' | 'desc'>('asc')
const ingresosOrdenados = computed(() => [...ingresosList.value].sort((a, b) =>
  ordenId.value === 'asc' ? Number(a.id) - Number(b.id) : Number(b.id) - Number(a.id),
))
const fondos = ref<Fondo[]>([])
const isLoadingTable = ref(false)
const isDialogVisible = ref(false)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const refVForm = ref<any>()

const userData = useCookie<Record<string, any> | null>('userData')
const abilityRules = useCookie<Rule[] | null>('userAbilityRules')
const isAdmin = computed(() => ['admin', 'administrador'].includes(String(userData.value?.role || '').toLowerCase()))
const canIngreso = (action: string) => isAdmin.value || (abilityRules.value || []).some(rule =>
  (rule.subject === 'ingresos' || rule.subject === 'all') && (rule.action === action || rule.action === 'manage'),
)
const puedeCrear = computed(() => canIngreso('crear'))
const puedeEliminar = computed(() => canIngreso('eliminar'))

const form = ref({
  fondo_id: null as number | null,
  monto: null as number | null,
  tipo_ingreso: null as string | null,
  descripcion: '',
  documento_asociado_url: '',
  observaciones: '',
})

const tiposIngreso = ['Reembolso', 'Asignación Inicial', 'Inyección de Capital', 'Ajuste de Caja', 'Otros']
const montoConDosDecimales = (value: unknown) => {
  const numero = Number(value)
  if (!Number.isFinite(numero) || numero <= 0 || numero > 99999999.99) return false
  const centavos = Math.round(numero * 100)
  return Math.abs(numero * 100 - centavos) < 0.000001
}
const rules = {
  required: (value: any) => !!value || 'Este campo es obligatorio',
  minAmount: (value: number) =>
    montoConDosDecimales(value)
      || 'Ingrese un valor mayor a Q 0.00 y con máximo dos decimales.',
  maxLength: (maximo: number) => (value: string) => !value || value.trim().length <= maximo || `Máximo ${maximo} caracteres.`,
}
const getError = (error: any, fallback: string) => error?.data?.message || error?.message || fallback

const fetchIngresos = async () => {
  isLoadingTable.value = true
  try {
    ingresosList.value = await $api<Ingreso[]>('/ingresos')
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudieron cargar los ingresos.')
  }
  finally {
    isLoadingTable.value = false
  }
}

const fetchFondos = async () => {
  try {
    fondos.value = await $api<Fondo[]>('/ingresos/fondos-activos')
    if (fondos.value.length === 1)
      form.value.fondo_id = fondos.value[0].id
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudieron cargar los fondos activos.')
  }
}

const limpiarFormulario = () => {
  form.value = {
    fondo_id: fondos.value.length === 1 ? fondos.value[0].id : null,
    monto: null,
    tipo_ingreso: null,
    descripcion: '',
    documento_asociado_url: '',
    observaciones: '',
  }
  errorMessage.value = null
  successMessage.value = null
  refVForm.value?.resetValidation?.()
}

const registrarIngreso = async () => {
  errorMessage.value = null
  successMessage.value = null
  const result = await refVForm.value?.validate?.()
  if (result && !result.valid) {
    errorMessage.value = 'Completa todos los campos obligatorios.'
    return
  }
  if (!form.value.fondo_id) {
    errorMessage.value = 'Selecciona un fondo activo.'
    return
  }

  isSubmitting.value = true
  try {
    await $api('/ingresos', {
      method: 'POST',
      body: {
        ...form.value,
        fondo_id: Number(form.value.fondo_id),
        monto: Number(form.value.monto),
      },
    })
    successMessage.value = 'Ingreso registrado correctamente.'
    await fetchIngresos()
    isDialogVisible.value = false
    limpiarFormulario()
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudo guardar el ingreso.')
  }
  finally {
    isSubmitting.value = false
  }
}

const eliminarIngreso = async (id: number) => {
  if (!confirm(`¿Deseas eliminar el ingreso #${id}?`)) return
  isDeleting.value = true
  try {
    const result = await $api<{ message: string }>(`/ingresos/${id}`, { method: 'DELETE' })
    successMessage.value = result.message
    await fetchIngresos()
  }
  catch (error: any) {
    errorMessage.value = getError(error, 'No se pudo eliminar el ingreso.')
  }
  finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchIngresos(), fetchFondos()])
})
</script>

<template>
  <VRow class="product-page">
    <!-- ENCABEZADO -->
    <VCol
      cols="12"
      class="page-hero d-flex justify-space-between align-center flex-wrap ga-4"
    >
      <div>
        <h3 class="text-h4 font-weight-bold">
          <VIcon icon="tabler-cash-banknote" color="primary" class="me-2" /> Ingresos de Caja Chica
        </h3>

        <p class="text-subtitle-1 text-muted mb-0">
          Gestión y registro de entradas de efectivo
        </p>
      </div>

      <!-- BOTÓN REGISTRAR -->
      <VDialog
        v-model="isDialogVisible"
        max-width="600"
        persistent
      >
        <template #activator="{ props }">
          <VBtn
            v-if="puedeCrear"
            v-bind="props"
            color="primary"
            @click="limpiarFormulario"
          >
            + Registrar Ingreso
          </VBtn>
        </template>

        <!-- MODAL -->
        <VCard title="Registrar Nuevo Ingreso">
          <VCardText>
            <!-- ÉXITO -->
            <VAlert
              v-if="successMessage"
              color="success"
              variant="tonal"
              class="mb-4"
            >
              {{ successMessage }}
            </VAlert>

            <!-- FORMULARIO -->
            <VForm
              ref="refVForm"
              @submit.prevent="registrarIngreso"
            >
              <VRow>
                <VCol cols="12">
                  <AppSelect
                    v-model="form.fondo_id"
                    :items="fondos"
                    :item-title="(item: Fondo) => `Fondo ${item.id} · ${String(item.mes).padStart(2, '0')}/${item.anio}`"
                    item-value="id"
                    label="Fondo activo *"
                    placeholder="Seleccione un fondo"
                    :rules="[rules.required]"
                    :disabled="fondos.length === 1"
                  />
                </VCol>

                <!-- TIPO -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="form.tipo_ingreso"
                    :items="tiposIngreso"
                    label="Tipo de Ingreso *"
                    placeholder="Seleccione uno"
                    :rules="[rules.required]"
                  />
                </VCol>

                <!-- MONTO -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model.number="form.monto"
                    label="Monto (Q) *"
                    placeholder="0.00"
                    type="number"
                    min="0.01"
                    max="99999999.99"
                    step="0.01"
                    prefix="Q"
                    :rules="[rules.required, rules.minAmount]"
                  />
                </VCol>

                <!-- DESCRIPCIÓN -->
                <VCol cols="12">
                  <AppTextField
                    v-model="form.descripcion"
                    label="Descripción *"
                    placeholder="Escriba el motivo o justificación"
                    :rules="[rules.required, rules.maxLength(500)]"
                    maxlength="500"
                  />
                </VCol>

                <!-- COMPROBANTE -->
                <VCol cols="12">
                  <AppTextField
                    v-model="form.documento_asociado_url"
                    label="URL de Comprobante / Boleta (Opcional)"
                    placeholder="https://..."
                    :rules="[rules.maxLength(500)]"
                    maxlength="500"
                  />
                </VCol>

                <!-- OBSERVACIONES -->
                <VCol cols="12">
                  <AppTextarea
                    v-model="form.observaciones"
                    label="Observaciones (Opcional)"
                    placeholder="Notas adicionales..."
                    rows="2"
                    :rules="[rules.maxLength(5000)]"
                    maxlength="5000"
                  />
                </VCol>
              </VRow>
            </VForm>
          </VCardText>

          <!-- ACCIONES -->
          <VCardActions class="justify-end">
            <VBtn
              color="secondary"
              variant="tonal"
              :disabled="isSubmitting"
              @click="isDialogVisible = false"
            >
              Cancelar
            </VBtn>

            <VBtn
              color="primary"
              :loading="isSubmitting"
              @click="registrarIngreso"
            >
              Guardar Ingreso
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </VCol>

    <!-- MENSAJES -->
    <AppErrorAlert v-model="errorMessage" />

    <VCol
      v-if="successMessage"
      cols="12"
    >
      <VAlert
        color="success"
        variant="tonal"
        closable
        @click:close="successMessage = null"
      >
        {{ successMessage }}
      </VAlert>
    </VCol>

    <!-- TABLA -->
    <VCol cols="12">
      <VCard class="module-card">
        <VTable class="text-no-wrap product-table">
          <thead>
            <tr>
              <th :aria-sort="ordenId === 'asc' ? 'ascending' : 'descending'">
                <VBtn
                  variant="text"
                  size="small"
                  :append-icon="ordenId === 'asc' ? 'tabler-arrow-up' : 'tabler-arrow-down'"
                  :aria-label="ordenId === 'asc' ? 'Ordenar por ID de mayor a menor' : 'Ordenar por ID de menor a mayor'"
                  @click="ordenId = ordenId === 'asc' ? 'desc' : 'asc'"
                >
                  No.
                </VBtn>
              </th>
              <th>FECHA</th>
              <th>TIPO</th>
              <th>DESCRIPCIÓN</th>
              <th>REGISTRADO POR</th>
              <th>MONTO</th>
              <th>ESTADO</th>
              <th class="text-center">
                ACCIONES
              </th>
            </tr>
          </thead>

          <tbody>
            <!-- CARGANDO -->
            <tr v-if="isLoadingTable">
              <td
                colspan="8"
                class="text-center py-4"
              >
                Cargando registros...
              </td>
            </tr>

            <!-- SIN REGISTROS -->
            <tr v-else-if="ingresosList.length === 0">
              <td
                colspan="8"
                class="text-center py-4"
              >
                No hay ingresos registrados.
              </td>
            </tr>

            <!-- REGISTROS -->
            <tr
              v-for="(item, index) in isLoadingTable ? [] : ingresosOrdenados"
              :key="item.id"
            >
              <td>{{ index + 1 }}</td>

              <td>
                {{ new Date(item.fecha).toLocaleDateString() }}
              </td>

              <td>
                <VChip
                  color="info"
                  size="small"
                >
                  {{ item.tipo_ingreso }}
                </VChip>
              </td>

              <td>
                {{ item.descripcion }}
              </td>

              <td>
                {{ item.usuario_nombre || 'Sistema' }}
              </td>

              <td class="font-weight-bold text-success">
                Q {{ Number(item.monto).toFixed(2) }}
              </td>

              <td>
                <VChip
                  :color="
                    item.estado === 'activo'
                      ? 'success'
                      : 'error'
                  "
                  size="small"
                >
                  {{ item.estado }}
                </VChip>
              </td>

              <!-- BOTÓN ELIMINAR -->
              <td class="text-center">
                <VBtn
                  v-if="puedeEliminar"
                  title="Eliminar ingreso"
                  aria-label="Eliminar ingreso"
                  icon
                  size="small"
                  color="error"
                  variant="tonal"
                  :loading="isDeleting"
                  :disabled="isDeleting"
                  @click="eliminarIngreso(item.id)"
                >
                  <VIcon icon="tabler-trash" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>
  </VRow>
</template>
