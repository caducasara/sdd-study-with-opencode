import { asString, handleApi, readJson } from '@/lib/api'
import { sessionCookie } from '@/lib/auth/session'
import { login } from '@/lib/services/authService'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleApi(async () => {
    const body = await readJson(request)
    const user = await login({
      email: asString(body.email),
      password: asString(body.password),
    })
    return Response.json(
      { data: { user: { id: user.id, name: user.name, email: user.email } } },
      { status: 200, headers: { 'Set-Cookie': sessionCookie(user.id) } }
    )
  })
}