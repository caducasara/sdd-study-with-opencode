/**
 * @jest-environment node
 */
import * as userRepository from '@/lib/repositories/userRepository'
import {
  CLEAR_SESSION_COOKIE,
  SESSION_COOKIE,
  getSessionUser,
  getSessionUserId,
  parseCookies,
  sessionCookie,
  signToken,
  verifyToken,
} from '@/lib/auth/session'

jest.mock('@/lib/repositories/userRepository', () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
}))

const mockedUsers = userRepository as jest.Mocked<typeof userRepository>

function requestWithCookie(header: string | null): Request {
  return new Request('http://localhost/', {
    headers: header ? { cookie: header } : {},
  })
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('signToken / verifyToken', () => {
  it('gera um token válido para o usuário', () => {
    const token = signToken('u1')
    expect(token).toMatch(/^u1\.[a-f0-9]{64}$/)
    expect(verifyToken(token)).toBe('u1')
  })

  it('rejeita token nulo ou vazio', () => {
    expect(verifyToken(null)).toBeNull()
    expect(verifyToken(undefined)).toBeNull()
    expect(verifyToken('')).toBeNull()
  })

  it('rejeita token sem separador', () => {
    expect(verifyToken('u1abc')).toBeNull()
    expect(verifyToken('.abc')).toBeNull()
  })

  it('rejeita assinatura adulterada', () => {
    const token = signToken('u1')
    const tampered = `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`
    expect(verifyToken(tampered)).toBeNull()
  })

  it('rejeita assinatura de outro segredo', () => {
    const original = process.env.SESSION_SECRET
    const token = signToken('u1')
    process.env.SESSION_SECRET = 'outro-segredo'
    expect(verifyToken(token)).toBeNull()
    process.env.SESSION_SECRET = original
  })

  it('rejeita assinatura com tamanho diferente', () => {
    expect(verifyToken('u1.abc')).toBeNull()
  })
})

describe('parseCookies', () => {
  it('parseia múltiplos cookies', () => {
    expect(parseCookies('a=1; b=2; session=abc.def')).toEqual({ a: '1', b: '2', session: 'abc.def' })
  })

  it('trata header ausente ou malformado', () => {
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies(undefined)).toEqual({})
    expect(parseCookies('sem-igual; a=1')).toEqual({ a: '1' })
  })

  it('decodifica valores percent-encoded', () => {
    expect(parseCookies('x=a%20b')).toEqual({ x: 'a b' })
  })
})

describe('getSessionUserId', () => {
  it('extrai o userId do cookie de sessão', () => {
    const token = signToken('u1')
    const request = requestWithCookie(`${SESSION_COOKIE}=${encodeURIComponent(token)}`)
    expect(getSessionUserId(request)).toBe('u1')
  })

  it('retorna null sem cookie', () => {
    expect(getSessionUserId(requestWithCookie(null))).toBeNull()
  })

  it('retorna null com cookie inválido', () => {
    expect(getSessionUserId(requestWithCookie('session=invalido'))).toBeNull()
  })
})

describe('getSessionUser', () => {
  it('carrega o usuário da sessão', async () => {
    mockedUsers.findById.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
      createdAt: '2026-10-06T00:00:00.000Z',
    })
    const request = requestWithCookie(`session=${encodeURIComponent(signToken('u1'))}`)

    await expect(getSessionUser(request)).resolves.toEqual({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
    })
    expect(mockedUsers.findById).toHaveBeenCalledWith('u1')
  })

  it('retorna null sem sessão', async () => {
    await expect(getSessionUser(requestWithCookie(null))).resolves.toBeNull()
    expect(mockedUsers.findById).not.toHaveBeenCalled()
  })

  it('retorna null quando o usuário não existe mais', async () => {
    mockedUsers.findById.mockResolvedValue(null)
    const request = requestWithCookie(`session=${encodeURIComponent(signToken('u1'))}`)
    await expect(getSessionUser(request)).resolves.toBeNull()
  })
})

describe('cookies de sessão', () => {
  it('monta cookie HttpOnly', () => {
    expect(sessionCookie('u1')).toContain(`${SESSION_COOKIE}=`)
    expect(sessionCookie('u1')).toContain('HttpOnly')
    expect(sessionCookie('u1')).toContain('SameSite=Lax')
  })

  it('monta cookie de limpeza', () => {
    expect(CLEAR_SESSION_COOKIE).toContain('Max-Age=0')
  })
})
