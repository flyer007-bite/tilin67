<script setup lang="tsx">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useTheme } from 'vuetify'

import { Layout, Skins, Theme } from '@core/enums'
import { useConfigStore } from '@core/stores/config'
import { AppContentLayoutNav } from '@layouts/enums'
import { themeConfig } from '@themeConfig'

import borderSkin from '@images/customizer-icons/border-light.svg'
import defaultSkin from '@images/customizer-icons/default-light.svg'

const isNavDrawerOpen = ref(false)

const configStore = useConfigStore()
const vuetifyTheme = useTheme()

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN FIJA DEL SISTEMA
|--------------------------------------------------------------------------
| Se dejan deshabilitadas las opciones que no necesitamos:
| - RTL
| - Menú colapsado
| - Layout horizontal
|--------------------------------------------------------------------------
*/

configStore.isAppRTL = false
configStore.isVerticalNavCollapsed = false
configStore.appContentLayoutNav = AppContentLayoutNav.Vertical

/*
|--------------------------------------------------------------------------
| TEMA
|--------------------------------------------------------------------------
*/

const themeMode = computed(() => [
  {
    bgImage: 'tabler-sun',
    value: Theme.Light,
    label: 'Claro',
  },
  {
    bgImage: 'tabler-moon-stars',
    value: Theme.Dark,
    label: 'Oscuro',
  },
  {
    bgImage: 'tabler-device-desktop-analytics',
    value: Theme.System,
    label: 'Sistema',
  },
])

/*
|--------------------------------------------------------------------------
| ESTILO
|--------------------------------------------------------------------------
*/

const themeSkin = computed(() => [
  {
    bgImage: defaultSkin,
    value: Skins.Default,
    label: 'Normal',
  },
  {
    bgImage: borderSkin,
    value: Skins.Bordered,
    label: 'Con bordes',
  },
])

/*
|--------------------------------------------------------------------------
| DISTRIBUCIÓN
|--------------------------------------------------------------------------
*/

const currentLayout = ref(Layout.Vertical)

const layouts = computed(() => [
  {
    bgImage: defaultSkin,
    value: Layout.Vertical,
    label: 'Vertical',
  },
])

/*
|--------------------------------------------------------------------------
| DETECTAR CAMBIOS
|--------------------------------------------------------------------------
*/

const isCookieHasAnyValue = computed(() => {
  return (
    configStore.theme !== themeConfig.app.theme
    || configStore.skin !== themeConfig.app.skin
    || configStore.isVerticalNavSemiDark
      !== themeConfig.verticalNav.isVerticalNavSemiDark
  )
})

/*
|--------------------------------------------------------------------------
| RESTABLECER APARIENCIA
|--------------------------------------------------------------------------
*/

const resetCustomizer = () => {
  configStore.theme = themeConfig.app.theme
  configStore.skin = themeConfig.app.skin

  configStore.isVerticalNavSemiDark
    = themeConfig.verticalNav.isVerticalNavSemiDark

  configStore.isVerticalNavCollapsed = false
  configStore.isAppRTL = false

  configStore.appContentLayoutNav
    = AppContentLayoutNav.Vertical

  currentLayout.value = Layout.Vertical
}
</script>

<template>
  <div class="d-lg-block d-none">
    <!-- BOTÓN FLOTANTE DE AJUSTES -->
    <VBtn
      icon
      color="primary"
      variant="flat"
      class="
        app-customizer-toggler
        customizer-main-button
        rounded-s-lg
        rounded-0
      "
      style="z-index: 1001;"
      @click="isNavDrawerOpen = true"
    >
      <VIcon
        size="22"
        icon="tabler-settings"
      />

      <VTooltip
        activator="parent"
        location="start"
      >
        Ajustes de apariencia
      </VTooltip>
    </VBtn>

    <!-- PANEL DE AJUSTES -->
    <VNavigationDrawer
      v-model="isNavDrawerOpen"
      data-allow-mismatch
      temporary
      touchless
      border="none"
      location="end"
      width="400"
      elevation="10"
      :scrim="false"
      class="app-customizer"
    >
      <!-- ENCABEZADO -->
      <div
        class="
          customizer-heading
          d-flex
          align-center
          justify-space-between
        "
      >
        <div class="d-flex align-center gap-3">
          <!-- BOTÓN REGRESAR -->
          <VBtn
            icon
            size="small"
            variant="tonal"
            color="primary"
            class="back-customizer-btn"
            @click="isNavDrawerOpen = false"
          >
            <VIcon
              icon="tabler-arrow-left"
              size="20"
            />

            <VTooltip
              activator="parent"
              location="bottom"
            >
              Regresar
            </VTooltip>
          </VBtn>

          <div>
            <h6 class="text-h6">
              Ajustes de apariencia
            </h6>

            <p
              class="
                text-body-2
                mb-0
                text-medium-emphasis
              "
            >
              Personaliza la apariencia del sistema
            </p>
          </div>
        </div>

        <!-- ACCIONES -->
        <div class="d-flex align-center gap-1">
          <!-- RESTABLECER -->
          <VBtn
            icon
            variant="tonal"
            size="small"
            color="primary"
            class="customizer-action-btn"
            @click="resetCustomizer"
          >
            <VBadge
              v-show="isCookieHasAnyValue"
              dot
              color="error"
              offset-x="-29"
              offset-y="-14"
            />

            <VIcon
              size="21"
              icon="tabler-refresh"
            />

            <VTooltip
              activator="parent"
              location="bottom"
            >
              Restablecer
            </VTooltip>
          </VBtn>

          <!-- CERRAR -->
          <VBtn
            icon
            variant="tonal"
            size="small"
            color="secondary"
            class="customizer-action-btn"
            @click="isNavDrawerOpen = false"
          >
            <VIcon
              icon="tabler-x"
              size="21"
            />

            <VTooltip
              activator="parent"
              location="bottom"
            >
              Cerrar
            </VTooltip>
          </VBtn>
        </div>
      </div>

      <VDivider />

      <PerfectScrollbar
        tag="ul"
        :options="{ wheelPropagation: false }"
      >
        <!-- APARIENCIA -->
        <CustomizerSection
          title="Apariencia"
          :divider="false"
        >
          <!-- TEMA -->
          <div class="d-flex flex-column gap-2">
            <div>
              <h6 class="text-h6 mb-1">
                Tema
              </h6>

              <p
                class="
                  text-body-2
                  text-medium-emphasis
                  mb-0
                "
              >
                Selecciona la apariencia general del sistema.
              </p>
            </div>

            <CustomRadiosWithImage
              :key="configStore.theme"
              v-model:selected-radio="configStore.theme"
              :radio-content="themeMode"
              :grid-column="{ cols: '4' }"
              class="customizer-skins"
            >
              <template #label="item">
                <span
                  class="
                    text-sm
                    text-medium-emphasis
                    mt-1
                  "
                >
                  {{ item?.label }}
                </span>
              </template>

              <template #content="{ item }">
                <div
                  class="
                    customizer-skins-icon-wrapper
                    d-flex
                    align-center
                    justify-center
                    py-3
                    w-100
                  "
                  style="min-inline-size: 100%;"
                >
                  <VIcon
                    size="30"
                    :icon="item.bgImage"
                    color="high-emphasis"
                  />
                </div>
              </template>
            </CustomRadiosWithImage>
          </div>

          <!-- ESTILO -->
          <div class="d-flex flex-column gap-2">
            <div>
              <h6 class="text-h6 mb-1">
                Estilo
              </h6>

              <p
                class="
                  text-body-2
                  text-medium-emphasis
                  mb-0
                "
              >
                Cambia el estilo de las tarjetas y contenedores.
              </p>
            </div>

            <CustomRadiosWithImage
              :key="configStore.skin"
              v-model:selected-radio="configStore.skin"
              :radio-content="themeSkin"
              :grid-column="{ cols: '6' }"
            >
              <template #label="item">
                <span class="text-sm text-medium-emphasis">
                  {{ item?.label }}
                </span>
              </template>
            </CustomRadiosWithImage>
          </div>

          <!-- MENÚ OSCURO -->
          <div
            class="align-center justify-space-between"
            :class="
              vuetifyTheme.global.name.value === 'light'
                && configStore.appContentLayoutNav
                === AppContentLayoutNav.Vertical
                ? 'd-flex'
                : 'd-none'
            "
          >
            <div class="me-4">
              <VLabel
                for="customizer-semi-dark"
                class="text-h6 text-high-emphasis"
              >
                Menú oscuro
              </VLabel>

              <p
                class="
                  text-body-2
                  text-medium-emphasis
                  mb-0
                "
              >
                Mantiene el menú lateral en modo oscuro.
              </p>
            </div>

            <VSwitch
              id="customizer-semi-dark"
              v-model="configStore.isVerticalNavSemiDark"
              hide-details
            />
          </div>
        </CustomizerSection>

        <!-- DISEÑO -->
        <CustomizerSection title="Diseño">
          <div class="d-flex flex-column gap-2">
            <div>
              <h6 class="text-h6 mb-1">
                Distribución
              </h6>

              <p
                class="
                  text-body-2
                  text-medium-emphasis
                  mb-0
                "
              >
                La navegación vertical está optimizada
                para este sistema.
              </p>
            </div>

            <CustomRadiosWithImage
              :key="currentLayout"
              v-model:selected-radio="currentLayout"
              :radio-content="layouts"
              :grid-column="{ cols: '6' }"
            >
              <template #label="item">
                <span class="text-sm text-medium-emphasis">
                  {{ item.label }}
                </span>
              </template>
            </CustomRadiosWithImage>
          </div>
        </CustomizerSection>
      </PerfectScrollbar>
    </VNavigationDrawer>
  </div>
</template>

<style lang="scss">
/*
|--------------------------------------------------------------------------
| PANEL
|--------------------------------------------------------------------------
*/

.app-customizer {
  &.v-navigation-drawer--temporary:not(
    .v-navigation-drawer--active
  ) {
    transform: translateX(110%) !important;
  }

  .customizer-section {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .customizer-heading {
    padding-block: 1rem;
    padding-inline: 1.25rem;
  }

  .v-navigation-drawer__content {
    display: flex;
    flex-direction: column;
  }

  .custom-input-wrapper {
    .v-col {
      padding-inline: 10px;
    }

    .v-label.custom-input {
      border: none;
      color: rgb(var(--v-theme-on-surface));

      outline:
        1px solid
        rgba(
          var(--v-border-color),
          var(--v-border-opacity)
        );
    }
  }

  .v-label.custom-input.active {
    border-color: transparent;
    outline: 2px solid rgb(var(--v-theme-primary));
  }

  .v-label.custom-input:not(.active):hover {
    border-color:
      rgba(
        var(--v-border-color),
        0.3
      );
  }

  .customizer-skins {
    .custom-input.active {
      .customizer-skins-icon-wrapper {
        background-color:
          rgba(
            var(--v-global-theme-primary),
            var(--v-selected-opacity)
          );
      }
    }
  }
}

/*
|--------------------------------------------------------------------------
| BOTÓN FLOTANTE DE AJUSTES
|--------------------------------------------------------------------------
*/

.app-customizer-toggler {
  position: fixed !important;
  inset-block-start: 20%;
  inset-inline-end: 0;
}

.customizer-main-button {
  box-shadow:
    0 4px 14px
    rgba(var(--v-theme-primary), 0.25);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    box-shadow:
      0 6px 18px
      rgba(var(--v-theme-primary), 0.35);

    transform: translateX(-2px);
  }
}

/*
|--------------------------------------------------------------------------
| BOTÓN REGRESAR
|--------------------------------------------------------------------------
*/

.back-customizer-btn {
  border:
    1px solid
    rgba(var(--v-theme-primary), 0.25);

  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background:
      rgba(var(--v-theme-primary), 0.12);

    box-shadow:
      0 3px 10px
      rgba(var(--v-theme-primary), 0.15);

    transform: translateX(-2px);
  }
}

/*
|--------------------------------------------------------------------------
| RESTABLECER Y CERRAR
|--------------------------------------------------------------------------
*/

.customizer-action-btn {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);

    box-shadow:
      0 3px 10px
      rgba(var(--v-theme-on-surface), 0.1);
  }
}
</style>
