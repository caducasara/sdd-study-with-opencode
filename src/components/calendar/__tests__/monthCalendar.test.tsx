import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'

const completions = ['2026-10-01', '2026-10-15']

function setup() {
  const onPrevMonth = jest.fn()
  const onNextMonth = jest.fn()
  render(
    <MonthCalendar
      completions={completions}
      month={new Date(2026, 9, 1)}
      todayLabel="2026-10-06"
      onPrevMonth={onPrevMonth}
      onNextMonth={onNextMonth}
    />
  )
  return { onPrevMonth, onNextMonth }
}

describe('MonthCalendar', () => {
  it('exibe o mês e o ano do cabeçalho', () => {
    setup()
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()
  })

  it('marca dias concluídos', () => {
    setup()
    const day1 = screen.getByLabelText('2026-10-01')
    const day15 = screen.getByLabelText('2026-10-15')
    const day2 = screen.getByLabelText('2026-10-02')
    expect(day1.classList.contains('bg-brand-600')).toBe(true)
    expect(day15.classList.contains('bg-brand-600')).toBe(true)
    expect(day2.classList.contains('bg-brand-600')).toBe(false)
  })

  it('destaca o dia atual', () => {
    setup()
    const today = screen.getByLabelText('2026-10-06')
    expect(today.classList.contains('bg-brand-100')).toBe(true)
  })

  it('percorre os meses com os botões anterior/próximo', async () => {
    const { onPrevMonth, onNextMonth } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })

  it('gera células vazias para o alinhamento dos dias', () => {
    setup()
    // Outubro/2026 começa numa quinta-feira (índice 4): 4 células vazias antes do dia 1.
    const labels = screen.getAllByLabelText(/^2026-10-\d{2}$/)
    expect(labels).toHaveLength(31)
  })
})