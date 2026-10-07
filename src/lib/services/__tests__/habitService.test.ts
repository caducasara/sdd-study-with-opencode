import * as completionRepository from '@/lib/repositories/completionRepository'
import * as habitRepository from '@/lib/repositories/habitRepository'
import { ApiError } from '@/lib/errors'
import {
  completeToday,
  createHabit,
  deleteHabit,
  getStats,
  listHabits,
  uncompleteToday,
} from '@/lib/services/habitService'
import type { Habit } from '@/types'

jest.mock('@/lib/repositories/habitRepository', () => ({
  create: jest.fn(),
  listByUser: jest.fn(),
  findById: jest.fn(),
  deleteById: jest.fn(),
  updateStreaks: jest.fn(),
}))

jest.mock('@/lib/repositories/completionRepository', () => ({
  complete: jest.fn(),
  uncomplete: jest.fn(),
  deleteByHabit: jest.fn(),
  listDatesByHabit: jest.fn(),
  listDatesByUserGrouped: jest.fn(),
  isCompleted: jest.fn(),
}))

const mockedHabits = habitRepository as jest.Mocked<typeof habitRepository>
const mockedCompletions = completionRepository as jest.Mocked<typeof completionRepository>

const hoje = '2026-10-06'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    userId: 'u1',
    name: 'Beber água',
    description: '',
    streakAtual: 0,
    melhorStreak: 0,
    ultimaConclusao: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('createHabit', () => {
  it('cria um hábito com dados válidos', async () => {
    const habit = makeHabit()
    mockedHabits.create.mockResolvedValue(habit)

    const result = await createHabit('u1', { name: '  Ler  ', description: '  ' })

    expect(mockedHabits.create).toHaveBeenCalledWith({
      userId: 'u1',
      name: 'Ler',
      description: '',
    })
    expect(result).toEqual(habit)
  })

  it('rejeita nome vazio', async () => {
    await expect(createHabit('u1', { name: '   ' })).rejects.toThrow(ApiError)
    await expect(createHabit('u1', { name: '   ' })).rejects.toMatchObject({ status: 400 })
    expect(mockedHabits.create).not.toHaveBeenCalled()
  })

  it('rejeita nome muito longo', async () => {
    await expect(createHabit('u1', { name: 'x'.repeat(101) })).rejects.toMatchObject({
      status: 400,
    })
  })

it('trata description ausente', async () => {
    mockedHabits.create.mockResolvedValue(makeHabit())
    await createHabit('u1', { name: 'Ler' })
    expect(mockedHabits.create).toHaveBeenCalledWith({
      userId: 'u1',
      name: 'Ler',
      description: '',
    })
  })
})

describe('listHabits', () => {
  it('retorna hábitos com streak calculado e status de hoje', async () => {
    mockedHabits.listByUser.mockResolvedValue([
      makeHabit({ id: 'h1', melhorStreak: 5 }),
      makeHabit({ id: 'h2' }),
      makeHabit({ id: 'h3', melhorStreak: 9 }),
    ])
    mockedCompletions.listDatesByUserGrouped.mockResolvedValue({
      h1: ['2026-10-05', '2026-10-06'],
      h3: ['2026-10-01'],
    })

    const result = await listHabits('u1', hoje)

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      id: 'h1',
      streakAtual: 2,
      melhorStreak: 5,
      concluidoHoje: true,
    })
    expect(result[1]).toMatchObject({ id: 'h2', streakAtual: 0, concluidoHoje: false })
    expect(result[2]).toMatchObject({ id: 'h3', streakAtual: 0, melhorStreak: 9, concluidoHoje: false })
  })

  it('retorna lista vazia', async () => {
    mockedHabits.listByUser.mockResolvedValue([])
    mockedCompletions.listDatesByUserGrouped.mockResolvedValue({})
    expect(await listHabits('u1', hoje)).toEqual([])
  })
})

describe('deleteHabit', () => {
  it('exclui o hábito e suas conclusões', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit())
    mockedHabits.deleteById.mockResolvedValue(1)
    mockedCompletions.deleteByHabit.mockResolvedValue(3)

    await deleteHabit('u1', 'h1')

    expect(mockedHabits.deleteById).toHaveBeenCalledWith('h1')
    expect(mockedCompletions.deleteByHabit).toHaveBeenCalledWith('h1')
  })

  it('lança 404 quando o hábito não existe', async () => {
    mockedHabits.findById.mockResolvedValue(null)
    await expect(deleteHabit('u1', 'nope')).rejects.toMatchObject({ status: 404 })
  })

  it('lança 403 quando o hábito é de outro usuário', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit({ userId: 'u2' }))
    await expect(deleteHabit('u1', 'h1')).rejects.toMatchObject({ status: 403 })
    expect(mockedHabits.deleteById).not.toHaveBeenCalled()
  })
})

describe('completeToday', () => {
  it('marca como concluído e atualiza os streaks', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit())
    mockedCompletions.listDatesByHabit.mockResolvedValue(['2026-10-05', '2026-10-06'])
    mockedHabits.updateStreaks.mockResolvedValue(
      makeHabit({ streakAtual: 2, melhorStreak: 2, ultimaConclusao: '2026-10-06T00:00:00.000Z' })
    )

    const result = await completeToday('u1', 'h1', hoje)

    expect(mockedCompletions.complete).toHaveBeenCalledWith({
      habitId: 'h1',
      userId: 'u1',
      date: hoje,
    })
    expect(mockedHabits.updateStreaks).toHaveBeenCalledWith('h1', {
      streakAtual: 2,
      melhorStreak: 2,
      ultimaConclusao: new Date('2026-10-06T00:00:00.000Z'),
    })
    expect(result.streakAtual).toBe(2)
  })

  it('lança 404 para hábito inexistente', async () => {
    mockedHabits.findById.mockResolvedValue(null)
    await expect(completeToday('u1', 'nope', hoje)).rejects.toMatchObject({ status: 404 })
  })

  it('lança 403 para hábito de outro usuário', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit({ userId: 'u2' }))
    await expect(completeToday('u1', 'h1', hoje)).rejects.toMatchObject({ status: 403 })
  })
})

describe('uncompleteToday', () => {
  it('desfaz a conclusão e recalcula os streaks', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit({ streakAtual: 2, melhorStreak: 4 }))
    mockedCompletions.uncomplete.mockResolvedValue(1)
    mockedCompletions.listDatesByHabit.mockResolvedValue(['2026-10-05'])
    mockedHabits.updateStreaks.mockResolvedValue(makeHabit({ streakAtual: 1, melhorStreak: 4 }))

    const result = await uncompleteToday('u1', 'h1', hoje)

    expect(mockedCompletions.uncomplete).toHaveBeenCalledWith('h1', hoje)
    expect(result.streakAtual).toBe(1)
    expect(result.melhorStreak).toBe(4)
  })

  it('zera ultimaConclusao quando não restam conclusões', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit())
    mockedCompletions.uncomplete.mockResolvedValue(1)
    mockedCompletions.listDatesByHabit.mockResolvedValue([])
    mockedHabits.updateStreaks.mockResolvedValue(makeHabit())

    await uncompleteToday('u1', 'h1', hoje)

    expect(mockedHabits.updateStreaks).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({ ultimaConclusao: null })
    )
  })

  it('lança 404 quando o hábito não existe', async () => {
    mockedHabits.findById.mockResolvedValue(null)
    await expect(uncompleteToday('u1', 'nope', hoje)).rejects.toMatchObject({ status: 404 })
  })
})

describe('getStats', () => {
  it('retorna hábito, streaks e histórico', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit({ id: 'h1' }))
    mockedCompletions.listDatesByHabit.mockResolvedValue(['2026-10-05', '2026-10-06'])

    const stats = await getStats('u1', 'h1', hoje)

    expect(stats).toEqual({
      habit: expect.objectContaining({ id: 'h1', streakAtual: 2, melhorStreak: 2 }),
      streakAtual: 2,
      melhorStreak: 2,
      completions: ['2026-10-05', '2026-10-06'],
      concluidoHoje: true,
    })
  })

  it('lança 403 para hábito de outro usuário', async () => {
    mockedHabits.findById.mockResolvedValue(makeHabit({ userId: 'u2' }))
    await expect(getStats('u1', 'h1', hoje)).rejects.toMatchObject({ status: 403 })
  })
})
