'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import type { HabitSummary } from '@/types'

export interface HabitCardProps {
  habit: HabitSummary
  busy?: boolean
  onToggle: (habit: HabitSummary) => void
}

export function HabitCard({ habit, busy = false, onToggle }: HabitCardProps) {
  const done = habit.concluidoHoje

  return (
    <Card className="flex items-center gap-3 animate-fade-in" interactive>
      <button
        type="button"
        onClick={() => onToggle(habit)}
        disabled={busy}
        aria-pressed={done}
        aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${habit.name} como ${done ? 'pendente' : 'concluído'} hoje`}
        className={`touch-target relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-xl transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm animate-pop'
            : 'border-stone-300 bg-white text-stone-300 hover:border-brand-400 hover:text-brand-400'
        } ${busy ? 'opacity-60' : ''}`}
      >
        <span aria-hidden>✓</span>
      </button>

      <Link href={`/habits/${habit.id}`} className="group min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900 group-hover:text-brand-700">{habit.name}</p>
        {habit.description ? (
          <p className="truncate text-sm text-stone-500">{habit.description}</p>
        ) : null}
        <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-amber-600">
          <span aria-hidden>🔥</span>
          <span>
            {habit.streakAtual} {habit.streakAtual === 1 ? 'dia' : 'dias'}
          </span>
        </p>
      </Link>
    </Card>
  )
}