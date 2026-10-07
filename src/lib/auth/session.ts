import crypto from 'crypto'
import * as userRepository from '@/lib/repositories/userRepository'
import { unauthorized } from '@/lib/errors'
import type { SessionUser } from '@/types'

export const SESSION_COOKIE = 'session'

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET não configurada')
  return secret
}

function signature(userId: string): string {
  return crypto.createHmac('sha256', getSecret()).update(userId).digest('hex')
}

/** Gera o token de sessão assinado para o usuário. */
export function signToken(userId: string): string {
  return `${userId}.${signature(userId)}`
}

/** Valida o token e devolve o userId, ou null se inválido. */
export function verifyToken(token: string | null | undefined): string | null {
  if (!token) return null
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const userId = token.slice(0, separator)
  const provided = token.slice(separator + 1)
  const expected = signature(userId)

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return null
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null
  return userId
}

/** Parse simples do header Cookie. */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  if (!header) return {}
  const cookies: Record<string, string> = {}
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key) cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

/** Extrai o userId da sessão presente na requisição (sem acesso ao banco). */
export function getSessionUserId(request: Request): string | null {
  const cookies = parseCookies(request.headers.get('cookie'))
  return verifyToken(cookies[SESSION_COOKIE])
}

/** Carrega o usuário da sessão da requisição. */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const userId = getSessionUserId(request)
  if (!userId) return null

  const user = await userRepository.findById(userId)
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email }
}

/** Carrega o usuário da sessão da requisição ou lança 401. */
export async function requireSessionUser(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request)
  if (!user) throw unauthorized()
  return user
}

/** Monta o valor do cookie de sessão (HTTP-only). */
export function sessionCookie(userId: string, maxAgeSeconds = 60 * 60 * 24 * 30): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(signToken(userId))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

export const CLEAR_SESSION_COOKIE = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
