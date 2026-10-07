import type { HabitSummary, SessionUser } from '@/types'

/** Cria um Response-like usado pelos testes (jsdom não tem fetch/Response globais). */
export function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as unknown as Response
}

/** Envelope padrão de sucesso da API: `{ data: payload }`. */
export const dataEnvelope = <T,>(payload: T): unknown => ({ data: payload })

/** Envelope padrão de erro da API: `{ error: { status, message } }`. */
export const errorEnvelope = (status: number, message: string): unknown => ({
  error: { status, message },
})

/** Define o stub global de fetch. */
export function setFetchMock(impl: jest.Mock): void {
  globalThis.fetch = impl as unknown as typeof fetch
}

/** Stub de fetch que resolve uma única resposta. */
export function fetchOnce(data: unknown, status = 200): jest.Mock {
  const mock = jest.fn().mockResolvedValue(jsonResponse(data, status))
  setFetchMock(mock)
  return mock
}

interface RouteRule {
  match: (url: string, init?: RequestInit) => boolean
  data: unknown
  status?: number
}

/** Stub de fetch que roteia por (URL, method) — útil para telas que chamam várias rotas. */
export function routeFetch(routes: RouteRule[]): jest.Mock {
  const mock = jest.fn((url: unknown, init?: RequestInit): Promise<Response> => {
    const route = routes.find((r) => r.match(String(url), init))
    if (!route) {
      return Promise.reject(new Error(`fetch sem rota: ${String(url)}`))
    }
    return Promise.resolve(jsonResponse(route.data, route.status))
  })
  setFetchMock(mock)
  return mock
}

/** Rota que casa pathname + método HTTP. */
export function route(
  pathname: string,
  data: unknown,
  options: { method?: string; status?: number } = {}
): RouteRule {
  return {
    match: (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const byMethod = (options.method ?? 'GET').toUpperCase()
      return url.includes(pathname) && method === byMethod
    },
    data,
    status: options.status,
  }
}

export function makeHabit(over: Partial<HabitSummary> = {}): HabitSummary {
  return {
    id: 'h1',
    userId: 'u1',
    name: 'Beber água',
    description: 'Manter hidratação',
    streakAtual: 1,
    melhorStreak: 3,
    ultimaConclusao: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    concluidoHoje: false,
    ...over,
  }
}

export const ana: SessionUser = {
  id: 'u1',
  name: 'Ana Souza',
  email: 'ana@example.com',
}