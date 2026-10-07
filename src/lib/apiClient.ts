export class ApiClientError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

interface ErrorEnvelope {
  error?: { message?: string }
}

function messageFrom(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'error' in json) {
    const envelope = json as ErrorEnvelope
    if (envelope.error?.message) return envelope.error.message
  }
  return fallback
}

/**
 * Wrapper de fetch para as rotas internas da API.
 * Devolve `data` do envelope `{ data }` ou lança `ApiClientError`.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw new ApiClientError(0, 'Falha de conexão. Tente novamente.')
  }

  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    // resposta sem corpo JSON
  }

  if (!response.ok) {
    throw new ApiClientError(response.status, messageFrom(json, 'Algo deu errado. Tente novamente.'))
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data
  }
  return json as T
}