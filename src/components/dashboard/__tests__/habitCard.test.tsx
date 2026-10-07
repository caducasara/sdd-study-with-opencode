import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { HabitCard } from '@/components/dashboard/HabitCard'
import { makeHabit } from '@/__tests__/helpers'

jest.mock('next/link', () => {
  return function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string
    children: ReactNode
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
})

describe('HabitCard', () => {
  it('exibe nome, descrição e streak', () => {
    render(<HabitCard habit={makeHabit()} onToggle={jest.fn()} />)

    expect(screen.getByText('Beber água')).toBeInTheDocument()
    expect(screen.getByText('Manter hidratação')).toBeInTheDocument()
    expect(screen.getByText('1 dia')).toBeInTheDocument()
  })

  it('pluraliza o contador de dias', () => {
    render(<HabitCard habit={makeHabit({ streakAtual: 4 })} onToggle={jest.fn()} />)
    expect(screen.getByText('4 dias')).toBeInTheDocument()
  })

  it('indica estado concluído hoje via aria-pressed', () => {
    render(<HabitCard habit={makeHabit({ concluidoHoje: true })} onToggle={jest.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('chama onToggle ao marcar/desmarcar', async () => {
    const onToggle = jest.fn()
    const habit = makeHabit()
    const user = userEvent.setup()
    render(<HabitCard habit={habit} onToggle={onToggle} />)

    await user.click(
      screen.getByRole('button', { name: 'Marcar Beber água como concluído hoje' })
    )
    expect(onToggle).toHaveBeenCalledWith(habit)
  })

  it('desabilita o botão durante a atualização', () => {
    render(<HabitCard habit={makeHabit()} busy onToggle={jest.fn()} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('linka para a página de detalhes', () => {
    render(<HabitCard habit={makeHabit()} onToggle={jest.fn()} />)
    expect(screen.getByRole('link', { name: /beber água/i })).toHaveAttribute(
      'href',
      '/habits/h1'
    )
  })
})