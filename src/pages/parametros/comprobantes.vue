<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface TipoComprobante {
  id?: number
  nombre: string
  descripcion: string
}

const opcionesComprobantes = [
  'Factura Electrónica (FEL)',
  'Recibo de Caja',
  'Ticket / Voucher',
  'Vale de Caja Chica',
  'Factura Especial'
]

const tiposComprobante = ref<TipoComprobante[]>([])
const loading = ref(false)
const dialog = ref(false)

const nuevoComprobante = ref<TipoComprobante>({
  nombre: '',
  descripcion: ''
})

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Tipo de Comprobante', key: 'nombre' },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center' }
]

// 1. Obtener registros (GET)
const fetchTiposComprobante = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:4000/api/tipos-comprobante')
    if (res.ok) {
      tiposComprobante.value = await res.json()
    } else {
      console.error('Error al obtener datos del servidor')
    }
  } catch (error) {
    console.error('Error de red al obtener tipos de comprobante:', error)
  } finally {
    loading.value = false
  }
}

// 2. Guardar registro (POST)
const guardarTipoComprobante = async () => {
  const nombreTexto = typeof nuevoComprobante.value.nombre === 'object' 
    ? (nuevoComprobante.value.nombre as any)?.title || '' 
    : String(nuevoComprobante.value.nombre || '').trim()

  if (!nombreTexto) {
    alert('Por favor selecciona o escribe un Tipo de Comprobante.')
    return
  }

  try {
    const payload = {
      nombre: nombreTexto,
      descripcion: nuevoComprobante.value.descripcion || ''
    }

    const res = await fetch('http://localhost:4000/api/tipos-comprobante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      await fetchTiposComprobante()
      dialog.value = false
      nuevoComprobante.value = { nombre: '', descripcion: '' }
    } else {
      const errData = await res.json()
      alert(`Error al guardar: ${errData.message || 'Error en el servidor'}`)
    }
  } catch (error) {
    console.error('Error de conexión:', error)
    alert('No se pudo conectar con la API en http://localhost:4000')
  }
}

// 3. Eliminar registro (DELETE)
const eliminarTipoComprobante = async (id?: number) => {
  if (!id) return
  if (!confirm('¿Estás seguro de que deseas eliminar este tipo de comprobante?')) return

  try {
    const res = await fetch(`http://localhost:4000/api/tipos-comprobante/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      await fetchTiposComprobante()
    } else {
      const errData = await res.json()
      alert(`Error al eliminar: ${errData.message || 'Error en el servidor'}`)
    }
  } catch (error) {
    console.error('Error de conexión al eliminar:', error)
    alert('No se pudo conectar con la API para eliminar el registro.')
  }
}

onMounted(fetchTiposComprobante)
</script>

<template>
  <div>
    <!-- Encabezado -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h2 class="text-h4 font-weight-bold">Tipos de Comprobante</h2>
        <p class="text-body-1 text-medium-emphasis">
          Catálogo de documentos de soporte para la Caja Chica.
        </p>
      </div>

      <VBtn color="primary" prepend-icon="tabler-plus" @click="dialog = true">
        Nuevo Comprobante
      </VBtn>
    </div>

    <!-- Tabla -->
    <VCard>
      <VDataTable
        :headers="headers"
        :items="tiposComprobante"
        :loading="loading"
        no-data-text="No hay tipos de comprobante registrados."
      >
        <template #[`item.acciones`]="{ item }">
          <VBtn
            icon
            size="small"
            color="primary"
            variant="text"
            @click="eliminarTipoComprobante(item.id)"
          >
            <VIcon icon="tabler-trash" color="primary" />
          </VBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Modal -->
    <VDialog v-model="dialog" max-width="500px">
      <VCard>
        <VCardTitle class="bg-primary text-white pa-4">
          Seleccionar Tipo de Comprobante
        </VCardTitle>

        <VCardText class="pt-4">
          <VRow>
            <VCol cols="12">
              <VCombobox
                v-model="nuevoComprobante.nombre"
                :items="opcionesComprobantes"
                label="Tipo de Comprobante *"
                placeholder="Selecciona o escribe una opción"
                clearable
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="nuevoComprobante.descripcion"
                label="Descripción adicional"
                placeholder="Notas sobre las reglas de este comprobante"
                rows="3"
              />
            </VCol>
          </VRow>
        </VCardText>

        <VCardActions class="justify-end pe-6 pb-4">
          <VBtn color="secondary" variant="outlined" @click="dialog = false">
            Cancelar
          </VBtn>
          <VBtn color="primary" variant="elevated" @click="guardarTipoComprobante">
            Guardar en BD
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
