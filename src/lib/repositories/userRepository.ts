import { connectDB } from '@/lib/db'
import { User, toUser, type UserDocument } from '@/lib/models/user'
import type { User as UserDTO } from '@/types'

export interface CreateUserInput {
  name: string
  email: string
  passwordHash: string
}

export async function create(input: CreateUserInput): Promise<UserDTO> {
  await connectDB()
  const doc = await User.create(input)
  return toUser(doc)
}

export async function findByEmail(email: string): Promise<UserDTO | null> {
  await connectDB()
  const doc = await User.findOne({ email: email.toLowerCase() }).lean()
  return doc ? toUser(doc as unknown as UserDocument) : null
}

export async function findById(id: string): Promise<UserDTO | null> {
  await connectDB()
  const doc = await User.findById(id).lean()
  return doc ? toUser(doc as unknown as UserDocument) : null
}
