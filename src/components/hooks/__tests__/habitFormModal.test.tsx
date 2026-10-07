import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitFormModal } from '@/components/hooks/HabitFormModal'
import {
  dataEnvelope,
  errorEnvelope,
  fetchOnce,
  jsonResponse,
  makeHabit,
  setFetchMock,
} from '@/__tests__/helpers'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('HabitFormModal', () => {
  it('não renderiza quando fechado', () => {
    render(<HabitFormModal open={false} onClose={jest.fn()} onCreated={jest.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cria um hábito com nome e descrição', async () => {
    const onCreated = jest.fn()
    const onClose = jest.fn()
    const habit = makeHabit({ id: 'novo', name: 'Ler 20 min', description: 'Antes de dormir' })
    const fetchMock = fetchOnce(dataEnvelope(habit))
    const user = userEvent.setup()

    render(<HabitFormModal open onClose={onClose} onCreated={onCreated} />)

    await user.type(screen.getByLabelText('Nome'), 'Ler 20 min')
    await user.type(screen.getByLabelText('Descrição (opcional)'), 'Antes de dormir')
    await user.click(screen.getByRole('button', { name: 'Criar hábito' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(habit))
    expect(onClose).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/habits',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Ler 20 min', description: 'Antes de dormir' }),
      })
    )
  })

  it('rejeita nome vazio sem chamar a API', async () => {
    const onCreated = jest.fn()
    const fetchMock = fetchOnce(dataEnvelope(makeHabit()), 201)
    const user = userEvent.setup()

    render(<HabitFormModal open onClose={jest.fn()} onCreated={onCreated} />)

    await user.click(screen.getByRole('button', { name: 'Criar hábito' }))
    expect(screen.getByText('Informe um nome para o hábito')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('mostra erro da API e permite corrigir', async () => {
    const onCreated = jest.fn()
    const user = userEvent.setup()

    const mock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(errorEnvelope(400, 'Nome muito longo'), 400))
      .mockResolvedValueOnce(jsonResponse(dataEnvelope(makeHabit()), 201))
    setFetchMock(mock)

    render(<HabitFormModal open onClose={jest.fn()} onCreated={onCreated} />)

    await user.type(screen.getByLabelText('Nome'), 'Nome longo')
    await user.click(screen.getByRole('button', { name: 'Criar hábito' }))
    await screen.findByText('Nome muito longo')
    expect(onCreated).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Curto')
    await user.click(screen.getByRole('button', { name: 'Criar hábito' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
  })

  it('limpa os campos ao reabrir', async () => {
    const user = userEvent.setup()
    fetchOnce(dataEnvelope(makeHabit()), 201)

    const { rerender } = render(
      <HabitFormModal open onClose={jest.fn()} onCreated={jest.fn()} />
    )
    await user.type(screen.getByLabelText('Nome'), 'Hábito antigo')

    rerender(<HabitFormModal open={false} onClose={jest.fn()} onCreated={jest.fn()} />)
    rerender(<HabitFormModal open onClose={jest.fn()} onCreated={jest.fn()} />)

    expect(screen.getByLabelText('Nome')).toHaveValue('')
  })
})