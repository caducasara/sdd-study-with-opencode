/** Erro de domínio com status HTTP associado. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const badRequest = (message: string) => new ApiError(400, message)
export const unauthorized = (message = 'Não autenticado') => new ApiError(401, message)
export const forbidden = (message = 'Acesso negado') => new ApiError(403, message)
export const notFound = (message = 'Recurso não encontrado') => new ApiError(404, message)
export const conflict = (message: string) => new ApiError(409, message)
