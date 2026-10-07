'use client'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export interface MonthCalendarProps {
  completions: string[]
  month: Date
  todayLabel: string
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function MonthCalendar({
  completions,
  month,
  todayLabel,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const cells: Array<{ day: number; key: string } | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: `${year}-${pad(monthIndex + 1)}-${pad(day)}` })
  }

  const completed = new Set(completions)

  return (
    <section aria-label="Calendário de conclusões">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Mês anterior"
          className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold text-stone-700">
          {MONTHS[monthIndex]} {year}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Próximo mês"
          className="touch-target flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400">
        {WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`} className="py-1">
            {w}
          </span>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <span key={`empty-${i}`} />
          const isToday = cell.key === todayLabel
          const isDone = completed.has(cell.key)
          return (
            <span
              key={cell.key}
              aria-label={cell.key}
              className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-medium ${
                isDone
                  ? 'bg-brand-600 text-white'
                  : isToday
                    ? 'bg-brand-100 text-brand-800'
                    : 'text-stone-600'
              }`}
            >
              {cell.day}
              {isToday && !isDone ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-600" />
              ) : null}
            </span>
          )
        })}
      </div>
    </section>
  )
}