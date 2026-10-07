import { handleApi, success } from '@/lib/api'
import { requireSessionUser } from '@/lib/auth/session'
import { completeToday, uncompleteToday } from '@/lib/services/habitService'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, ctx: RouteContext) {
  return handleApi(async () => {
    const session = await requireSessionUser(request)
    const { id } = await ctx.params
    const habit = await completeToday(session.id, id)
    return success(habit)
  })
}

export async function DELETE(request: Request, ctx: RouteContext) {
  return handleApi(async () => {
    const session = await requireSessionUser(request)
    const { id } = await ctx.params
    const habit = await uncompleteToday(session.id, id)
    return success(habit)
  })
}