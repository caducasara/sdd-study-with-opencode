import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import DashboardPage from '@/app/page'
import { ana, dataEnvelope, errorEnvelope, jsonResponse, makeHabit, route, routeFetch, setFetchMock } from '@/__tests__/helpers'

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

/** Sobe as rotas padrão da tela (session + listagem de hábitos). */
function defaultRoutes(habits: ReturnType<typeof makeHabit>[]) {
  return [
    route('/api/auth/session', dataEnvelope({ user: ana })),
    route('/api/habits', dataEnvelope(habits)),
  ]
}

describe('DashboardPage', () => {
  it('mostra skeletons enquanto carrega', () => {
    setFetchMock(jest.fn().mockReturnValue(new Promise(() => undefined)))

    render(<DashboardPage />)
    expect(screen.getByLabelText('Carregando hábitos')).toBeInTheDocument()
  })

  it('cumprimenta o usuário e lista os hábitos com resumo', async () => {
    routeFetch(defaultRoutes([makeHabit(), makeHabit({ id: 'h2', name: 'Ler' })]))
    render(<DashboardPage />)

    expect(await screen.findByText(/Olá, Ana/)).toBeInTheDocument()
    expect(screen.getByText('Seus hábitos')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Resumo do dia' })).toHaveTextContent('2')
    expect(screen.getByText('Beber água')).toBeInTheDocument()
    expect(screen.getByText('Ler')).toBeInTheDocument()
  })

  it('mostra o EmptyState quando não há hábitos', async () => {
    routeFetch(defaultRoutes([]))
    render(<DashboardPage />)

    expect(await screen.findByText('Nenhum hábito ainda')).toBeInTheDocument()
  })

  it('mostra erro de carregamento e permite tentar novamente', async () => {
    const fetchMock = jest.fn((url: string) => {
      if (String(url).includes('/api/habits')) {
        return Promise.resolve(jsonResponse(errorEnvelope(500, 'Erro inesperado'), 500))
      }
      return Promise.resolve(jsonResponse(dataEnvelope({ user: ana })))
    })
    setFetchMock(fetchMock)

    render(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro inesperado')

    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/api/habits')) {
        return Promise.resolve(jsonResponse(dataEnvelope([makeHabit()]), 200))
      }
      return Promise.resolve(jsonResponse(dataEnvelope({ user: ana })))
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Beber água')).toBeInTheDocument()
  })

  it('marca um hábito como concluído com atualização otimista', async () => {
    const fetchMock = routeFetch([
      ...defaultRoutes([makeHabit()]),
      route(
        '/api/habits/h1/complete',
        dataEnvelope(makeHabit({ concluidoHoje: true, streakAtual: 2, ultimaConclusao: '2026-10-06' })),
        { method: 'POST' }
      ),
    ])
    const user = userEvent.setup()
    render(<DashboardPage />)

    const button = await screen.findByRole('button', {
      name: 'Marcar Beber água como concluído hoje',
    })
    await user.click(button)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/habits/h1/complete',
        expect.objectContaining({ method: 'POST' })
      )
    )
    const toggled = await screen.findByRole('button', {
      name: 'Desmarcar Beber água como pendente hoje',
    })
    expect(toggled).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('status')).toHaveTextContent('Hábito concluído!')
  })

  it('desfaz a marcação otimista quando a API falha', async () => {
    const fetchMock = routeFetch(defaultRoutes([makeHabit()]))
    const user = userEvent.setup()
    render(<DashboardPage />)

    await screen.findByText('Beber água')
    fetchMock.mockRejectedValueOnce(new TypeError('network'))

    await user.click(
      screen.getByRole('button', { name: 'Marcar Beber água como concluído hoje' })
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Falha de conexão. Tente novamente.')
    const button = screen.getByRole('button', {
      name: 'Marcar Beber água como concluído hoje',
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('desmarca uma conclusão existente', async () => {
    const fetchMock = routeFetch([
      ...defaultRoutes([makeHabit({ concluidoHoje: true, streakAtual: 2 })]),
      route(
        '/api/habits/h1/complete',
        dataEnvelope(makeHabit({ concluidoHoje: false, streakAtual: 1, ultimaConclusao: null })),
        { method: 'DELETE' }
      ),
    ])
    const user = userEvent.setup()
    render(<DashboardPage />)

    await user.click(
      await screen.findByRole('button', { name: 'Desmarcar Beber água como pendente hoje' })
    )

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/habits/h1/complete',
        expect.objectContaining({ method: 'DELETE' })
      )
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Conclusão desmarcada')
  })

  it('cria um hábito pelo formulário do FAB', async () => {
    const created = makeHabit({ id: 'h9', name: 'Correr', description: '' })
    routeFetch([
      ...defaultRoutes([]),
      route('/api/habits', dataEnvelope(created), { method: 'POST', status: 201 }),
    ])
    const user = userEvent.setup()
    render(<DashboardPage />)

    await screen.findByText('Nenhum hábito ainda')
    await user.click(screen.getByRole('button', { name: 'Criar novo hábito' }))
    await user.type(screen.getByLabelText('Nome'), 'Correr')
    await user.click(screen.getByRole('button', { name: 'Criar hábito' }))

    expect(await screen.findByText('Correr')).toBeInTheDocument()
    expect(await screen.findByText('Hábito "Correr" criado')).toBeInTheDocument()
  })

  it('desloga e volta para o login', async () => {
    const fetchMock = routeFetch([
      ...defaultRoutes([makeHabit()]),
      route('/api/auth/logout', dataEnvelope(null), { method: 'POST' }),
    ])
    const user = userEvent.setup()
    render(<DashboardPage />)

    await screen.findByText('Beber água')
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
    expect(mockRefresh).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('segue para o login mesmo se o logout falhar', async () => {
    const fetchMock = routeFetch(defaultRoutes([makeHabit()]))
    const user = userEvent.setup()
    const { unmount } = render(<DashboardPage />)

    await screen.findByText('Beber água')
    fetchMock.mockRejectedValueOnce(new TypeError('network'))
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
    unmount()
  })
})