import { asString, handleApi, readJson } from '@/lib/api'
import { sessionCookie } from '@/lib/auth/session'
import { register } from '@/lib/services/authService'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleApi(async () => {
    const body = await readJson(request)
    const user = await register({
      name: asString(body.name),
      email: asString(body.email),
      password: asString(body.password),
    })
    return Response.json(
      { data: { user: { id: user.id, name: user.name, email: user.email } } },
      { status: 201, headers: { 'Set-Cookie': sessionCookie(user.id) } }
    )
  })
}