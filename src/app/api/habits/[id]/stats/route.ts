import { handleApi, success } from '@/lib/api'
import { requireSessionUser } from '@/lib/auth/session'
import { getStats } from '@/lib/services/habitService'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, ctx: RouteContext) {
  return handleApi(async () => {
    const session = await requireSessionUser(request)
    const { id } = await ctx.params
    const stats = await getStats(session.id, id)
    return success(stats)
  })
}