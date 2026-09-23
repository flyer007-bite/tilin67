import { ofetch } from 'ofetch'

const technicalErrorPattern = /(unknown column|sqlstate|er_[a-z_]+|sql syntax|mysql|information_schema|select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from)/i

export const clearClientSession = () => {
  useCookie('userData').value = null
  useCookie('userAbilityRules').value = null
  localStorage.removeItem('userData')
  localStorage.removeItem('accessToken')
}

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  credentials: 'include',
  retry: 0,
  async onResponseError({ response }) {
    const data = response?._data
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && technicalErrorPattern.test(data.message))
        data.message = 'Ocurrió un error interno. Intenta nuevamente.'
      delete data.sql
      delete data.sqlMessage
      delete data.stack
      delete data.detalles
    }
    if (response.status === 401 && typeof window !== 'undefined') {
      clearClientSession()
      if (!window.location.pathname.startsWith('/login')) {
        const destination = `${window.location.pathname}${window.location.search}`
        window.location.assign(`/login?to=${encodeURIComponent(destination)}`)
      }
    }
  },
})
