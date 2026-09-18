```vue
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

// --- ESTADOS Y TIPOS ---
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

const ingresosList = ref<Ingreso[]>([])
const isLoadingTable = ref(false)

const isDialogVisible = ref(false)
const isSubmitting = ref(false)
const isDeleting = ref(false)

// Mensajes de Feedback
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const esOperador = computed(() => {
  try {
    const role = String(JSON.parse(localStorage.getItem('userData') || '{}').role || '').toLowerCase()
    return role === 'operador caja chica' || role.endsWith(' - usuario')
  } catch {
    return false
  }
})

const refVForm = ref()

const form = ref({
  fondo_id: 1,
  monto: null as number | null,
  tipo_ingreso: null as string | null,
  descripcion: '',
  documento_asociado_url: '',
  observaciones: '',
})

const tiposIngreso = [
  'Reembolso',
  'Asignación Inicial',
  'Inyección de Capital',
  'Ajuste de Caja',
  'Otros',
]

// --- REGLAS DE VALIDACIÓN ---
const rules = {
  required: (value: any) => !!value || 'Este campo es obligatorio',
  minAmount: (value: number) =>
    (value && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 99999999.99 && Math.round(Number(value) * 100) === Number(value) * 100) || 'No se puede ingresar ese monto. Ingrese un valor mayor a Q 0.00 y con máximo dos decimales.',
  maxLength: (maximo: number) => (value: string) => !value || value.trim().length <= maximo || `No se puede ingresar más de ${maximo} caracteres. Ingrese una descripción más corta.`,
}

// --- CARGAR INGRESOS ---
const fetchIngresos = async () => {
  isLoadingTable.value = true

  try {
    const response = await fetch('http://localhost:4000/api/ingresos')

    if (response.ok) {
      ingresosList.value = await response.json()
    } else {
      errorMessage.value = 'No se pudieron cargar los ingresos.'
    }
  } catch (error) {
    console.error('Error al cargar la lista de ingresos:', error)
    errorMessage.value = 'No se pudo conectar con el servidor.'
  } finally {
    isLoadingTable.value = false
  }
}

// --- LIMPIAR FORMULARIO ---
const limpiarFormulario = () => {
  form.value = {
    fondo_id: 1,
    monto: null,
    tipo_ingreso: null,
    descripcion: '',
    documento_asociado_url: '',
    observaciones: '',
  }

  errorMessage.value = null
  successMessage.value = null

  refVForm.value?.resetValidation()
}

// --- REGISTRAR INGRESO ---
const registrarIngreso = async () => {
  errorMessage.value = null
  successMessage.value = null

  const { valid } = await refVForm.value.validate()

  if (!valid) {
    errorMessage.value =
      'Por favor, completa todos los campos obligatorios (*).'
    return
  }

  try {
    isSubmitting.value = true

    const userData = JSON.parse(
      localStorage.getItem('userData') || '{}'
    )

    const response = await fetch(
      'http://localhost:4000/api/ingresos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form.value,
          usuario_id: userData.id || 1,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.message || 'Ocurrió un error al guardar el ingreso.'
      return
    }

    successMessage.value =
      '¡Ingreso registrado exitosamente!'

    await fetchIngresos()

    setTimeout(() => {
      isDialogVisible.value = false
      limpiarFormulario()
    }, 1200)

  } catch (error) {
    console.error('Error al guardar ingreso:', error)

    errorMessage.value =
      'No se pudo establecer conexión con el servidor backend.'
  } finally {
    isSubmitting.value = false
  }
}

// --- ELIMINAR INGRESO ---
const eliminarIngreso = async (id: number) => {
  const confirmar = confirm(
    `¿Estás seguro de que deseas eliminar el ingreso #${id}?`
  )

  if (!confirmar)
    return

  try {
    isDeleting.value = true
    errorMessage.value = null
    successMessage.value = null

    const response = await fetch(
      `http://localhost:4000/api/ingresos/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value =
        data.message || 'No se pudo eliminar el ingreso.'
      return
    }

    successMessage.value =
      'Ingreso eliminado correctamente.'

    // Actualizar la tabla
    await fetchIngresos()

  } catch (error) {
    console.error('Error al eliminar ingreso:', error)

    errorMessage.value =
      'No se pudo conectar con el servidor backend.'
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  fetchIngresos()
})
</script>

<template>
  <VRow>
    <!-- ENCABEZADO -->
    <VCol
      cols="12"
      class="d-flex justify-space-between align-center"
    >
      <div>
        <h3 class="text-h4 font-weight-bold">
          Ingresos de Caja Chica
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
            <!-- ERROR -->
            <VAlert
              v-if="errorMessage"
              color="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="errorMessage = null"
            >
              {{ errorMessage }}
            </VAlert>

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
    <VCol
      v-if="errorMessage"
      cols="12"
    >
      <VAlert
        color="error"
        variant="tonal"
        closable
        @click:close="errorMessage = null"
      >
        {{ errorMessage }}
      </VAlert>
    </VCol>

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
      <VCard>
        <VTable class="text-no-wrap">
          <thead>
            <tr>
              <th>ID</th>
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
              v-for="item in ingresosList"
              :key="item.id"
            >
              <td>
                #{{ item.id }}
              </td>

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
                  v-if="!esOperador"
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
```
