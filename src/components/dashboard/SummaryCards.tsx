import { Card } from '@/components/ui/Card'

export interface SummaryCardsProps {
  total: number
  concluidosHoje: number
  melhorStreak: number
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent: string
}) {
  return (
    <Card className="flex flex-col items-center gap-0.5 p-3 text-center">
      <span className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</span>
      <span className="text-xs text-stone-500">{label}</span>
    </Card>
  )
}

export function SummaryCards({ total, concluidosHoje, melhorStreak }: SummaryCardsProps) {
  return (
    <section aria-label="Resumo do dia" className="grid grid-cols-3 gap-3">
      <Stat value={total} label="Hábitos" accent="text-stone-900" />
      <Stat value={concluidosHoje} label="Concluídos" accent="text-emerald-600" />
      <Stat value={melhorStreak} label="Melhor streak" accent="text-amber-600" />
    </section>
  )
}