export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

export interface Habit {
  id: string
  userId: string
  name: string
  description: string
  streakAtual: number
  melhorStreak: number
  ultimaConclusao: string | null
  createdAt: string
}

export interface Completion {
  id: string
  habitId: string
  userId: string
  date: string
  createdAt: string
}

/** Resumo exibido no dashboard. */
export interface HabitSummary extends Habit {
  concluidoHoje: boolean
}

export interface SessionUser {
  id: string
  name: string
  email: string
}
