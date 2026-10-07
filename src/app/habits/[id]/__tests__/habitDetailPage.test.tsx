import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import HabitDetailPage from '@/app/habits/[id]/page'
import type { HabitStats } from '@/lib/services/habitService'
import { dataEnvelope, errorEnvelope, jsonResponse, makeHabit, route, routeFetch, setFetchMock } from '@/__tests__/helpers'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

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

beforeEach(() => {
  jest.clearAllMocks()
})

function statsRoute(data: unknown, status = 200) {
  return route('/api/habits/h1/stats', data, { status })
}

const stats: HabitStats = {
  habit: makeHabit({ streakAtual: 5, melhorStreak: 9 }),
  streakAtual: 5,
  melhorStreak: 9,
  completions: ['2026-10-01'],
  concluidoHoje: false,
}

describe('HabitDetailPage', () => {
  it('exibe nome, descrição, streaks e calendário', async () => {
    routeFetch([statsRoute(dataEnvelope(stats))])
    await act(async () => {
      render(<HabitDetailPage params={Promise.resolve({ id: 'h1' })} />)
    })

    expect(await screen.findByText('Beber água')).toBeInTheDocument()
    expect(screen.getByText('Manter hidratação')).toBeInTheDocument()
    const streakCard = screen.getByText('dias seguidos').parentElement as HTMLElement
    const bestCard = screen.getByText('melhor sequência').parentElement as HTMLElement
    expect(streakCard).toHaveTextContent('5')
    expect(bestCard).toHaveTextContent('9')
    expect(screen.getByText('dias seguidos')).toBeInTheDocument()
    expect(screen.getByText('melhor sequência')).toBeInTheDocument()
    // Calendário: dia concluído marcado
    expect(screen.getByLabelText('2026-10-01')).toHaveClass('bg-brand-600')
  })

  it('mostra erro de carregamento e permite tentar novamente', async () => {
    const fetchMock = jest.fn((url: string) => {
      if (String(url).includes('/api/habits/h1/stats')) {
        return Promise.resolve(jsonResponse(errorEnvelope(500, 'Erro inesperado'), 500))
      }
      return Promise.resolve(jsonResponse(dataEnvelope(stats)))
    })
    setFetchMock(fetchMock)

    await act(async () => {
      render(<HabitDetailPage params={Promise.resolve({ id: 'h1' })} />)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro inesperado')

    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(dataEnvelope(stats), 200))
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Beber água')).toBeInTheDocument()
  })

  it('navega entre os meses do calendário', async () => {
    routeFetch([statsRoute(dataEnvelope(stats))])
    const user = userEvent.setup()
    await act(async () => {
      render(<HabitDetailPage params={Promise.resolve({ id: 'h1' })} />)
    })

    await screen.findByText('Beber água')
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(await screen.findByText('Setembro 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(await screen.findByText('Outubro 2026')).toBeInTheDocument()
  })

  it('exclui o hábito e volta ao dashboard', async () => {
    const fetchMock = routeFetch([
      statsRoute(dataEnvelope(stats)),
      route('/api/habits/h1', dataEnvelope(null), { method: 'DELETE' }),
    ])
    const user = userEvent.setup()
    await act(async () => {
      render(<HabitDetailPage params={Promise.resolve({ id: 'h1' })} />)
    })

    await screen.findByText('Beber água')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/habits/h1',
        expect.objectContaining({ method: 'DELETE' })
      )
    )
    expect(mockPush).toHaveBeenCalledWith('/')
    expect(await screen.findByText('Hábito excluído')).toBeInTheDocument()
  })

  it('mantém o usuário na página quando a exclusão falha', async () => {
    const fetchMock = routeFetch([
      statsRoute(dataEnvelope(stats)),
      route('/api/habits/h1', errorEnvelope(500, 'Erro inesperado'), {
        method: 'DELETE',
        status: 500,
      }),
    ])
    const user = userEvent.setup()
    await act(async () => {
      render(<HabitDetailPage params={Promise.resolve({ id: 'h1' })} />)
    })

    await screen.findByText('Beber água')
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/habits/h1',
        expect.objectContaining({ method: 'DELETE' })
      )
    )
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})