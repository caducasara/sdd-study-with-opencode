import { Button } from '@/components/ui/Button'

export interface EmptyStateProps {
  onCreate: () => void
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center animate-fade-up">
      <span className="text-5xl" aria-hidden>
        🌱
      </span>
      <h2 className="text-lg font-semibold text-stone-900">Nenhum hábito ainda</h2>
      <p className="max-w-60 text-sm text-stone-500">
        Comece pequeno: crie um hábito simples e marque sua primeira conquista hoje.
      </p>
      <Button onClick={onCreate} className="mt-1">
        Criar meu primeiro hábito
      </Button>
    </div>
  )
}