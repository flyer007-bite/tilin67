<!-- ❗Errors in the form are set on line 60 -->
<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VForm } from 'vuetify/components/VForm'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png'
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png'
import authV2LoginIllustrationDark from '@images/pages/auth-v2-login-illustration-dark.png'
import authV2LoginIllustrationLight from '@images/pages/auth-v2-login-illustration-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'

const authThemeImg = useGenerateImageVariant(authV2LoginIllustrationLight, authV2LoginIllustrationDark, authV2LoginIllustrationBorderedLight, authV2LoginIllustrationBorderedDark, true)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

const isPasswordVisible = ref(false)
const route = useRoute()
const router = useRouter()
const ability = useAbility()

const errors = ref<Record<string, string | undefined>>({
  email: undefined,
  password: undefined,
})

const generalError = ref<string | null>(null)
const refVForm = ref<VForm>()

// Credenciales por defecto enviadas al backend
const credentials = ref({
  email: '',
  password: '',
})

type Empresa = { id: string; nombre: string }
type Departamento = { id: number; empresa_id: string; nombre: string }
const empresas = ref<Empresa[]>([])
const departamentos = ref<Departamento[]>([])
const empresaSeleccionada = ref<string | null>(null)
const departamentoSeleccionado = ref<number | null>(null)
const departamentosDisponibles = computed(() => departamentos.value.filter(item => item.empresa_id === empresaSeleccionada.value))

const cargarOrganizacion = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/auth/organizacion')
    if (!response.ok) throw new Error()
    const data = await response.json()
    empresas.value = data.empresas || []
    departamentos.value = data.departamentos || []
  } catch {
    generalError.value = 'No se pudieron cargar las empresas y departamentos.'
  }
}

const cambiarEmpresa = () => {
  departamentoSeleccionado.value = null
}

onMounted(cargarOrganizacion)

const login = async () => {
  try {
    errors.value = { email: undefined, password: undefined }
    generalError.value = null

    // Conexión directa a Express en el puerto 4000
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.value.email,
        password: credentials.value.password,
        empresa_id: empresaSeleccionada.value,
        departamento_id: departamentoSeleccionado.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      generalError.value = data.message || 'Credenciales inválidas'
      return
    }

    const { accessToken, userData, userAbilityRules } = data

    // Si la BD no trae permisos aún, otorgar acceso libre inicial
    // El administrador debe poder acceder a todos los módulos de Caja Chica.
    // Para otros roles se respetan los permisos enviados por la base de datos.
    const roleName = String(userData?.role || '').toLowerCase()
    const isAdministrator = ['admin', 'administrador'].includes(roleName) || roleName.endsWith(' - administrador')
    const rulesToApply = isAdministrator
      ? [{ action: 'manage', subject: 'all' }]
      : (userAbilityRules && userAbilityRules.length > 0)
        ? userAbilityRules
        : []

    useCookie('userAbilityRules').value = rulesToApply
    useCookie('userData').value = userData
    useCookie('accessToken').value = accessToken

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('userData', JSON.stringify(userData))

    ability.update(rulesToApply)

    await nextTick(() => {
      router.replace(route.query.to ? String(route.query.to) : '/')
    })
  } catch (err: any) {
    console.error('Error al conectar con el backend:', err)
    generalError.value = 'No se pudo conectar con el servidor backend (Puerto 4000).'
  }
}

const onSubmit = () => {
  refVForm.value?.validate()
    .then(({ valid: isValid }) => {
      if (isValid)
        login()
    })
}
</script>

<template>
  <RouterLink to="/">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
      <h1 class="auth-title">
        {{ themeConfig.app.title }}
      </h1>
    </div>
  </RouterLink>

  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background w-100 me-0">
        <div
          class="d-flex align-center justify-center w-100 h-100"
          style="padding-inline: 6.25rem;"
        >
          <VImg
            max-width="613"
            :src="authThemeImg"
            class="auth-illustration mt-16 mb-2"
          />
        </div>

        <img
          class="auth-footer-mask"
          :src="authThemeMask"
          alt="auth-footer-mask"
          height="280"
          width="100"
        >
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            Bienvenido a <span class="text-capitalize"> {{ themeConfig.app.title }} </span>! 👋🏻
          </h4>
          <p class="mb-0">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </VCardText>

        <!-- Alerta de Error General si falla la BD o el Servidor -->
        <VCardText v-if="generalError">
          <VAlert
            color="error"
            variant="tonal"
            closable
            @click:close="generalError = null"
          >
            {{ generalError }}
          </VAlert>
        </VCardText>

        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <VCol cols="12">
                <AppSelect
                  v-model="empresaSeleccionada"
                  :items="empresas"
                  item-title="nombre"
                  item-value="id"
                  label="Empresa *"
                  placeholder="Selecciona una empresa"
                  :rules="[requiredValidator]"
                  @update:model-value="cambiarEmpresa"
                />
              </VCol>

              <VCol cols="12">
                <AppSelect
                  v-model="departamentoSeleccionado"
                  :items="departamentosDisponibles"
                  item-title="nombre"
                  item-value="id"
                  label="Departamento *"
                  placeholder="Selecciona un departamento"
                  :disabled="!empresaSeleccionada"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="credentials.email"
                  label="Email"
                  placeholder="usuario@ejemplo.com"
                  type="email"
                  autofocus
                  :rules="[requiredValidator, emailValidator]"
                  :error-messages="errors.email"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="credentials.password"
                  label="Contraseña"
                  placeholder="············"
                  :rules="[requiredValidator]"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  :error-messages="errors.password"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <VBtn
                  block
                  type="submit"
                >
                  Iniciar Sesión
                </VBtn>
              </VCol>

            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
