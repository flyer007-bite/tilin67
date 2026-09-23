<script setup lang="ts">
const model = defineModel<string | null>({ default: null })
</script>

<template>
  <VAlert
    v-if="model"
    type="error"
    variant="tonal"
    closable
    class="mb-4"
    @click:close="model = null"
  >
    {{ model }}
  </VAlert>
</template>
