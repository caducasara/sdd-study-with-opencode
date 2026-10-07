import * as completionRepository from '@/lib/repositories/completionRepository'
import * as habitRepository from '@/lib/repositories/habitRepository'
import { badRequest, forbidden, notFound } from '@/lib/errors'
import { calculateStreaks, parseDateKey, todayKey } from '@/lib/services/streakService'
import type { Habit, HabitSummary } from '@/types'

export interface CreateHabitInput {
  name: string
  description?: string
}

export interface HabitStats {
  habit: Habit
  streakAtual: number
  melhorStreak: number
  completions: string[]
  concluidoHoje: boolean
}

async function getOwnedHabit(userId: string, habitId: string): Promise<Habit> {
  const habit = await habitRepository.findById(habitId)
  if (!habit) throw notFound('Hábito não encontrado')
  if (habit.userId !== userId) throw forbidden('Este hábito pertence a outro usuário')
  return habit
}

export async function createHabit(userId: string, input: CreateHabitInput): Promise<Habit> {
  const name = (input.name ?? '').trim()
  if (!name) throw badRequest('Informe um nome para o hábito')
  if (name.length > 100) throw badRequest('O nome do hábito pode ter no máximo 100 caracteres')

  return habitRepository.create({
    userId,
    name,
    description: (input.description ?? '').trim(),
  })
}

export async function listHabits(userId: string, hoje: string = todayKey()): Promise<HabitSummary[]> {
  const [habits, completionsByHabit] = await Promise.all([
    habitRepository.listByUser(userId),
    completionRepository.listDatesByUserGrouped(userId),
  ])

  return habits.map((habit) => {
    const dates = completionsByHabit[habit.id] ?? []
    const streaks = calculateStreaks(dates, {
      melhorStreakAnterior: habit.melhorStreak,
      hoje,
    })
    return {
      ...habit,
      streakAtual: streaks.streakAtual,
      melhorStreak: streaks.melhorStreak,
      concluidoHoje: dates.includes(hoje),
    }
  })
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const habit = await getOwnedHabit(userId, habitId)
  await habitRepository.deleteById(habit.id)
  await completionRepository.deleteByHabit(habit.id)
}

async function recomputeAndPersist(
  habit: Habit,
  dates: string[],
  hoje: string,
  ultimaConclusao: Date | null
): Promise<Habit> {
  const streaks = calculateStreaks(dates, {
    melhorStreakAnterior: habit.melhorStreak,
    hoje,
  })
  const updated = await habitRepository.updateStreaks(habit.id, {
    streakAtual: streaks.streakAtual,
    melhorStreak: streaks.melhorStreak,
    ultimaConclusao,
  })
  return updated ?? habit
}

export async function completeToday(
  userId: string,
  habitId: string,
  hoje: string = todayKey()
): Promise<Habit> {
  const habit = await getOwnedHabit(userId, habitId)
  await completionRepository.complete({ habitId: habit.id, userId, date: hoje })
  const dates = await completionRepository.listDatesByHabit(habit.id)
  return recomputeAndPersist(habit, dates, hoje, parseDateKey(hoje))
}

export async function uncompleteToday(
  userId: string,
  habitId: string,
  hoje: string = todayKey()
): Promise<Habit> {
  const habit = await getOwnedHabit(userId, habitId)
  await completionRepository.uncomplete(habit.id, hoje)
  const dates = await completionRepository.listDatesByHabit(habit.id)
  return recomputeAndPersist(habit, dates, hoje, dates.length > 0 ? parseDateKey(dates[dates.length - 1]) : null)
}

export async function getStats(
  userId: string,
  habitId: string,
  hoje: string = todayKey()
): Promise<HabitStats> {
  const habit = await getOwnedHabit(userId, habitId)
  const dates = await completionRepository.listDatesByHabit(habit.id)
  const streaks = calculateStreaks(dates, { melhorStreakAnterior: habit.melhorStreak, hoje })
  return {
    habit: { ...habit, streakAtual: streaks.streakAtual, melhorStreak: streaks.melhorStreak },
    streakAtual: streaks.streakAtual,
    melhorStreak: streaks.melhorStreak,
    completions: dates,
    concluidoHoje: dates.includes(hoje),
  }
}
