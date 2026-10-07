/**
 * @jest-environment node
 */
import { ApiError, badRequest, conflict, forbidden, notFound, unauthorized } from '@/lib/errors'
import { asString, failure, handleApi, readJson, success } from '@/lib/api'

describe('errors', () => {
  it('cria ApiError com status e mensagem', () => {
    const err = new ApiError(418, 'teapot')
    expect(err.status).toBe(418)
    expect(err.message).toBe('teapot')
    expect(err.name).toBe('ApiError')
  })

  it('helpers de erro retornam os status esperados', () => {
    expect(badRequest('x').status).toBe(400)
    expect(unauthorized('x').status).toBe(401)
    expect(forbidden('x').status).toBe(403)
    expect(notFound('x').status).toBe(404)
    expect(conflict('x').status).toBe(409)
  })
})

describe('success / failure', () => {
  it('serializa sucesso com status padrão 200', async () => {
    const res = success({ a: 1 })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ data: { a: 1 } })
  })

  it('serializa sucesso com status customizado', () => {
    const res = success({ id: '1' }, 201)
    expect(res.status).toBe(201)
  })

  it('serializa erro com corpo padronizado', async () => {
    const res = failure(404, 'sumiu')
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: { status: 404, message: 'sumiu' } })
  })
})

describe('handleApi', () => {
  it('devolve o resultado do handler', async () => {
    const res = await handleApi(() => success({ ok: true }))
    expect(res.status).toBe(200)
  })

  it('mapeia ApiError para o status correto', async () => {
    const res = await handleApi(() => {
      throw new ApiError(403, 'nope')
    })
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: { status: 403, message: 'nope' } })
  })

  it('mapeia erro de índice duplicado (11000) para 409', async () => {
    const dup = Object.assign(new Error('duplicado'), { code: 11000 })
    const res = await handleApi(() => {
      throw dup
    })
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: { status: 409, message: 'duplicado' },
    })
  })

  it('mapeia erro de validação do mongoose para 400', async () => {
    const validation = Object.assign(new Error('falha'), { name: 'ValidationError' })
    const res = await handleApi(() => {
      throw validation
    })
    expect(res.status).toBe(400)
  })

  it('mapeia erros inesperados para 500 sem vazar a mensagem', async () => {
    const res = await handleApi(() => {
      throw new Error('segredo do banco')
    })
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      error: { status: 500, message: 'Erro inesperado' },
    })
  })

  it('mapeia valores não-Error para 500', async () => {
    const res = await handleApi(() => {
      throw 'boom'
    })
    expect(res.status).toBe(500)
  })
})

describe('asString', () => {
  it('mantém strings e converte demais valores para vazio', () => {
    expect(asString('ok')).toBe('ok')
    expect(asString(42)).toBe('')
    expect(asString(null)).toBe('')
    expect(asString(undefined)).toBe('')
    expect(asString({ a: 1 })).toBe('')
  })
})

describe('readJson', () => {
  it('faz parse do corpo JSON e devolve o objeto', async () => {
    const req = new Request('http://localhost/api/x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ler' }),
    })
    await expect(readJson(req)).resolves.toEqual({ name: 'Ler' })
  })

  it('recusa corpos que não são objetos', async () => {
    const req = new Request('http://localhost/api/x', {
      method: 'POST',
      body: '[1, 2]',
    })
    const error = await readJson(req).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).message).toBe('Corpo da requisição inválido')
  })

  it('recusa JSON inválido com 400', async () => {
    const req = new Request('http://localhost/api/x', {
      method: 'POST',
      body: '{não-é-json',
    })
    const error = await readJson(req).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).message).toBe('JSON inválido')
  })
})