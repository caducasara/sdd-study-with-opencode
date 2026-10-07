import { ApiError, badRequest } from '@/lib/errors'

export interface ApiSuccess<T> {
  data: T
}

export interface ApiFailure {
  error: { status: number; message: string }
}

/** Coage um valor vindo do corpo JSON para string (vazio se não for string). */
export function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Faz o parse do corpo JSON, devolvendo 400 para corpos inválidos. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }
    throw badRequest('Corpo da requisição inválido')
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw badRequest('JSON inválido')
  }
}

export function success<T>(data: T, status = 200): Response {
  return Response.json({ data } satisfies ApiSuccess<T>, { status })
}

export function failure(status: number, message: string): Response {
  return Response.json({ error: { status, message } } satisfies ApiFailure, { status })
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Erro inesperado'
}

function statusOf(error: unknown): number {
  if (error instanceof ApiError) return error.status
  // Violação de índice único do MongoDB (e-mail duplicado, conclusão duplicada).
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    return 409
  }
  if (error instanceof Error && error.name === 'ValidationError') return 400
  return 500
}

/**
 * Envolve um handler de rota tratando erros de domínio e inesperados.
 */
export async function handleApi(
  handler: () => Response | Promise<Response>
): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    const status = statusOf(error)
    const message = status === 500 ? 'Erro inesperado' : messageOf(error)
    if (status === 500 && process.env.NODE_ENV !== 'test') {
      console.error(error)
    }
    return failure(status, message)
  }
}
