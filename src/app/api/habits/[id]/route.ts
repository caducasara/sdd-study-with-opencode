import { handleApi, success } from '@/lib/api'
import { requireSessionUser } from '@/lib/auth/session'
import { deleteHabit } from '@/lib/services/habitService'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, ctx: RouteContext) {
  return handleApi(async () => {
    const session = await requireSessionUser(request)
    const { id } = await ctx.params
    await deleteHabit(session.id, id)
    return success({ deleted: true })
  })
}