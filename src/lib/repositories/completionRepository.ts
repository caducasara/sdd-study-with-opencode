import { connectDB } from '@/lib/db'
import { Completion, type CompletionDocument } from '@/lib/models/completion'

export interface CompleteInput {
  habitId: string
  userId: string
  date: string
}

/** Marca o hábito como concluído na data (idempotente: não duplica no mesmo dia). */
export async function complete(input: CompleteInput): Promise<void> {
  await connectDB()
  await Completion.findOneAndUpdate(
    { habitId: input.habitId, date: input.date },
    { $setOnInsert: { userId: input.userId, habitId: input.habitId, date: input.date } },
    { upsert: true, returnDocument: 'after' }
  )
}

/** Desfaz a conclusão do hábito na data. Retorna a quantidade removida. */
export async function uncomplete(habitId: string, date: string): Promise<number> {
  await connectDB()
  const result = await Completion.deleteOne({ habitId, date })
  return result.deletedCount ?? 0
}

/** Remove todas as conclusões de um hábito (usado ao excluir o hábito). */
export async function deleteByHabit(habitId: string): Promise<number> {
  await connectDB()
  const result = await Completion.deleteMany({ habitId })
  return result.deletedCount ?? 0
}

/** Lista as datas (YYYY-MM-DD) concluídas de um hábito, em ordem crescente. */
export async function listDatesByHabit(habitId: string): Promise<string[]> {
  await connectDB()
  const docs = await Completion.find({ habitId }).sort({ date: 1 }).lean()
  return docs.map((doc) => (doc as unknown as CompletionDocument).date)
}

/** Lista todas as conclusões do usuário agrupadas por hábito. */
export async function listDatesByUserGrouped(userId: string): Promise<Record<string, string[]>> {
  await connectDB()
  const docs = await Completion.find({ userId }).sort({ date: 1 }).lean()
  const grouped: Record<string, string[]> = {}
  for (const raw of docs) {
    const doc = raw as unknown as CompletionDocument
    const key = doc.habitId.toString()
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(doc.date)
  }
  return grouped
}

/** Verifica se o hábito está concluído em uma data específica. */
export async function isCompleted(habitId: string, date: string): Promise<boolean> {
  await connectDB()
  const doc = await Completion.findOne({ habitId, date }).lean()
  return Boolean(doc)
}
