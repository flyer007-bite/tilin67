<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { VForm } from 'vuetify/components/VForm'
import { $api } from '@/utils/api'
import { emailValidator, requiredValidator } from '@validators'

definePage({ meta: { layout: 'blank', unauthenticatedOnly: true, public: true } })

type Empresa = { id: string; nombre: string }
type Departamento = { id: number; empresa_id: string; nombre: string }
type Session = { userData: Record<string, any>; userAbilityRules: Array<{ action: string; subject: string }> }

const route = useRoute()
const router = useRouter()
const ability = useAbility()
const form = ref<VForm>()
const empresas = ref<Empresa[]>([])
const departamentos = ref<Departamento[]>([])
const empresaId = ref<string | null>(null)
const departamentoId = ref<number | null>(null)
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const passwordVisible = ref(false)
const error = ref<string | null>(null)
const loading = ref(false)
const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
const departamentosDisponibles = computed(() => departamentos.value.filter(item => item.empresa_id === empresaId.value))

const guardarVistaSesion = async (session: Session) => {
  const options = rememberMe.value ? { maxAge: 8 * 60 * 60 } : undefined
  useCookie<Record<string, any> | null>('userData', options).value = session.userData
  useCookie<Array<{ action: string; subject: string }> | null>('userAbilityRules', options).value = session.userAbilityRules
  localStorage.removeItem('accessToken')
  ability.update((session.userAbilityRules || []) as any)
  await nextTick()
  await router.replace(route.query.to ? String(route.query.to) : '/')
}

const cargarOrganizacion = async () => {
  try {
    const data = await $api<{ empresas: Empresa[]; departamentos: Departamento[] }>('/auth/organizacion')
    empresas.value = data.empresas || []
    departamentos.value = data.departamentos || []
  }
  catch { error.value = 'No se pudieron cargar las empresas y departamentos.' }
}

const login = async () => {
  error.value = null
  loading.value = true
  try {
    const session = await $api<Session>('/auth/login', {
      method: 'POST',
      body: { empresa_id: empresaId.value, departamento_id: departamentoId.value, email: email.value, password: password.value, rememberMe: rememberMe.value },
    })
    await guardarVistaSesion(session)
  }
  catch (requestError: any) { error.value = requestError?.data?.message || 'No fue posible iniciar sesión.' }
  finally { loading.value = false }
}

const submit = () => form.value?.validate().then(({ valid }) => { if (valid) void login() })
const cambiarEmpresa = () => { departamentoId.value = null }

const googleCredential = async (response: { credential?: string }) => {
  if (!response.credential || !empresaId.value || !departamentoId.value) {
    error.value = 'Selecciona empresa y departamento antes de continuar con Google.'
    return
  }
  try {
    const session = await $api<Session>('/auth/google', {
      method: 'POST', body: { credential: response.credential, empresa_id: empresaId.value, departamento_id: departamentoId.value, rememberMe: rememberMe.value },
    })
    await guardarVistaSesion(session)
  }
  catch (requestError: any) { error.value = requestError?.data?.message || 'No fue posible iniciar sesión con Google.' }
}

onMounted(async () => {
  await cargarOrganizacion()
  if (!googleEnabled) return
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true
  script.onload = () => {
    const google = (window as any).google
    google?.accounts?.id?.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback: googleCredential })
    const container = document.getElementById('googleBtn')
    if (container) google?.accounts?.id?.renderButton(container, { theme: 'outline', size: 'large', width: '320' })
  }
  document.head.appendChild(script)
})
</script>

<template>
  <VRow no-gutters class="auth-wrapper login-shell min-h-screen">
    <VCol cols="12" class="d-flex align-center justify-center pa-6">
      <VCard width="100%" max-width="480" class="pa-6 login-card" elevation="8">
        <VCardText class="text-center pb-2">
          <div class="login-mark"><VIcon icon="tabler-cash-banknote" color="primary" size="44" /></div>
          <h1 class="text-h3 mt-3">Caja Chica</h1>
          <p class="text-body-1 mt-2">Ingresa tus credenciales para acceder al sistema</p>
        </VCardText>
        <VAlert v-if="error" data-testid="login-error" color="error" variant="tonal" closable class="my-4" @click:close="error = null">{{ error }}</VAlert>
        <VForm ref="form" @submit.prevent="submit">
          <VRow>
            <VCol cols="12">
              <AppSelect v-model="empresaId" data-testid="login-empresa" :items="empresas" item-title="nombre" item-value="id" label="Empresa *" :rules="[requiredValidator]" @update:model-value="cambiarEmpresa" />
            </VCol>
            <VCol cols="12">
              <AppSelect v-model="departamentoId" data-testid="login-departamento" :items="departamentosDisponibles" item-title="nombre" item-value="id" label="Departamento *" :disabled="!empresaId" :rules="[requiredValidator]" />
            </VCol>
            <VCol cols="12">
              <AppTextField v-model="email" data-testid="login-email" label="Email *" type="email" autocomplete="username" :rules="[requiredValidator, emailValidator]" />
            </VCol>
            <VCol cols="12">
              <AppTextField v-model="password" data-testid="login-password" label="Contraseña *" :type="passwordVisible ? 'text' : 'password'" autocomplete="current-password" :rules="[requiredValidator]" :append-inner-icon="passwordVisible ? 'tabler-eye-off' : 'tabler-eye'" @click:append-inner="passwordVisible = !passwordVisible" />
              <VCheckbox v-model="rememberMe" label="Recordarme" />
              <VBtn block data-testid="login-submit" type="submit" :loading="loading" :disabled="loading">Iniciar sesión</VBtn>
            </VCol>
            <VCol v-if="googleEnabled" cols="12" class="d-flex justify-center"><div id="googleBtn" /></VCol>
          </VRow>
        </VForm>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
