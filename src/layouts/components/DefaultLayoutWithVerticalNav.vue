<script lang="ts" setup>
import navItems from '@/navigation/vertical'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavBarNotifications from '@/layouts/components/NavBarNotifications.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import { useLayoutConfigStore } from '@layouts/stores/config'

// Layout
import { VerticalNavLayout } from '@layouts'

const configStore = useLayoutConfigStore()
const alternarBarraLateral = () => {
  configStore.isVerticalNavCollapsed = !configStore.isVerticalNavCollapsed
}
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

        <!-- Contraer/expandir la barra lateral en escritorio -->
        <IconBtn
          class="sidebar-toggle ms-n2 d-none d-lg-inline-flex"
          :aria-label="configStore.isVerticalNavCollapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'"
          @click="alternarBarraLateral"
        >
          <VIcon
            size="23"
            :icon="configStore.isVerticalNavCollapsed ? 'tabler-layout-sidebar-left-expand' : 'tabler-layout-sidebar-left-collapse'"
          />
          <VTooltip activator="parent" location="bottom">
            {{ configStore.isVerticalNavCollapsed ? 'Mostrar menú' : 'Ocultar menú' }}
          </VTooltip>
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
