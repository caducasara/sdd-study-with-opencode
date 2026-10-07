/**
 * @jest-environment node
 */
import { config, proxy } from '@/proxy'
import { signToken } from '@/lib/auth/session'

const mockNext = jest.fn(() => ({ type: 'next', status: 200 }))
const mockRedirect = jest.fn((url: string | URL, status = 307) => ({
  type: 'redirect',
  status,
  location: String(url),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    next: () => mockNext(),
    redirect: (url: string | URL, status?: number) => mockRedirect(url, status),
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
})

type Req = Parameters<typeof proxy>[0]

function makeRequest(url: string, cookie?: string): Req {
  return {
    url,
    nextUrl: new URL(url),
    headers: {
      get: (name: string) => (name.toLowerCase() === 'cookie' ? (cookie ?? null) : null),
    },
  } as Req
}

const validCookie = `session=${signToken('u1')}`

describe('proxy (guarda de autenticação)', () => {
  it('redireciona visitante não autenticado para /login guardando o destino', () => {
    const res = proxy(makeRequest('http://localhost/dashboard'))
    expect(res.status).toBe(307)
    expect(mockNext).not.toHaveBeenCalled()

    const [url] = mockRedirect.mock.calls[0] as [string | URL]
    const parsed = new URL(String(url))
    expect(parsed.pathname).toBe('/login')
    expect(parsed.searchParams.get('from')).toBe('/dashboard')
  })

  it('deixa visitante autenticado seguir para a página protegida', () => {
    const res = proxy(makeRequest('http://localhost/dashboard', validCookie))
    expect(res.type).toBe('next')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('considera cookie inválido como não autenticado', () => {
    proxy(makeRequest('http://localhost/dashboard', 'session=token-fake'))
    expect(mockRedirect).toHaveBeenCalled()
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('permite acesso à página de login quando não autenticado', () => {
    const res = proxy(makeRequest('http://localhost/login'))
    expect(res.type).toBe('next')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('também permite acesso à página de cadastro quando não autenticado', () => {
    const res = proxy(makeRequest('http://localhost/register'))
    expect(res.type).toBe('next')
  })

  it('redireciona usuário autenticado que tenta acessar /login', () => {
    const res = proxy(makeRequest('http://localhost/login', validCookie))
    expect(res.status).toBe(307)
    const [url] = mockRedirect.mock.calls[0] as [string | URL]
    expect(new URL(String(url)).pathname).toBe('/')
  })

  it('redireciona usuário autenticado que tenta acessar /register', () => {
    proxy(makeRequest('http://localhost/register', validCookie))
    const [url] = mockRedirect.mock.calls[0] as [string | URL]
    expect(new URL(String(url)).pathname).toBe('/')
  })

  it('redireciona visitante na raiz para /login', () => {
    proxy(makeRequest('http://localhost/'))
    const [url] = mockRedirect.mock.calls[0] as [string | URL]
    expect(new URL(String(url)).pathname).toBe('/login')
  })

  it('expõe matcher que ignora API, estáticos e favicon', () => {
    expect(Array.isArray(config.matcher)).toBe(true)
    const matcher = config.matcher[0] as string
    expect(matcher.includes('api')).toBe(true)
    expect(matcher.includes('_next/static')).toBe(true)
    expect(matcher.includes('favicon.ico')).toBe(true)
  })
})