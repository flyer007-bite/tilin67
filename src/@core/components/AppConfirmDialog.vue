<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; title: string; message: string; color?: string; confirmText?: string; loading?: boolean }>(), { color: 'primary', confirmText: 'Confirmar', loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; confirm: [] }>()
</script>

<template>
  <VDialog :model-value="modelValue" max-width="440" @update:model-value="emit('update:modelValue', $event)">
    <VCard class="confirmation-card"><VCardText class="pa-7 text-center"><VAvatar :color="color" variant="tonal" size="64" class="mb-4"><VIcon :icon="color === 'error' ? 'tabler-alert-triangle' : 'tabler-help'" size="32" /></VAvatar><h3 class="text-h5 mb-2">{{ title }}</h3><p class="text-medium-emphasis mb-0">{{ message }}</p></VCardText><VCardActions class="pa-5 pt-0"><VBtn color="secondary" variant="tonal" :disabled="loading" @click="emit('update:modelValue', false)">Cancelar</VBtn><VSpacer /><VBtn :color="color" :loading="loading" @click="emit('confirm')">{{ confirmText }}</VBtn></VCardActions></VCard>
  </VDialog>
</template>
