import { connectDB } from '@/lib/db'
import { Habit, toHabit, type HabitDocument } from '@/lib/models/habit'
import type { Habit as HabitDTO } from '@/types'

export interface CreateHabitInput {
  userId: string
  name: string
  description?: string
}

export async function create(input: CreateHabitInput): Promise<HabitDTO> {
  await connectDB()
  const doc = await Habit.create({
    userId: input.userId,
    name: input.name,
    description: input.description ?? '',
  })
  return toHabit(doc)
}

export async function listByUser(userId: string): Promise<HabitDTO[]> {
  await connectDB()
  const docs = await Habit.find({ userId }).sort({ createdAt: 1 }).lean()
  return docs.map((doc) => toHabit(doc as unknown as HabitDocument))
}

export async function findById(id: string): Promise<HabitDTO | null> {
  await connectDB()
  const doc = await Habit.findById(id).lean()
  return doc ? toHabit(doc as unknown as HabitDocument) : null
}

export async function deleteById(id: string): Promise<number> {
  await connectDB()
  const result = await Habit.deleteOne({ _id: id })
  return result.deletedCount ?? 0
}

export async function updateStreaks(
  id: string,
  streaks: { streakAtual: number; melhorStreak: number; ultimaConclusao: Date | null }
): Promise<HabitDTO | null> {
  await connectDB()
  const doc = await Habit.findByIdAndUpdate(
    id,
    { $set: streaks },
    { returnDocument: 'after' }
  ).lean()
  return doc ? toHabit(doc as unknown as HabitDocument) : null
}
