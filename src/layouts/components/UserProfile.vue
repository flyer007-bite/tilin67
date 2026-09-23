<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { $api, clearClientSession } from '@/utils/api'

const router = useRouter()
const ability = useAbility()

// Obtener datos del usuario desde la cookie
const userData = useCookie<any>('userData')

const logout = async () => {
  // Limpiar la sesión completa antes de navegar; de lo contrario el guardia
  // puede interpretar que el usuario todavía sigue autenticado.
  try { await $api('/auth/logout', { method: 'POST' }) }
  finally { clearClientSession() }
  ability.update([])

  await router.replace({ name: 'login' })

  // Fuerza la navegación si el router conserva la vista actual en memoria.
  if (window.location.pathname !== '/login')
    window.location.replace('/login')
}

// Opciones del menú adaptadas al sistema de Caja Chica (rutas seguras/existentes)
const userProfileList = [
  { type: 'divider' },
  { 
    type: 'navItem', 
    icon: 'tabler-user', 
    title: 'Mi Perfil', 
    to: { name: 'index' } 
  },
  { 
    type: 'navItem', 
    icon: 'tabler-settings', 
    title: 'Ajustes', 
    to: { name: 'index' } 
  },
]
</script>

    <template>
  <VBadge
    dot
    bordered
    location="bottom right"
    offset-x="1"
    offset-y="2"
    color="success"
  >
    <!-- Avatar Principal (usa icono para evitar error 429 de peticiones externas) -->
    <VAvatar
      size="38"
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <VIcon icon="tabler-user" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="240"
        location="bottom end"
        offset="12px"
      >
        <VList>
          <VListItem>
            <div class="d-flex gap-2 align-center">
              <VListItemAction>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                  bordered
                >
                  <VAvatar
                    size="42"
                    class="cursor-pointer profile-button"
                    color="primary"
                    variant="tonal"
                  >
                    <VIcon icon="tabler-user" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>

              <div>
                <h6 class="text-h6 font-weight-medium">
                  {{ userData.fullName || userData.username || 'Usuario' }}
                </h6>
                <VListItemSubtitle class="text-capitalize text-disabled">
                  {{ userData.role || 'Administrador' }}
                </VListItemSubtitle>
              </div>
            </div>
          </VListItem>

          <PerfectScrollbar :options="{ wheelPropagation: false }">
            <template
              v-for="item in userProfileList"
              :key="item.title"
            >
              <VListItem
                v-if="item.type === 'navItem'"
                :to="item.to"
              >
                <template #prepend>
                  <VIcon
                    :icon="item.icon"
                    size="22"
                  />
                </template>

                <VListItemTitle>{{ item.title }}</VListItemTitle>
              </VListItem>

              <VDivider
                v-else
                class="my-2"
              />
            </template>

            <div class="px-4 py-2">
              <VBtn
                block
                size="small"
                color="error"
                append-icon="tabler-logout"
                @click="logout"
              >
                Cerrar Sesión
              </VBtn>
            </div>
          </PerfectScrollbar>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
<style scoped>
.profile-button {
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  box-shadow: 0 3px 10px rgba(var(--v-theme-primary), 0.12);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.profile-button:hover {
  box-shadow: 0 5px 14px rgba(var(--v-theme-primary), 0.22);
  transform: translateY(-1px);
}
</style>
