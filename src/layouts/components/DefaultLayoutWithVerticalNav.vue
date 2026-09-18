<script lang="ts" setup>
import navItems from '@/navigation/vertical'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavBarNotifications from '@/layouts/components/NavBarNotifications.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'

// Layout
import { VerticalNavLayout } from '@layouts'
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!-- Barra superior -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center w-100">
        <!-- Botón de menú para móvil/tablet -->
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            size="26"
            icon="tabler-menu-2"
          />
        </IconBtn>

        <!-- Empuja los controles hacia la derecha -->
        <VSpacer />

        <!-- Notificaciones y perfil -->
        <div class="d-flex align-center gap-2">
          <NavBarNotifications />
          <UserProfile />
        </div>
      </div>
    </template>

    <!-- Contenido principal -->
    <slot />

    <!-- Pie de página -->
    <template #footer>
      <Footer />
    </template>

    <TheCustomizer />
  </VerticalNavLayout>
</template>
