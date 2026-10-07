import { act, renderHook, waitFor } from '@testing-library/react'
import { useHabits } from '@/components/hooks/useHabits'
import { dataEnvelope, fetchOnce, makeHabit } from '@/__tests__/helpers'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useHabits', () => {
  it('carrega os hábitos no monte', async () => {
    const habits = [makeHabit(), makeHabit({ id: 'h2', name: 'Ler' })]
    fetchOnce(dataEnvelope(habits))

    const { result } = renderHook(() => useHabits())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.habits).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('manipula erro de carregamento', async () => {
    fetchOnce({ error: { status: 500, message: 'Erro inesperado' } }, 500)

    const { result } = renderHook(() => useHabits())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.habits).toBeNull()
    expect(result.current.error).toBe('Erro inesperado')
  })

  it('refetch carrega novamente', async () => {
    const first = fetchOnce(dataEnvelope([]))
    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(first).toHaveBeenCalled()

    fetchOnce(dataEnvelope([makeHabit()]))
    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.habits).toHaveLength(1)
  })

  it('upsert substitui um hábito existente', async () => {
    fetchOnce(dataEnvelope([makeHabit()]))
    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.upsert(makeHabit({ streakAtual: 9 }))
    })
    expect(result.current.habits?.[0].streakAtual).toBe(9)
  })

  it('addHabit adiciona e removeHabit remove', async () => {
    fetchOnce(dataEnvelope([]))
    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.addHabit(makeHabit({ id: 'novo' }))
    })
    expect(result.current.habits).toHaveLength(1)

    act(() => {
      result.current.removeHabit('novo')
    })
    expect(result.current.habits).toHaveLength(0)
  })
})