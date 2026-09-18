const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` })
export const apiProcesos = async (ruta: string, opciones: RequestInit = {}) => {
  const response = await fetch(`/api/procesos${ruta}`, { ...opciones, headers: { ...auth(), ...(opciones.headers || {}) } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Error de proceso.')
  return data
}
export const solicitudId = () => crypto.randomUUID()
