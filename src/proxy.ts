import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionUserId } from '@/lib/auth/session'

/**
 * Guarda de autenticação:
 * - Usuários sem sessão são redirecionados para /login.
 * - Usuários autenticados não acessam /login e /register.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authed = getSessionUserId(request) !== null

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  if (isAuthPage) {
    if (authed) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  if (!authed) {
    const login = new URL('/login', request.url)
    login.searchParams.set('from', pathname)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}