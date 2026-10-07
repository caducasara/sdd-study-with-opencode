import mongoose, { Schema, type Model } from 'mongoose'
import type { Habit as HabitDTO } from '@/types'

export interface HabitDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  name: string
  description: string
  streakAtual: number
  melhorStreak: number
  ultimaConclusao: Date | null
  createdAt: Date
}

const HabitSchema = new Schema<HabitDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    streakAtual: { type: Number, default: 0 },
    melhorStreak: { type: Number, default: 0 },
    ultimaConclusao: { type: Date, default: null },
  },
  { timestamps: true }
)

export function toHabit(doc: HabitDocument): HabitDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    name: doc.name,
    description: doc.description,
    streakAtual: doc.streakAtual,
    melhorStreak: doc.melhorStreak,
    ultimaConclusao: doc.ultimaConclusao ? doc.ultimaConclusao.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  }
}

export const Habit: Model<HabitDocument> =
  mongoose.models.Habit ?? mongoose.model<HabitDocument>('Habit', HabitSchema)
