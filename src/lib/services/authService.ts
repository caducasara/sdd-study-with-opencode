import bcrypt from 'bcryptjs'
import * as userRepository from '@/lib/repositories/userRepository'
import { badRequest, conflict, unauthorized } from '@/lib/errors'
import type { User } from '@/types'

const SALT_ROUNDS = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export async function register(input: RegisterInput): Promise<User> {
  const name = (input.name ?? '').trim()
  const email = (input.email ?? '').trim().toLowerCase()
  const password = input.password ?? ''

  if (!name) throw badRequest('Informe seu nome')
  if (!EMAIL_RE.test(email)) throw badRequest('Informe um e-mail válido')
  if (password.length < 6) throw badRequest('A senha deve ter pelo menos 6 caracteres')

  const existing = await userRepository.findByEmail(email)
  if (existing) throw conflict('E-mail já cadastrado')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  return userRepository.create({ name, email, passwordHash })
}

export async function login(input: { email: string; password: string }): Promise<User> {
  const email = (input.email ?? '').trim().toLowerCase()
  const user = await userRepository.findByEmail(email)
  if (!user) throw unauthorized('E-mail ou senha inválidos')

  const ok = await bcrypt.compare(input.password ?? '', user.passwordHash)
  if (!ok) throw unauthorized('E-mail ou senha inválidos')

  return user
}
