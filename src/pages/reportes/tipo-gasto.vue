<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface TipoGasto {
  id?: number
  nombre: string
  descripcion: string
}

// Opciones disponibles
const opcionesGastos = [
  'Viáticos y Alimentación',
  'Papelería y Útiles de Oficina',
  'Transporte y Combustible',
  'Mantenimiento y Reparaciones',
  'Servicios Públicos / Mantenimiento',
  'Envíos y Mensajería',
  'Otros Gastos Menores',
]

// Lista de tipos de gasto
const tiposGasto = ref<TipoGasto[]>([])

// Estados
const loading = ref(false)
const dialog = ref(false)

// Nuevo tipo de gasto
const nuevoGasto = ref<TipoGasto>({
  nombre: '',
  descripcion: '',
})

// Encabezados de la tabla
const headers = [
  {
    title: 'ID',
    key: 'id',
    sortable: true,
  },
  {
    title: 'Tipo de Gasto',
    key: 'nombre',
    sortable: true,
  },
  {
    title: 'Descripción',
    key: 'descripcion',
    sortable: true,
  },
  {
    title: 'Acciones',
    key: 'acciones',
    sortable: false,
    align: 'center',
  },
]

// =====================================================
// 1. OBTENER TIPOS DE GASTO - GET
// =====================================================

const fetchTiposGasto = async () => {
  loading.value = true

  try {
    const res = await fetch(
      'http://localhost:4000/api/tipos-gasto'
    )

    if (res.ok) {
      tiposGasto.value = await res.json()
    } else {
      console.error(
        'Error al obtener los tipos de gasto:',
        res.status
      )
    }
  } catch (error) {
    console.error(
      'Error de red al obtener tipos de gasto:',
      error
    )
  } finally {
    loading.value = false
  }
}

// =====================================================
// 2. GUARDAR TIPO DE GASTO - POST
// =====================================================

const guardarTipoGasto = async () => {
  const nombreTexto =
    typeof nuevoGasto.value.nombre === 'object'
      ? (nuevoGasto.value.nombre as any)?.title || ''
      : String(nuevoGasto.value.nombre || '').trim()

  if (!nombreTexto) {
    alert(
      'Por favor selecciona o escribe un Tipo de Gasto.'
    )

    return
  }

  try {
    const payload = {
      nombre: nombreTexto,
      descripcion:
        nuevoGasto.value.descripcion || '',
    }

    const res = await fetch(
      'http://localhost:4000/api/tipos-gasto',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (res.ok) {
      // Actualizar tabla
      await fetchTiposGasto()

      // Cerrar modal
      dialog.value = false

      // Limpiar formulario
      nuevoGasto.value = {
        nombre: '',
        descripcion: '',
      }
    } else {
      let errData: any = {}

      try {
        errData = await res.json()
      } catch {
        // Si el servidor no devuelve JSON
      }

      alert(
        `Error al guardar: ${
          errData.message || 'Error en el servidor'
        }`
      )
    }
  } catch (error) {
    console.error(
      'Error de conexión:',
      error
    )

    alert(
      'No se pudo conectar con la API en http://localhost:4000'
    )
  }
}

// =====================================================
// 3. ELIMINAR TIPO DE GASTO - DELETE
// =====================================================

const eliminarTipoGasto = async (id?: number) => {
  // Verificar ID
  if (!id) {
    alert('No se encontró el ID del registro.')

    return
  }

  // Confirmación
  const confirmar = confirm(
    '¿Estás seguro de que deseas eliminar este tipo de gasto?'
  )

  if (!confirmar) {
    return
  }

  try {
    const res = await fetch(
      `http://localhost:4000/api/tipos-gasto/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (res.ok) {
      // Actualizar tabla después de eliminar
      await fetchTiposGasto()
    } else {
      let errData: any = {}

      try {
        errData = await res.json()
      } catch {
        // Si el servidor no devuelve JSON
      }

      alert(
        `Error al eliminar: ${
          errData.message || 'Error en el servidor'
        }`
      )
    }
  } catch (error) {
    console.error(
      'Error de conexión al eliminar:',
      error
    )

    alert(
      'No se pudo conectar con la API para eliminar el registro.'
    )
  }
}

// =====================================================
// 4. CARGAR DATOS AL INICIAR
// =====================================================

onMounted(() => {
  fetchTiposGasto()
})
</script>

<template>
  <div>

    <!-- ========================================= -->
    <!-- ENCABEZADO -->
    <!-- ========================================= -->

    <div
      class="d-flex justify-space-between align-center mb-6"
    >
      <div>
        <h2 class="text-h4 font-weight-bold">
          Tipos de Gasto
        </h2>

        <p class="text-body-1 text-medium-emphasis">
          Administración de tipos de gasto de Caja Chica.
        </p>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="dialog = true"
      >
        Nuevo Tipo de Gasto
      </VBtn>
    </div>


    <!-- ========================================= -->
    <!-- TABLA -->
    <!-- ========================================= -->

    <VCard>

      <VDataTable
        :headers="headers"
        :items="tiposGasto"
        :loading="loading"
        no-data-text="No hay tipos de gasto registrados."
      >

        <!-- COLUMNA DE ACCIONES -->

        <template #item.acciones="{ item }">

          <div class="d-flex justify-center">

            <VBtn
              color="error"
              variant="tonal"
              size="small"
              @click="eliminarTipoGasto(item.id)"
            >

              <VIcon
                icon="tabler-trash"
                class="me-1"
              />

              Eliminar

            </VBtn>

          </div>

        </template>

      </VDataTable>

    </VCard>


    <!-- ========================================= -->
    <!-- MODAL NUEVO TIPO DE GASTO -->
    <!-- ========================================= -->

    <VDialog
      v-model="dialog"
      max-width="500px"
    >

      <VCard>

        <!-- TÍTULO -->

        <VCardTitle>
          Seleccionar Tipo de Gasto
        </VCardTitle>


        <!-- CONTENIDO -->

        <VCardText>

          <VRow>

            <!-- TIPO DE GASTO -->

            <VCol cols="12">

              <VCombobox
                v-model="nuevoGasto.nombre"
                :items="opcionesGastos"
                label="Tipo de Gasto *"
                placeholder="Selecciona o escribe una opción"
                clearable
              />

            </VCol>


            <!-- DESCRIPCIÓN -->

            <VCol cols="12">

              <VTextarea
                v-model="nuevoGasto.descripcion"
                label="Descripción adicional"
                placeholder="Notas o justificación de este tipo de gasto"
                rows="3"
              />

            </VCol>

          </VRow>

        </VCardText>


        <!-- BOTONES -->

        <VCardActions
          class="justify-end pe-6 pb-4"
        >

          <!-- CANCELAR -->

          <VBtn
            color="secondary"
            variant="outlined"
            @click="dialog = false"
          >
            Cancelar
          </VBtn>


          <!-- GUARDAR -->

          <VBtn
            color="primary"
            @click="guardarTipoGasto"
          >
            Guardar en BD
          </VBtn>

        </VCardActions>

      </VCard>

    </VDialog>

  </div>
</template>
