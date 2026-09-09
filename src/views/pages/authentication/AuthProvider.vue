<script setup lang="ts">
import { useTheme } from 'vuetify'

const { global: globalTheme } = useTheme()

const authProviders = [
  {
    icon: 'tabler-brand-facebook',
    color: '#4267B2',
    colorInDark: '#4267B2',
  },
  {
    icon: 'tabler-brand-twitter',
    color: '#1DA1F2',
    colorInDark: '#1DA1F2',
  },
  {
    icon: 'tabler-brand-github',
    color: '#272727',
    colorInDark: '#fff',
  },
  {
    icon: 'tabler-brand-google',
    color: '#db4437',
    colorInDark: '#db4437',
  },
]
</script>

<template>
  <div class="d-flex justify-center flex-wrap gap-1">
    <VBtn
      v-for="link in authProviders"
      :key="link.icon"
      icon
      variant="text"
      size="small"
      :color="globalTheme.name.value === 'dark' ? link.colorInDark : link.color"
    >
      <VIcon
        size="18"
        :icon="link.icon"
      />
    </VBtn>
  </div>
</template>

