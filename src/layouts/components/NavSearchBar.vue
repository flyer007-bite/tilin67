<script setup lang="ts">
const router = useRouter()
</script>

<template>
  <div class="d-flex align-center cursor-pointer" v-bind="$attrs" @click="router.push({ name: 'consulta-facturas' })">
    <IconBtn aria-label="Abrir consulta de facturas"><VIcon icon="tabler-search" /></IconBtn>
    <span class="d-none d-md-flex align-center text-disabled ms-2">Consultar facturas</span>
  </div>
</template>
