```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Proveedor } from '@/types/cajaChica'

const proveedores = ref<Proveedor[]>([])
const loading = ref(false)
const dialog = ref(false)

const nuevoProveedor = ref<Proveedor>({
  nombre: '',
  nit: '',
  telefono: ''
})

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Nombre / Razón Social', key: 'nombre' },
  { title: 'NIT', key: 'nit' },
  { title: 'Teléfono', key: 'telefono' },
  { title: 'Acciones', key: 'actions', sortable: false }
]

// Cargar proveedores
const fetchProveedores = async () => {
  loading.value = true

  try {
    const res = await fetch('http://localhost:4000/api/proveedores')

    if (!res.ok) {
      throw new Error('Error al obtener proveedores')
    }

    proveedores.value = await res.json()
  } catch (error) {
    console.error('Error al cargar proveedores:', error)
    alert('No se pudieron cargar los proveedores')
  } finally {
    loading.value = false
  }
}

// Limpiar NIT
const limpiarNit = () => {
  if (nuevoProveedor.value.nit) {
    nuevoProveedor.value.nit =
      nuevoProveedor.value.nit.replace(/[-\s]/g, '')
  }
}

// Guardar proveedor
const guardarProveedor = async () => {
  // Validar nombre
  if (!nuevoProveedor.value.nombre.trim()) {
    alert('El nombre del proveedor es obligatorio')
    return
  }

  // Quitar guiones y espacios del NIT
  limpiarNit()

  // Verificar si el NIT ya existe
  if (nuevoProveedor.value.nit) {
    const nitExiste = proveedores.value.some(
      proveedor =>
        proveedor.nit?.replace(/[-\s]/g, '') ===
        nuevoProveedor.value.nit
    )

    if (nitExiste) {
      alert('Ya existe un proveedor registrado con este NIT.')
      return
    }
  }

  try {
    const res = await fetch('http://localhost:4000/api/proveedores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevoProveedor.value)
    })

    if (res.ok) {
      await fetchProveedores()

      dialog.value = false

      nuevoProveedor.value = {
        nombre: '',
        nit: '',
        telefono: ''
      }

      alert('Proveedor registrado correctamente')
    } else {
      let mensaje = 'Error al guardar el proveedor'

      try {
        const error = await res.json()
        mensaje = error.message || mensaje
      } catch {
        // Si el backend no devuelve JSON
      }

      alert(mensaje)
    }
  } catch (error) {
    console.error('Error al guardar proveedor:', error)
    alert('No se pudo conectar con el servidor')
  }
}

// Eliminar proveedor
const eliminarProveedor = async (id: number) => {
  const confirmar = confirm(
    '¿Estás seguro de que deseas eliminar este proveedor?'
  )

  if (!confirmar) return

  try {
    const res = await fetch(
      `http://localhost:4000/api/proveedores/${id}`,
      {
        method: 'DELETE'
      }
    )

    if (res.ok) {
      await fetchProveedores()
      alert('Proveedor eliminado correctamente')
    } else {
      alert('No se pudo eliminar el proveedor')
    }
  } catch (error) {
    console.error('Error al eliminar proveedor:', error)
    alert('No se pudo conectar con el servidor')
  }
}

// Abrir modal
const abrirDialog = () => {
  nuevoProveedor.value = {
    nombre: '',
    nit: '',
    telefono: ''
  }

  dialog.value = true
}

onMounted(fetchProveedores)
</script>

<template>
  <VCard title="Gestión de Proveedores">
    <VCardText class="d-flex justify-space-between align-center">
      <span class="text-subtitle-1">
        Lista de proveedores registrados
      </span>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="abrirDialog"
      >
        Nuevo Proveedor
      </VBtn>
    </VCardText>

    <!-- Tabla de proveedores -->
    <VDataTable
      :headers="headers"
      :items="proveedores"
      :loading="loading"
      class="elevation-1"
    >
      <!-- NIT -->
      <template #item.nit="{ item }">
        {{ item.nit || 'Sin NIT' }}
      </template>

      <!-- Acciones -->
      <template #item.actions="{ item }">
        <VBtn
          icon
          size="small"
          color="error"
          variant="text"
          @click="eliminarProveedor(item.id!)"
        >
          <VIcon icon="tabler-trash" />
        </VBtn>
      </template>
    </VDataTable>

    <!-- Modal para agregar proveedor -->
    <VDialog
      v-model="dialog"
      max-width="500px"
    >
      <VCard title="Agregar Proveedor">
        <VCardText>
          <VRow>
            <!-- Nombre -->
            <VCol cols="12">
              <VTextField
                v-model="nuevoProveedor.nombre"
                label="Nombre / Razón Social *"
                required
              />
            </VCol>

            <!-- NIT -->
            <VCol cols="12" md="6">
              <VTextField
                v-model="nuevoProveedor.nit"
                label="NIT"
                placeholder="Ej. 12345678"
                @update:model-value="limpiarNit"
              />
            </VCol>

            <!-- Teléfono -->
            <VCol cols="12" md="6">
              <VTextField
                v-model="nuevoProveedor.telefono"
                label="Teléfono"
              />
            </VCol>
          </VRow>

          <div class="text-caption text-medium-emphasis mt-2">
            El NIT se guardará sin guiones ni espacios.
          </div>
        </VCardText>

        <!-- Botones -->
        <VCardActions class="justify-end">
          <VBtn
            color="secondary"
            variant="outlined"
            @click="dialog = false"
          >
            Cancelar
          </VBtn>

          <VBtn
            color="primary"
            @click="guardarProveedor"
          >
            Guardar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>
```

Con este reemplazo ya tendrás:

* ✅ NIT `1234567-8` → se convierte automáticamente en `12345678`.
* ✅ NIT con espacios → también los elimina.
* ✅ Comprueba si el NIT ya está registrado antes de guardar.
* ✅ Si está repetido, muestra **"Ya existe un proveedor registrado con este NIT."**
* ✅ Limpia el formulario después de guardar.
* ✅ Confirma antes de eliminar un proveedor.
* ✅ Mantiene tu conexión actual a `http://localhost:4000/api/proveedores`.

**Importante:** esta comprobación de NIT se hace con los proveedores que ya cargó el frontend. Para que quede **100% segura**, también debemos poner una restricción/comprobación en tu backend.
    