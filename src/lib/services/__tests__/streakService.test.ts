import {
  addDays,
  calculateStreaks,
  diffDays,
  parseDateKey,
  todayKey,
  toDateKey,
} from '@/lib/services/streakService'

describe('helpers de data', () => {
  it('toDateKey formata YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 9, 6))).toBe('2026-10-06')
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('parseDateKey converte para Date UTC', () => {
    expect(parseDateKey('2026-10-06').toISOString()).toBe('2026-10-06T00:00:00.000Z')
  })

  it('addDays soma dias', () => {
    expect(addDays('2026-10-06', 1)).toBe('2026-10-07')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('diffDays calcula a diferença entre duas datas', () => {
    expect(diffDays('2026-10-06', '2026-10-09')).toBe(3)
    expect(diffDays('2026-10-09', '2026-10-06')).toBe(-3)
    expect(diffDays('2026-10-06', '2026-10-06')).toBe(0)
  })

  it('todayKey usa a data local', () => {
    const now = new Date(2026, 0, 2, 23, 59, 59)
    expect(todayKey(now)).toBe('2026-01-02')
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('calculateStreaks', () => {
  const hoje = '2026-10-06'

  it('retorna zero quando não há conclusões', () => {
    expect(calculateStreaks([], { hoje })).toEqual({ streakAtual: 0, melhorStreak: 0 })
  })

  it('preserva o melhor streak anterior sem conclusões', () => {
    expect(calculateStreaks([], { hoje, melhorStreakAnterior: 7 })).toEqual({
      streakAtual: 0,
      melhorStreak: 7,
    })
  })

  it('primeiro dia concluído hoje inicia o streak em 1', () => {
    expect(calculateStreaks([hoje], { hoje })).toEqual({ streakAtual: 1, melhorStreak: 1 })
  })

  it('conta dias consecutivos até hoje', () => {
    const dates = [addDays(hoje, -2), addDays(hoje, -1), hoje]
    expect(calculateStreaks(dates, { hoje })).toEqual({ streakAtual: 3, melhorStreak: 3 })
  })

  it('mantém o streak vivo quando ontem foi concluído e hoje ainda não', () => {
    const dates = [addDays(hoje, -2), addDays(hoje, -1)]
    expect(calculateStreaks(dates, { hoje })).toEqual({ streakAtual: 2, melhorStreak: 2 })
  })

  it('zera o streak quando um dia foi pulado', () => {
    const dates = [addDays(hoje, -3), addDays(hoje, -2)]
    expect(calculateStreaks(dates, { hoje })).toEqual({ streakAtual: 0, melhorStreak: 2 })
  })

  it('zera o streak quando a última conclusão é antiga, preservando o melhor', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03']
    expect(calculateStreaks(dates, { hoje, melhorStreakAnterior: 10 })).toEqual({
      streakAtual: 0,
      melhorStreak: 10,
    })
  })

  it('calcula a maior sequência do histórico mesmo com quebras', () => {
    const dates = [
      '2026-10-01',
      '2026-10-02',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]
    expect(calculateStreaks(dates, { hoje: '2026-10-07' })).toEqual({
      streakAtual: 4,
      melhorStreak: 4,
    })
  })

  it('nunca diminui o melhor streak', () => {
    const dates = [hoje]
    expect(calculateStreaks(dates, { hoje, melhorStreakAnterior: 42 })).toEqual({
      streakAtual: 1,
      melhorStreak: 42,
    })
  })

  it('ignora datas duplicadas', () => {
    const dates = [addDays(hoje, -1), addDays(hoje, -1), hoje]
    expect(calculateStreaks(dates, { hoje })).toEqual({ streakAtual: 2, melhorStreak: 2 })
  })

  it('aceita datas fora de ordem', () => {
    const dates = [hoje, addDays(hoje, -2), addDays(hoje, -1)]
    expect(calculateStreaks(dates, { hoje })).toEqual({ streakAtual: 3, melhorStreak: 3 })
  })

  it('funciona na virada de mês e de ano', () => {
    const dates = ['2025-12-30', '2025-12-31', '2026-01-01']
    expect(calculateStreaks(dates, { hoje: '2026-01-01' })).toEqual({
      streakAtual: 3,
      melhorStreak: 3,
    })
  })

  it('usa a data local de hoje quando não recebe a referência', () => {
    const hojeLocal = toDateKey(new Date())
    expect(calculateStreaks([hojeLocal])).toEqual({ streakAtual: 1, melhorStreak: 1 })
  })
})
