import { render, screen } from '@testing-library/react'
import { SummaryCards } from '@/components/dashboard/SummaryCards'

describe('SummaryCards', () => {
  it('exibe os três indicadores do dia', () => {
    render(<SummaryCards total={5} concluidosHoje={2} melhorStreak={12} />)

    const section = screen.getByRole('region', { name: 'Resumo do dia' })
    expect(section).toBeInTheDocument()
    expect(section).toHaveTextContent('5')
    expect(section).toHaveTextContent('Hábitos')
    expect(section).toHaveTextContent('2')
    expect(section).toHaveTextContent('Concluídos')
    expect(section).toHaveTextContent('12')
    expect(section).toHaveTextContent('Melhor streak')
  })

  it('aceita valores zerados', () => {
    render(<SummaryCards total={0} concluidosHoje={0} melhorStreak={0} />)
    expect(screen.getAllByText('0')).toHaveLength(3)
  })
})