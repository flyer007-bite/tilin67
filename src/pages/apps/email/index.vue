<script setup lang="ts">
import { ref } from 'vue'

const totalCaja = ref('Q 5,000.00')
const totalGastado = ref('Q 1,250.50')
const saldoDisponible = ref('Q 3,749.50')
</script>

<template>
  <div>
    <!-- Encabezado de Bienvenida -->
    <VRow class="match-height">
      <VCol cols="12">
        <VCard title="Sistema de Caja Chica 🚀">
          <VCardText>
            Bienvenido al panel de control de Caja Chica. Desde aquí puedes gestionar ingresos, gastos, arqueos y reportes.
          </VCardText>
        </VCard>
      </VCol>

      <!-- Tarjetas de Resumen -->
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardItem>
            <template #prepend>
              <VAvatar
                color="primary"
                variant="tonal"
                rounded
              >
                <VIcon icon="tabler-wallet" />
              </VAvatar>
            </template>
            <VCardTitle>Monto Asignado</VCardTitle>
            <VCardSubtitle>Fondo total de caja</VCardSubtitle>
          </VCardItem>
          <VCardText class="text-h5 font-weight-bold">
            {{ totalCaja }}
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardItem>
            <template #prepend>
              <VAvatar
                color="error"
                variant="tonal"
                rounded
              >
                <VIcon icon="tabler-receipt-2" />
              </VAvatar>
            </template>
            <VCardTitle>Total Gastos</VCardTitle>
            <VCardSubtitle>Egresos registrados</VCardSubtitle>
          </VCardItem>
          <VCardText class="text-h5 font-weight-bold">
            {{ totalGastado }}
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardItem>
            <template #prepend>
              <VAvatar
                color="success"
                variant="tonal"
                rounded
              >
                <VIcon icon="tabler-chart-pie" />
              </VAvatar>
            </template>
            <VCardTitle>Saldo Disponible</VCardTitle>
            <VCardSubtitle>Restante en caja</VCardSubtitle>
          </VCardItem>
          <VCardText class="text-h5 font-weight-bold">
            {{ saldoDisponible }}
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
