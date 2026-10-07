'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { useHabits } from '@/components/hooks/useHabits'
import { useSession } from '@/components/hooks/useSession'
import { HabitCard } from '@/components/dashboard/HabitCard'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { HabitFormModal } from '@/components/hooks/HabitFormModal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiFetch } from '@/lib/apiClient'
import type { HabitSummary } from '@/types'

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  )
}

function DashboardContent() {
  const { habits, loading, error, refetch, upsert, addHabit } = useHabits()
  const { user } = useSession()
  const { showToast } = useToast()
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [busyIds, setBusyIds] = useState<string[]>([])

  const toggle = useCallback(
    async (habit: HabitSummary) => {
      const previous = habit
      upsert({
        ...previous,
        concluidoHoje: !previous.concluidoHoje,
        streakAtual: Math.max(0, previous.streakAtual + (previous.concluidoHoje ? -1 : 1)),
      })
      setBusyIds((ids) => [...ids, habit.id])
      try {
        const method = previous.concluidoHoje ? 'DELETE' : 'POST'
        const updated = await apiFetch<HabitSummary>(`/api/habits/${habit.id}/complete`, { method })
        upsert({ ...updated, concluidoHoje: !previous.concluidoHoje })
        showToast(
          previous.concluidoHoje ? 'Conclusão desmarcada' : 'Hábito concluído! 🔥',
          'success'
        )
      } catch (cause) {
        upsert(previous)
        showToast(cause instanceof Error ? cause.message : 'Erro ao atualizar hábito', 'error')
      } finally {
        setBusyIds((ids) => ids.filter((id) => id !== habit.id))
      }
    },
    [upsert, showToast]
  )

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // segue para o login mesmo se a API falhar
    }
    router.push('/login')
    router.refresh()
  }, [router])

  const total = habits?.length ?? 0
  const concluidosHoje = habits?.filter((h) => h.concluidoHoje).length ?? 0
  const melhorStreak =
    habits?.reduce((max, h) => Math.max(max, h.melhorStreak), 0) ?? 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-32 pt-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            {user ? `Olá, ${user.name.split(' ')[0]} 👋` : 'Carregando...'}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-stone-900">Seus hábitos</h1>
          <p className="mt-0.5 text-sm text-stone-500">O que você vai cumprir hoje?</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sair
        </Button>
      </header>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-50 px-6 py-8 text-center">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : loading && !habits ? (
        <div className="flex flex-col gap-3" aria-label="Carregando hábitos">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : habits && habits.length === 0 ? (
        <EmptyState onCreate={() => setFormOpen(true)} />
      ) : (
        <>
          <SummaryCards
            total={total}
            concluidosHoje={concluidosHoje}
            melhorStreak={melhorStreak}
          />
          <ul className="mt-4 flex flex-col gap-3">
            {habits?.map((habit) => (
              <li key={habit.id}>
                <HabitCard
                  habit={habit}
                  busy={busyIds.includes(habit.id)}
                  onToggle={(h) => void toggle(h)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        aria-label="Criar novo hábito"
        onClick={() => setFormOpen(true)}
        className="touch-target fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-95"
      >
        +
      </button>

      <HabitFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(habit) => {
          addHabit(habit)
          showToast(`Hábito "${habit.name}" criado`, 'success')
        }}
      />
    </main>
  )
}