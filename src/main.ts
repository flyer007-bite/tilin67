import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Las pantallas actuales usan fetch directamente. Esta capa adjunta la sesión
// a todas las llamadas de la API, sin cambiar cada formulario por separado.
const nativeFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (!url.includes('/api/')) return nativeFetch(input, init)

  // En otra computadora, localhost sería la computadora del compañero. Al
  // usar una ruta relativa, Vite la reenvía al backend que está en esta PC.
  const request = typeof input === 'string' || input instanceof URL
    ? url.replace(/^https?:\/\/localhost:4000(?=\/api\/)/, '')
    : input

  const token = localStorage.getItem('accessToken')
  const headers = new Headers(init.headers)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  return nativeFetch(request, { ...init, headers })
}

// Create vue app
const app = createApp(App)

// Register plugins
registerPlugins(app)

// Mount vue app
app.mount('#app')
