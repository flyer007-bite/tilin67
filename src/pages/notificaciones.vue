<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { $api } from '@/utils/api'

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
    const data = await $api<{ notificaciones: Notificacion[] }>('/notificaciones')
    notificaciones.value = data.notificaciones
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'No se pudieron cargar las notificaciones.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="admin-page">
    <section class="page-hero admin-hero d-flex align-center justify-space-between flex-wrap ga-4 mb-6"><div class="d-flex align-center ga-4"><VAvatar color="primary" variant="tonal" rounded size="58"><VIcon icon="tabler-bell" size="30"/></VAvatar><div><div class="process-kicker">Centro de actividad</div><h1 class="text-h4 font-weight-bold mb-1">Notificaciones</h1><p class="text-body-1 text-medium-emphasis mb-0">Recordatorios automáticos y próximas acciones de Caja Chica.</p></div></div><VBtn color="primary" prepend-icon="tabler-refresh" size="large" variant="tonal" :loading="loading" @click="cargar">Actualizar</VBtn></section>

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
        <VCard class="notification-card h-100" :class="{ 'notification-card--active': notificacion.activa }">
          <VCardText class="d-flex gap-4">
            <VAvatar :color="notificacion.tipo" variant="tonal" rounded size="46">
              <VIcon :icon="notificacion.id === 'revision-caja' ? 'tabler-clipboard' : 'tabler-credit-card'" size="26" />
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
