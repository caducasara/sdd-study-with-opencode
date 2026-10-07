/**
 * @jest-environment node
 */
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { connectDB, resetDBCache } from '@/lib/db'
import { POST as POSTRegister } from '@/app/api/auth/register/route'
import { POST as POSTLogin } from '@/app/api/auth/login/route'
import { POST as POSTLogout } from '@/app/api/auth/logout/route'
import { GET as GETSession } from '@/app/api/auth/session/route'
import { GET as GETHabits, POST as POSTHabits } from '@/app/api/habits/route'
import { DELETE as DELETEHabit } from '@/app/api/habits/[id]/route'
import { DELETE as DELETComplete, POST as POSTComplete } from '@/app/api/habits/[id]/complete/route'
import { GET as GETStats } from '@/app/api/habits/[id]/stats/route'
import { completeToday, uncompleteToday } from '@/lib/services/habitService'

let mongo: MongoMemoryServer

function jsonRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  cookie?: string
): Request {
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  headers.set('content-type', 'application/json')
  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function extractCookie(response: Response): string {
  return response.headers.get('set-cookie') as string
}

async function registerUser(name: string, email: string): Promise<string> {
  const res = await POSTRegister(
    jsonRequest('POST', 'http://localhost/api/auth/register', { name, email, password: 'senha123' })
  )
  expect(res.status).toBe(201)
  return extractCookie(res)
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri('habittrack-test')
  resetDBCache()
  await connectDB()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})

beforeEach(async () => {
  jest.restoreAllMocks()
  const db = mongoose.connection.db
  if (!db) return
  const collections = await db.listCollections().toArray()
  for (const { name } of collections) {
    await db.dropCollection(name)
  }
})

describe('POST /api/auth/register', () => {
  it('registra e define o cookie de sessão', async () => {
    const res = await POSTRegister(
      jsonRequest('POST', 'http://localhost/api/auth/register', {
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senha123',
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.user.email).toBe('ana@example.com')
    expect(extractCookie(res)).toContain('session=')

    const session = await GETSession(
      jsonRequest('GET', 'http://localhost/api/auth/session', undefined, extractCookie(res))
    )
    await expect(session.json()).resolves.toEqual({
      data: { user: expect.objectContaining({ id: expect.any(String) }) },
    })
  })

  it('rejeita registro com e-mail duplicado', async () => {
    await registerUser('Ana', 'dup@example.com')
    const res = await POSTRegister(
      jsonRequest('POST', 'http://localhost/api/auth/register', {
        name: 'Outra',
        email: 'dup@example.com',
        password: 'senha123',
      })
    )
    expect(res.status).toBe(409)
  })

  it('rejeita registro com e-mail inválido', async () => {
    const res = await POSTRegister(
      jsonRequest('POST', 'http://localhost/api/auth/register', {
        name: 'Ana',
        email: 'invalido',
        password: 'senha123',
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejeita JSON malformado', async () => {
    const res = await POSTRegister(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: '{nao-json',
      })
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('autentica com credenciais válidas', async () => {
    await registerUser('Ana', 'login@example.com')
    const res = await POSTLogin(
      jsonRequest('POST', 'http://localhost/api/auth/login', {
        email: 'login@example.com',
        password: 'senha123',
      })
    )
    expect(res.status).toBe(200)
    expect(extractCookie(res)).toContain('session=')
  })

  it('rejeita senha incorreta', async () => {
    await registerUser('Ana', 'wrong@example.com')
    const res = await POSTLogin(
      jsonRequest('POST', 'http://localhost/api/auth/login', {
        email: 'wrong@example.com',
        password: 'errada',
      })
    )
    expect(res.status).toBe(401)
  })

  it('rejeita e-mail inexistente', async () => {
    const res = await POSTLogin(
      jsonRequest('POST', 'http://localhost/api/auth/login', {
        email: 'nobody@example.com',
        password: 'senha123',
      })
    )
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/session e logout', () => {
  it('retorna sessão nula sem cookie', async () => {
    const res = await GETSession(jsonRequest('GET', 'http://localhost/api/auth/session'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ data: { user: null } })
  })

  it('retorna sessão nula com cookie inválido', async () => {
    const res = await GETSession(
      jsonRequest('GET', 'http://localhost/api/auth/session', undefined, 'session=invalido')
    )
    await expect(res.json()).resolves.toEqual({ data: { user: null } })
  })

  it('logout limpa o cookie', async () => {
    const cookie = await registerUser('Ana', 'logout@example.com')
    const res = await POSTLogout()
    expect(res.status).toBe(200)
    expect(extractCookie(res)).toContain('Max-Age=0')
    expect(cookie).not.toBeNull()
  })
})

describe('/api/habits', () => {
  it('exige autenticação', async () => {
    const res = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Ler' })
    )
    expect(res.status).toBe(401)

    const list = await GETHabits(jsonRequest('GET', 'http://localhost/api/habits'))
    expect(list.status).toBe(401)
  })

  it('cria e lista hábitos com status de hoje', async () => {
    const cookie = await registerUser('Ana', 'habits@example.com')
    const created = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Ler 20 min', description: 'Antes de dormir' }, cookie)
    )
    expect(created.status).toBe(201)
    const body = await created.json()

    const list = await GETHabits(jsonRequest('GET', 'http://localhost/api/habits', undefined, cookie))
    expect(list.status).toBe(200)
    const listBody = await list.json()
    expect(listBody.data).toHaveLength(1)
    expect(listBody.data[0]).toMatchObject({ name: 'Ler 20 min', concluidoHoje: false })
    expect(body.data.id).toBe(listBody.data[0].id)
  })

  it('rejeita nome vazio', async () => {
    const cookie = await registerUser('Ana', 'empty@example.com')
    const res = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: '  ' }, cookie)
    )
    expect(res.status).toBe(400)
  })
})

describe('/api/habits/[id] DELETE', () => {
  it('exclui o hábito e as conclusões', async () => {
    const cookie = await registerUser('Ana', 'del@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Hábito a excluir' }, cookie)
    )
    const { data } = await habit.json()

    await POSTComplete(
      jsonRequest('POST', `http://localhost/api/habits/${data.id}/complete`, undefined, cookie),
      ctx(data.id)
    )

    const res = await DELETEHabit(
      jsonRequest('DELETE', `http://localhost/api/habits/${data.id}`, undefined, cookie),
      ctx(data.id)
    )
    expect(res.status).toBe(200)

    const stats = await GETStats(
      jsonRequest('GET', `http://localhost/api/habits/${data.id}/stats`, undefined, cookie),
      ctx(data.id)
    )
    expect(stats.status).toBe(404)
  })

  it('retorna 404 para hábito inexistente', async () => {
    const cookie = await registerUser('Ana', 'del404@example.com')
    const res = await DELETEHabit(
      jsonRequest('DELETE', 'http://localhost/api/habits/000000000000000000000000', undefined, cookie),
      ctx('000000000000000000000000')
    )
    expect(res.status).toBe(404)
  })

  it('retorna 403 para hábito de outro usuário', async () => {
    const cookieA = await registerUser('Ana', 'owner@example.com')
    const cookieB = await registerUser('Bia', 'other@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Do dono' }, cookieA)
    )
    const { data } = await habit.json()

    const res = await DELETEHabit(
      jsonRequest('DELETE', `http://localhost/api/habits/${data.id}`, undefined, cookieB),
      ctx(data.id)
    )
    expect(res.status).toBe(403)
  })
})

describe('/api/habits/[id]/complete', () => {
  it('conclui, é idempotente e desconclui', async () => {
    const cookie = await registerUser('Ana', 'comp@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Beber água' }, cookie)
    )
    const { data } = await habit.json()
    const url = `http://localhost/api/habits/${data.id}/complete`

    const done = await POSTComplete(jsonRequest('POST', url, undefined, cookie), ctx(data.id))
    expect(done.status).toBe(200)
    const doneBody = await done.json()
    expect(doneBody.data.streakAtual).toBe(1)

    // Idempotente: marcar de novo não incrementa o streak.
    const again = await POSTComplete(jsonRequest('POST', url, undefined, cookie), ctx(data.id))
    await expect(again.json()).resolves.toEqual(
      expect.objectContaining({ data: expect.objectContaining({ streakAtual: 1 }) })
    )

    const undone = await DELETComplete(jsonRequest('DELETE', url, undefined, cookie), ctx(data.id))
    const undoneBody = await undone.json()
    expect(undoneBody.data.streakAtual).toBe(0)
  })

  it('retorna 404 para hábito inexistente', async () => {
    const cookie = await registerUser('Ana', 'nocomp@example.com')
    const res = await POSTComplete(
      jsonRequest('POST', 'http://localhost/api/habits/000000000000000000000000/complete', undefined, cookie),
      ctx('000000000000000000000000')
    )
    expect(res.status).toBe(404)
  })

  it('isola usuários: B não conclui o hábito de A', async () => {
    const cookieA = await registerUser('Ana', 'iso-a@example.com')
    const cookieB = await registerUser('Bia', 'iso-b@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Só da Ana' }, cookieA)
    )
    const { data } = await habit.json()

    const res = await POSTComplete(
      jsonRequest('POST', `http://localhost/api/habits/${data.id}/complete`, undefined, cookieB),
      ctx(data.id)
    )
    expect(res.status).toBe(403)
  })
})

describe('GET /api/habits/[id]/stats', () => {
  it('retorna histórico, streaks e status de hoje', async () => {
    const cookie = await registerUser('Ana', 'stats@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Meditar' }, cookie)
    )
    const { data } = await habit.json()

    await POSTComplete(
      jsonRequest('POST', `http://localhost/api/habits/${data.id}/complete`, undefined, cookie),
      ctx(data.id)
    )

    const res = await GETStats(
      jsonRequest('GET', `http://localhost/api/habits/${data.id}/stats`, undefined, cookie),
      ctx(data.id)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({
      streakAtual: 1,
      melhorStreak: 1,
      concluidoHoje: true,
    })
    expect(body.data.completions).toHaveLength(1)
  })
})

describe('fluxo de streaks ponta a ponta (Fase 7)', () => {
  it('incrementa, preserva melhor streak e zera ao pular dia', async () => {
    const cookie = await registerUser('Ana', 'e2e@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Exercício' }, cookie)
    )
    const { data } = await habit.json()
    const userId = (await GETSession(jsonRequest('GET', 'http://localhost/api/auth/session', undefined, cookie)).then((r) => r.json())).data.user.id

    // Dia 1: concluído
    await completeToday(userId, data.id, '2026-10-01')
    // Dia 2: concluído → streak 2
    await completeToday(userId, data.id, '2026-10-02')
    // Dia 3: concluído → streak 3
    let habitDoc = await completeToday(userId, data.id, '2026-10-03')
    expect(habitDoc.streakAtual).toBe(3)
    expect(habitDoc.melhorStreak).toBe(3)

    // Dia 4: pulado (avaliar em 05/10) → streak zera, melhor preservado
    habitDoc = await completeToday(userId, data.id, '2026-10-05')
    expect(habitDoc.streakAtual).toBe(1)
    expect(habitDoc.melhorStreak).toBe(3)

    // Desconcluir hoje (05/10) → sem conclusão recente, streak zera e melhor permanece
    const un = await uncompleteToday(userId, data.id, '2026-10-05')
    expect(un.streakAtual).toBe(0)
    expect(un.melhorStreak).toBe(3)

    // Stats refletem o histórico [01, 02, 03] e streak 0 (última conclusão de 03/10)
    const stats = await GETStats(
      jsonRequest('GET', `http://localhost/api/habits/${data.id}/stats`, undefined, cookie),
      ctx(data.id)
    )
    const statsBody = await stats.json()
    expect(statsBody.data.completions.sort()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(statsBody.data.streakAtual).toBe(0)
    expect(statsBody.data.melhorStreak).toBe(3)
  })

  it('impede que usuário B acesse stats do hábito de A', async () => {
    const cookieA = await registerUser('Ana', 'st-a@example.com')
    const cookieB = await registerUser('Bia', 'st-b@example.com')
    const habit = await POSTHabits(
      jsonRequest('POST', 'http://localhost/api/habits', { name: 'Segredo' }, cookieA)
    )
    const { data } = await habit.json()
    const res = await GETStats(
      jsonRequest('GET', `http://localhost/api/habits/${data.id}/stats`, undefined, cookieB),
      ctx(data.id)
    )
    expect(res.status).toBe(403)
  })
})