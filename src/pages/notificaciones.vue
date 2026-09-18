<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Notificacion = {
  id: string
  titulo: string
  mensaje: string
  tipo: 'warning' | 'info'
  activa: boolean
  proxima_fecha: string
}

const notificaciones = ref<Notificacion[]>([])
const loading = ref(false)
const error = ref('')

const fecha = (valor: string) => new Date(`${valor}T00:00:00`).toLocaleDateString('es-GT', {
  day: '2-digit', month: 'long', year: 'numeric',
})

const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('http://localhost:4000/api/notificaciones')
    if (!response.ok) throw new Error()
    const data = await response.json()
    notificaciones.value = data.notificaciones
  } catch {
    error.value = 'No se pudieron cargar las notificaciones.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-6">
      <div>
        <h2 class="text-h4 font-weight-bold">Notificaciones</h2>
        <p class="text-body-1 text-medium-emphasis mb-0">Recordatorios automáticos de Caja Chica.</p>
      </div>
      <VBtn color="primary" prepend-icon="ri-refresh-line" :loading="loading" @click="cargar">Actualizar</VBtn>
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</VAlert>

    <VAlert
      v-for="notificacion in notificaciones.filter(item => item.activa)"
      :key="`activa-${notificacion.id}`"
      :type="notificacion.tipo"
      variant="tonal"
      prominent
      class="mb-4"
    >
      <VAlertTitle>{{ notificacion.titulo }}</VAlertTitle>
      {{ notificacion.mensaje }}
    </VAlert>

    <VRow>
      <VCol v-for="notificacion in notificaciones" :key="notificacion.id" cols="12" md="6">
        <VCard :border="notificacion.activa" :color="notificacion.activa ? notificacion.tipo : undefined">
          <VCardText class="d-flex gap-4">
            <VAvatar :color="notificacion.tipo" variant="tonal" rounded size="46">
              <VIcon :icon="notificacion.id === 'revision-caja' ? 'ri-clipboard-line' : 'ri-bank-card-line'" size="26" />
            </VAvatar>
            <div>
              <h5 class="text-h5 mb-1">{{ notificacion.titulo }}</h5>
              <p class="mb-2">{{ notificacion.mensaje }}</p>
              <VChip :color="notificacion.activa ? notificacion.tipo : 'secondary'" size="small" label>
                {{ notificacion.activa ? 'Pendiente hoy' : `Próxima: ${fecha(notificacion.proxima_fecha)}` }}
              </VChip>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
