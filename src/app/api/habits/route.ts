import { asString, handleApi, readJson, success } from '@/lib/api'
import { requireSessionUser } from '@/lib/auth/session'
import { createHabit, listHabits } from '@/lib/services/habitService'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleApi(async () => {
    const session = await requireSessionUser(request)
    const body = await readJson(request)
    const habit = await createHabit(session.id, {
      name: asString(body.name),
      description: asString(body.description),
    })
    return success(habit, 201)
  })
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const session = await requireSessionUser(request)
    const habits = await listHabits(session.id)
    return success(habits)
  })
}