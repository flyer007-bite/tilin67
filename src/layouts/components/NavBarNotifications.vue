<script lang="ts" setup>
import type { Notification } from '@layouts/types'

type AvisoApi = {
  id: string
  titulo: string
  mensaje: string
  tipo: 'warning' | 'info'
  activa: boolean
  proxima_fecha: string
}

const notifications = ref<Notification[]>([])

const cargarNotificaciones = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/notificaciones')
    if (!response.ok) return
    const data = await response.json()
    notifications.value = (data.notificaciones as AvisoApi[]).map((aviso, index) => ({
      id: index + 1,
      text: aviso.id === 'revision-caja' ? 'RC' : 'CH',
      title: aviso.titulo,
      subtitle: aviso.activa ? aviso.mensaje : `Próxima fecha: ${new Date(`${aviso.proxima_fecha}T00:00:00`).toLocaleDateString('es-GT')}`,
      time: aviso.activa ? 'Pendiente hoy' : 'Programada',
      isSeen: !aviso.activa,
      color: aviso.tipo,
    }))
  } catch {
    notifications.value = []
  }
}

const removeNotification = (notificationId: number) => {
  notifications.value = notifications.value.filter(item => item.id !== notificationId)
}

const markRead = (notificationIds: number[]) => {
  notifications.value.forEach(item => {
    if (notificationIds.includes(item.id)) item.isSeen = true
  })
}

const markUnRead = (notificationIds: number[]) => {
  notifications.value.forEach(item => {
    if (notificationIds.includes(item.id)) item.isSeen = false
  })
}

onMounted(cargarNotificaciones)
</script>

<template>
  <Notifications
    :notifications="notifications"
    @remove="removeNotification"
    @read="markRead"
    @unread="markUnRead"
  />
</template>
