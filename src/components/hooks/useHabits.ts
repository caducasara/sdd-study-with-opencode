'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'
import type { HabitSummary } from '@/types'

export interface UseHabitsResult {
  habits: HabitSummary[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  upsert: (habit: HabitSummary) => void
  addHabit: (habit: HabitSummary) => void
  removeHabit: (id: string) => void
}

export function useHabits(): UseHabitsResult {
  const [habits, setHabits] = useState<HabitSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    apiFetch<HabitSummary[]>('/api/habits')
      .then((data) => {
        if (!active) return
        setError(null)
        setHabits(data)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setHabits(null)
        setError(cause instanceof Error ? cause.message : 'Erro ao carregar hábitos')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const refetch = useCallback(async () => {
    try {
      const data = await apiFetch<HabitSummary[]>('/api/habits')
      setError(null)
      setHabits(data)
    } catch (cause) {
      setHabits(null)
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar hábitos')
    } finally {
      setLoading(false)
    }
  }, [])

  const upsert = useCallback((habit: HabitSummary) => {
    setHabits((current) =>
      current ? current.map((h) => (h.id === habit.id ? habit : h)) : current
    )
  }, [])

  const addHabit = useCallback((habit: HabitSummary) => {
    setHabits((current) => [...(current ?? []), habit])
  }, [])

  const removeHabit = useCallback((id: string) => {
    setHabits((current) => current?.filter((h) => h.id !== id) ?? null)
  }, [])

  return { habits, loading, error, refetch, upsert, addHabit, removeHabit }
}