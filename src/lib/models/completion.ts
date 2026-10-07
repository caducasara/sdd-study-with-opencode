import mongoose, { Schema, type Model } from 'mongoose'
import type { Completion as CompletionDTO } from '@/types'

export interface CompletionDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  habitId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  date: string
  createdAt: Date
}

const CompletionSchema = new Schema<CompletionDocument>(
  {
    habitId: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
)

// Evita marcação duplicada do mesmo hábito no mesmo dia.
CompletionSchema.index({ habitId: 1, date: 1 }, { unique: true })

export function toCompletion(doc: CompletionDocument): CompletionDTO {
  return {
    id: doc._id.toString(),
    habitId: doc.habitId.toString(),
    userId: doc.userId.toString(),
    date: doc.date,
    createdAt: doc.createdAt.toISOString(),
  }
}

export const Completion: Model<CompletionDocument> =
  mongoose.models.Completion ?? mongoose.model<CompletionDocument>('Completion', CompletionSchema)
