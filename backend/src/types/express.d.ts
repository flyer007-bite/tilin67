declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: number
        email: string
        rolId: number
        rol: string
        empresaId: string | null
        departamentoId: number | null
        esAdministradorGlobal: boolean
        permisos: Array<{ action: string; subject: string }>
      }
    }
  }
}

export {}
