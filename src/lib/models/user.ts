import mongoose, { Schema, type Model } from 'mongoose'
import type { User as UserDTO } from '@/types'

export interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash: string
  createdAt: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

export function toUser(doc: UserDocument): UserDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt.toISOString(),
  }
}

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', UserSchema)
