import { handleApi, success } from '@/lib/api'
import { getSessionUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleApi(async () => {
    const user = await getSessionUser(request)
    return success({ user })
  })
}