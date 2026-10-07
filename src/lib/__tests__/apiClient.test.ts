import { apiFetch, ApiClientError } from '@/lib/apiClient'
import { dataEnvelope, errorEnvelope, jsonResponse } from '@/__tests__/helpers'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('apiFetch', () => {
  it('faz GET e devolve o campo data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse(dataEnvelope({ ok: 1 }))) as never

    await expect(apiFetch<{ ok: number }>('/api/x')).resolves.toEqual({ ok: 1 })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ headers: { 'content-type': 'application/json' } })
    )
  })

  it('propaga o método informado', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(dataEnvelope(null))) as never

    await apiFetch('/api/x', { method: 'DELETE' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('lança ApiClientError com a mensagem do servidor', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(errorEnvelope(403, 'Acesso negado'), 403)) as never

    const error = await apiFetch('/api/x').catch((e) => e)
    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).status).toBe(403)
    expect((error as ApiClientError).message).toBe('Acesso negado')
  })

  it('usa mensagem padrão quando o corpo não tem envelope de erro', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse('sem formato', 500)) as never

    const error = await apiFetch('/api/x').catch((e) => e)
    expect((error as ApiClientError).message).toBe('Algo deu errado. Tente novamente.')
  })

  it('lança erro de conexão quando o fetch falha', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('network')) as never

    const error = await apiFetch('/api/x').catch((e) => e)
    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).status).toBe(0)
  })

  it('devolve o corpo não-envelopado quando não há data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse('texto')) as never

    await expect(apiFetch<string>('/api/x')).resolves.toBe('texto')
  })

  it('trata resposta sem corpo JSON', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('no body')
      },
    }) as never

    await expect(apiFetch('/api/x')).resolves.toBeNull()
  })
})