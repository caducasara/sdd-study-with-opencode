'use client'

import { Suspense, use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiFetch } from '@/lib/apiClient'
import { toDateKey } from '@/lib/services/streakService'
import type { HabitStats } from '@/lib/services/habitService'

export default function HabitDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ToastProvider>
      <Suspense fallback={<DetailFallback />}>
        <HabitDetailContent params={props.params} />
      </Suspense>
    </ToastProvider>
  )
}

function DetailFallback() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 py-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </main>
  )
}

function HabitDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { showToast } = useToast()
  const [stats, setStats] = useState<HabitStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => new Date())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const today = toDateKey(new Date())

  const refetch = useCallback(async () => {
    try {
      setStats(await apiFetch<HabitStats>(`/api/habits/${id}/stats`))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar o hábito')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let active = true
    apiFetch<HabitStats>(`/api/habits/${id}/stats`)
      .then((data) => {
        if (!active) return
        setStats(data)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Erro ao carregar o hábito')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await apiFetch(`/api/habits/${id}`, { method: 'DELETE' })
      showToast('Hábito excluído', 'success')
      router.push('/')
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Não foi possível excluir', 'error')
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }, [id, router, showToast])

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
        <Link href="/" className="mb-6 text-sm font-medium text-brand-700 hover:underline">
          ‹ Voltar
        </Link>
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-50 px-6 py-8 text-center">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      </main>
    )
  }

  if (loading || !stats) {
    return <DetailFallback />
  }

  const habit = stats.habit
  const goToPrevMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const goToNextMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-brand-700 hover:underline">
          ‹ Voltar
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
          Excluir
        </Button>
      </header>

      <section className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{habit.name}</h1>
        {habit.description ? (
          <p className="mt-1 text-stone-500">{habit.description}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card className="flex flex-col items-center gap-1 py-5 text-center">
            <span className="text-4xl" aria-hidden>
              🔥
            </span>
            <span className="text-3xl font-bold tabular-nums text-amber-600">
              {stats.streakAtual}
            </span>
            <span className="text-xs text-stone-500">
              {stats.streakAtual === 1 ? 'dia seguido' : 'dias seguidos'}
            </span>
          </Card>
          <Card className="flex flex-col items-center justify-center gap-1 py-5 text-center">
            <span className="text-3xl font-bold tabular-nums text-brand-600">
              {stats.melhorStreak}
            </span>
            <span className="text-xs text-stone-500">melhor sequência</span>
          </Card>
        </div>
      </section>

      <Card className="animate-fade-up">
        <MonthCalendar
          completions={stats.completions}
          month={month}
          todayLabel={today}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
        />
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir hábito"
        message={`Tem certeza que deseja excluir "${habit.name}"? Todo o histórico será removido.`}
        confirmLabel="Excluir"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteOpen(false)}
      />
    </main>
  )
}