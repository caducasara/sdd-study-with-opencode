export interface StreakResult {
  streakAtual: number
  melhorStreak: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Converte uma Date para a chave local no formato YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Converte a chave YYYY-MM-DD em uma Date (meio-dia UTC) para cálculos. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Soma dias a uma chave de data (cálculo feito em UTC para não sofrer com fuso). */
export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  const shifted = new Date(date.getTime() + days * DAY_MS)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Diferença em dias (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / DAY_MS)
}

/** Data de hoje no fuso local, como YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  return toDateKey(now)
}

interface CalculateOptions {
  /** Melhor streak já registrado no documento do hábito. */
  melhorStreakAnterior?: number
  /** Data de referência (padrão: hoje). */
  hoje?: string
}

/**
 * Calcula a sequência atual e a melhor sequência a partir das datas concluídas.
 *
 * Regras (PRD):
 * - `streakAtual` conta dias consecutivos terminando hoje (ou ontem, se ainda
 *   não houver conclusão de hoje); zera se um dia foi pulado.
 * - `melhorStreak` só cresce: é o maior valor entre o histórico e o anterior.
 */
export function calculateStreaks(dates: string[], options: CalculateOptions = {}): StreakResult {
  const melhorAnterior = options.melhorStreakAnterior ?? 0
  const hoje = options.hoje ?? todayKey()

  const unique = Array.from(new Set(dates)).sort()

  if (unique.length === 0) {
    return { streakAtual: 0, melhorStreak: melhorAnterior }
  }

  // Percorre as datas ordenadas calculando a maior sequência e a que termina na última data.
  let longest = 1
  let currentRun = 1
  for (let i = 1; i < unique.length; i++) {
    const gap = diffDays(unique[i - 1], unique[i])
    if (gap === 1) {
      currentRun += 1
    } else {
      currentRun = 1
    }
    if (currentRun > longest) longest = currentRun
  }

  const last = unique[unique.length - 1]
  const diasDesdeUltima = diffDays(last, hoje)

  // A sequência só está viva se a última conclusão foi hoje ou ontem.
  const viva = diasDesdeUltima <= 1
  const streakAtual = viva ? currentRun : 0

  return {
    streakAtual,
    melhorStreak: Math.max(melhorAnterior, longest),
  }
}
