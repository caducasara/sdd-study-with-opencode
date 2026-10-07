import { handleApi } from '@/lib/api'
import { CLEAR_SESSION_COOKIE } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  return handleApi(async () => {
    return Response.json(
      { data: { loggedOut: true } },
      { headers: { 'Set-Cookie': CLEAR_SESSION_COOKIE } }
    )
  })
}