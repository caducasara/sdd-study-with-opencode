import { renderHook, waitFor } from '@testing-library/react'
import { useSession } from '@/components/hooks/useSession'
import { ana, dataEnvelope, fetchOnce } from '@/__tests__/helpers'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useSession', () => {
  it('carrega o usuário da sessão', async () => {
    fetchOnce(dataEnvelope({ user: ana }))

    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual(ana)
  })

  it('fica com user null quando não há sessão', async () => {
    fetchOnce(dataEnvelope({ user: null }))

    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('fica com user null em caso de erro', async () => {
    fetchOnce({ error: { status: 500, message: 'Erro' } }, 500)

    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })
})